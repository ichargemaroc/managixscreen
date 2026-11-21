import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mediaKind, mediaStorageFilename, screenStatus } from "@/lib/signage-rules";
import { Button } from "@/components/ui/button";
import { claimScreen, revokeScreen } from "@/lib/pairing.functions";
import { enqueueCommand } from "@/lib/player.functions";
import type { deviceCommand } from "@/lib/player-protocol";
import type { z } from "zod";
import { saveWall, controlWall, positionTest } from "./video-wall.functions";
import type { VideoWall, WallConfig, WallMember } from "./video-wall";
import { webpageSchema, type WebpageConfig } from './webpage';

// Données ScreenFlow lues depuis Lovable Cloud. Les pages utilisent useStore()
// et les actions ci-dessous ; la synchronisation temps réel des écrans est
// branchée dans RealtimeSync (src/components/realtime-sync.tsx).

export type Group = { id: string; name: string; location: string; screenIds: string[] };
export type Screen = {
  id: string; name: string; pairingCode: string; groupId: string | null;
  status: "online" | "offline" | "pending"; lastSeen: string | null; playlistId: string | null; location: string; deviceId: string | null; revoked: boolean;
  playerVersion: string | null; lastSyncAt: string | null; deviceInfo: unknown; playbackStatus: unknown;
};
export type DeviceCommand = { id: string; screenId: string; command: z.infer<typeof deviceCommand>; status: string; createdAt: string; deliveredAt: string | null; acknowledgedAt: string | null; expiresAt: string; error: string | null; wallId: string | null; testId: string | null; payload: unknown };
export type Media = { id: string; name: string; type: "image" | "video" | "webpage"; size: number; duration: number | null; url: string; thumbnailUrl?: string; path: string; createdAt: string; refreshMinutes?: number; fullscreen?: boolean };
export type PlaylistItem = { id: string; mediaId: string; duration: number };
export type Playlist = { id: string; name: string; description: string; items: PlaylistItem[]; createdAt: string };
export type Schedule = {
  id: string; playlistId: string; targetType: "screen" | "group"; targetId: string;
  startDate: string; endDate: string; startTime: string; endTime: string; days: number[];
};

type State = { groups: Group[]; screens: Screen[]; media: Media[]; playlists: Playlist[]; schedules: Schedule[]; commands: DeviceCommand[]; walls: VideoWall[]; wallEvents: { id: string; wall_id: string; action: string; effective_at: string; created_at: string }[] };
type Ctx = State & { loading: boolean; refresh: () => void };

const StoreCtx = createContext<Ctx | null>(null);

const EMPTY: State = { groups: [], screens: [], media: [], playlists: [], schedules: [], commands: [], walls: [], wallEvents: [] };

// Cache private links only in the session QueryClient, below their one-hour expiry.
// Transformations are encoded into signed tokens: rewriting an original URL does not resize it.
export async function loadMediaUrls(queryClient: QueryClient, rows: { path: string; type: string }[]) {
  const paths = [...new Set(rows.filter((m) => m.type !== "webpage").map((m) => m.path))].sort();
  if (!paths.length) return new Map<string, { url: string; thumbnailUrl: string }>();
  const [originals, thumbnails] = await Promise.all([
    queryClient.fetchQuery({
      queryKey: ["media-private-links", "originals", paths],
      staleTime: 50 * 60_000,
      queryFn: async () => {
        const { data, error } = await supabase.storage.from("media").createSignedUrls(paths, 60 * 60);
        if (error) throw error;
        return (data ?? []).map((item) => ({ path: item.path ?? "", url: item.signedUrl ?? "" }));
      },
    }),
    Promise.all(rows.filter((m) => m.type === "image").map(async (m) => {
      const url = await queryClient.fetchQuery({
        queryKey: ["media-private-links", "thumbnail", m.path],
        staleTime: 50 * 60_000,
        retry: false,
        queryFn: async () => {
          const { data, error } = await supabase.storage.from("media").createSignedUrl(m.path, 60 * 60, {
            transform: { width: 480, height: 270, resize: "cover", quality: 70 },
          });
          if (error) throw error;
          return data?.signedUrl ?? "";
        },
      }).catch(() => "");
      return { path: m.path, url };
    })),
  ]);
  const thumbnailByPath = new Map(thumbnails.map((m) => [m.path, m.url]));
  return new Map(originals.map((m) => [m.path, { url: m.url, thumbnailUrl: thumbnailByPath.get(m.path) || m.url }]));
}

async function fetchAll(queryClient: QueryClient): Promise<State> {
  const [groups, screens, media, playlists, items, schedules, members, sessions, telemetry, commands, walls, wallMembers, wallEvents] = await Promise.all([
    supabase.from("groups").select("*").order("created_at"),
    supabase.from("screens").select("*").order("created_at"),
    supabase.from("media").select("*").order("created_at", { ascending: false }),
    supabase.from("playlists").select("*").order("created_at"),
    supabase.from("playlist_items").select("*").order("position"),
    supabase.from("schedules").select("*").order("created_at"),
    supabase.from("screen_group_members").select("*"),
    supabase.from("pairing_sessions").select("screen_id, device_id, status"),
    supabase.from("device_telemetry").select("*"),
    supabase.from("device_commands").select("*").order("created_at", { ascending: false }).limit(200),
    supabase.from("video_walls").select("*").order("created_at"),
    supabase.from("video_wall_screens").select("*"),
    supabase.from("video_wall_events").select("id,wall_id,action,effective_at,created_at").order("created_at", { ascending: false }).limit(100),
  ]);
  for (const r of [groups, screens, media, playlists, items, schedules, members, sessions, telemetry, commands, walls, wallMembers, wallEvents]) {
    if (r.error) throw r.error;
  }
  const mediaUrls = await loadMediaUrls(queryClient, media.data ?? []);
  const mediaRows = (media.data ?? []).map((m) => ({
      id: m.id, name: m.name, type: m.type as Media['type'], size: m.size,
      duration: m.duration, path: m.path, url: m.type === 'webpage' ? m.webpage_url ?? '' : mediaUrls.get(m.path)?.url ?? '', createdAt: m.created_at,
      thumbnailUrl: mediaUrls.get(m.path)?.thumbnailUrl ?? '',
      refreshMinutes: m.refresh_minutes, fullscreen: m.webpage_fullscreen,
    }));
  const itemsByPlaylist = new Map<string, PlaylistItem[]>();
  for (const it of items.data ?? []) {
    const list = itemsByPlaylist.get(it.playlist_id) ?? [];
    list.push({ id: it.id, mediaId: it.media_id, duration: it.duration });
    itemsByPlaylist.set(it.playlist_id, list);
  }
  return {
    walls: (walls.data ?? []).map((w) => ({ ...w, orientation: w.orientation as VideoWall["orientation"], state: w.state as VideoWall["state"], members: (wallMembers.data ?? []).filter((m) => m.wall_id === w.id) })),
    wallEvents: wallEvents.data ?? [],
    groups: (groups.data ?? []).map((g) => ({ id: g.id, name: g.name, location: g.location, screenIds: (members.data ?? []).filter((m) => m.group_id === g.id).map((m) => m.screen_id) })),
    screens: (screens.data ?? []).map((s) => ({
      id: s.id, name: s.name, pairingCode: s.pairing_code, groupId: s.group_id,
      status: sessions.data?.some((p) => p.screen_id === s.id && p.status === "revoked") ? "offline" : screenStatus(s.status, s.last_seen), lastSeen: s.last_seen, playlistId: s.playlist_id, location: s.location,
      deviceId: sessions.data?.find((p) => p.screen_id === s.id)?.device_id ?? null,
      revoked: sessions.data?.some((p) => p.screen_id === s.id && p.status === "revoked") ?? false,
      playerVersion: telemetry.data?.find((t) => sessions.data?.some((p) => p.screen_id === s.id && p.device_id === t.device_id))?.player_version ?? null,
      lastSyncAt: telemetry.data?.find((t) => sessions.data?.some((p) => p.screen_id === s.id && p.device_id === t.device_id))?.last_sync_at ?? null,
      deviceInfo: telemetry.data?.find((t) => sessions.data?.some((p) => p.screen_id === s.id && p.device_id === t.device_id))?.device_info ?? {},
      playbackStatus: telemetry.data?.find((t) => sessions.data?.some((p) => p.screen_id === s.id && p.device_id === t.device_id))?.playback_status ?? {},
    })),
    commands: (commands.data ?? []).map((c) => ({ id: c.id, screenId: c.screen_id, command: c.command as DeviceCommand["command"], status: c.status, createdAt: c.created_at, deliveredAt: c.delivered_at, acknowledgedAt: c.acknowledged_at, expiresAt: c.expires_at, error: c.error_message, wallId: c.wall_id, testId: c.test_id, payload: c.payload })),
    media: mediaRows,
    playlists: (playlists.data ?? []).map((p) => ({ id: p.id, name: p.name, description: p.description, items: itemsByPlaylist.get(p.id) ?? [], createdAt: p.created_at })),
    schedules: (schedules.data ?? []).map((s) => ({
      id: s.id, playlistId: s.playlist_id, targetType: s.target_type as "screen" | "group", targetId: s.target_id,
      startDate: s.start_date, endDate: s.end_date, startTime: s.start_time.slice(0, 5), endTime: s.end_time.slice(0, 5), days: s.days,
    })),
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["screenflow"], queryFn: () => fetchAll(queryClient), refetchInterval: 60_000 });
  const value = useMemo<Ctx>(() => ({
    ...(data ?? EMPTY),
    loading: isLoading,
    refresh: () => { void queryClient.invalidateQueries({ queryKey: ["screenflow"] }); },
  }), [data, isLoading, queryClient]);
  return <StoreCtx.Provider value={value}>{error ? <div role="alert" className="p-8 text-center"><p>Les données n’ont pas pu être chargées.</p><Button className="mt-4" onClick={() => void refetch()}>Réessayer</Button></div> : isLoading ? <p role="status" className="p-8 text-center text-muted-foreground">Chargement…</p> : children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore outside StoreProvider");
  return c;
}

// ===== Actions (écritures Cloud) =====

export async function saveVideoWall(id: string | null, config: WallConfig, members: WallMember[]) { return saveWall({ data: { id, config, members } }); }
export async function controlVideoWall(id: string, action: "play" | "pause" | "stop") { await controlWall({ data: { id, action } }); }
export async function testVideoWall(id: string, action: "start" | "stop", duration = 60) { return positionTest({ data: { id, action, duration } }); }
export async function deleteVideoWall(id: string) { const { error } = await supabase.from("video_walls").delete().eq("id", id); if (error) throw error; }

async function userId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Non connecté");
  return data.user.id;
}

export async function addScreen(name: string, pairingCode: string, groupId: string | null, location = "") {
  return claimScreen({ data: { code: pairingCode, name, groupId, location } });
}

export async function revokeDeviceAccess(screenId: string) {
  await revokeScreen({ data: { screenId } });
}

export async function sendDeviceCommand(screenId: string, command: DeviceCommand["command"]) {
  return enqueueCommand({ data: { screenId, command } });
}

export async function updateScreen(id: string, patch: { name?: string; groupId?: string | null; playlistId?: string | null; location?: string }) {
  const row: { name?: string; group_id?: string | null; playlist_id?: string | null; location?: string } = {};
  if (patch.location !== undefined) row.location = patch.location;
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.groupId !== undefined) row.group_id = patch.groupId;
  if (patch.playlistId !== undefined) row.playlist_id = patch.playlistId;
  const { error } = await supabase.from("screens").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteScreen(id: string) {
  const { error } = await supabase.from("screens").delete().eq("id", id);
  if (error) throw error;
}

export async function addGroup(name: string, location: string) {
  const { error } = await supabase.from("groups").insert({ user_id: await userId(), name, location });
  if (error) throw error;
}

export async function deleteGroup(id: string) {
  const { error } = await supabase.from("groups").delete().eq("id", id);
  if (error) throw error;
}

export async function updateGroup(id: string, name: string, location: string) {
  const { error } = await supabase.from("groups").update({ name, location }).eq("id", id);
  if (error) throw error;
}

export async function setGroupMember(groupId: string, screenId: string, included: boolean) {
  const { error } = included
    ? await supabase.from("screen_group_members").upsert({ group_id: groupId, screen_id: screenId }, { onConflict: "group_id,screen_id" })
    : await supabase.from("screen_group_members").delete().eq("group_id", groupId).eq("screen_id", screenId);
  if (error) throw error;
  if (!included) {
    const { error: unlinkError } = await supabase.from("screens").update({ group_id: null }).eq("id", screenId).eq("group_id", groupId);
    if (unlinkError) throw unlinkError;
  }
}

export async function addMedia(file: File, type: "image" | "video", duration: number | null) {
  if (mediaKind(file.type) !== type) throw new Error("Format de média non pris en charge");
  const uidValue = await userId();
  const path = `${uidValue}/${mediaStorageFilename(file.name, crypto.randomUUID())}`;
  const { error: upErr } = await supabase.storage.from("media").upload(path, file);
  if (upErr) throw upErr;
  const { error } = await supabase.from("media").insert({ user_id: uidValue, name: file.name, type, size: file.size, duration, path });
  if (error) {
    await supabase.storage.from("media").remove([path]);
    throw error;
  }
}

export async function deleteMedia(m: Media) {
  if (m.type !== 'webpage') {
    const { error: storageError } = await supabase.storage.from("media").remove([m.path]);
    if (storageError) throw storageError;
  }
  const { error } = await supabase.from("media").delete().eq("id", m.id);
  if (error) throw error;
}

export async function renameMedia(id: string, name: string) {
  const { error } = await supabase.from("media").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function saveWebpage(id: string | null, input: WebpageConfig) {
  const config = webpageSchema.parse(input);
  const row = { name: config.name, webpage_url: config.url, duration: config.duration, refresh_minutes: config.refreshMinutes, webpage_fullscreen: config.fullscreen };
  if (id) {
    const { error } = await supabase.from('media').update(row).eq('id', id).eq('type', 'webpage');
    if (error) throw error;
  } else {
    const owner = await userId();
    const { error } = await supabase.from('media').insert({ ...row, user_id: owner, type: 'webpage', size: 0, path: `${owner}/${crypto.randomUUID()}.webpage` });
    if (error) throw error;
  }
}

export async function createPlaylist(name: string) {
  const { data, error } = await supabase.from("playlists").insert({ user_id: await userId(), name }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function renamePlaylist(id: string, name: string, description?: string) {
  const { error } = await supabase.from("playlists").update({ name, ...(description === undefined ? {} : { description }) }).eq("id", id);
  if (error) throw error;
}

export async function deletePlaylist(id: string) {
  const { error } = await supabase.from("playlists").delete().eq("id", id);
  if (error) throw error;
}

// Remplace tout le contenu d'une playlist (ordre + durées) en une opération.
export async function savePlaylistItems(playlistId: string, items: { mediaId: string; duration: number }[]) {
  const { error } = await supabase.rpc("replace_playlist_items", { p_playlist_id: playlistId, p_items: items });
  if (error) throw error;
}

export async function assignPlaylist(playlistId: string, targetType: "screen" | "group", targetId: string) {
  let ids = [targetId];
  if (targetType === "group") {
    const { data, error } = await supabase.from("screen_group_members").select("screen_id").eq("group_id", targetId);
    if (error) throw error;
    ids = (data ?? []).map((m) => m.screen_id);
    if (!ids.length) throw new Error("Ce groupe ne contient aucun écran");
  }
  const { error } = await supabase.from("screens").update({ playlist_id: playlistId }).in("id", ids);
  if (error) throw error;
}

export async function addSchedule(s: Omit<Schedule, "id">, id?: string) {
  const row = {
    user_id: await userId(), playlist_id: s.playlistId, target_type: s.targetType, target_id: s.targetId,
    start_date: s.startDate, end_date: s.endDate, start_time: s.startTime, end_time: s.endTime, days: s.days,
    start_datetime: new Date(`${s.startDate}T${s.startTime}`).toISOString(),
    end_datetime: new Date(`${s.endDate}T${s.endTime}`).toISOString(),
  };
  const { error } = id ? await supabase.from("schedules").update(row).eq("id", id) : await supabase.from("schedules").insert(row);
  if (error) throw error;
}

export async function deleteSchedule(id: string) {
  const { error } = await supabase.from("schedules").delete().eq("id", id);
  if (error) throw error;
}

// ===== Utilitaires =====

export const isValidPairingCode = (code: string) => /^\d{6}$/.test(code);

export function formatBytes(n: number) {
  if (n < 1024) return `${n} o`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} Ko`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} Mo`;
  return `${(n / 1024 ** 3).toFixed(2)} Go`;
}
export function formatDuration(s: number | null) {
  if (s == null) return "—";
  const m = Math.floor(s / 60), r = Math.round(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
}
