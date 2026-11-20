import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Données ScreenFlow lues depuis Lovable Cloud. Les pages utilisent useStore()
// et les actions ci-dessous ; la synchronisation temps réel des écrans est
// branchée dans RealtimeSync (src/components/realtime-sync.tsx).

export type Group = { id: string; name: string; location: string };
export type Screen = {
  id: string; name: string; pairingCode: string; groupId: string | null;
  status: "online" | "offline" | "pending"; lastSeen: string | null; playlistId: string | null;
};
export type Media = { id: string; name: string; type: "image" | "video"; size: number; duration: number | null; url: string; path: string; createdAt: string };
export type PlaylistItem = { id: string; mediaId: string; duration: number };
export type Playlist = { id: string; name: string; items: PlaylistItem[]; createdAt: string };
export type Schedule = {
  id: string; playlistId: string; targetType: "screen" | "group"; targetId: string;
  startDate: string; endDate: string; startTime: string; endTime: string; days: number[];
};

type State = { groups: Group[]; screens: Screen[]; media: Media[]; playlists: Playlist[]; schedules: Schedule[] };
type Ctx = State & { loading: boolean; refresh: () => void };

const StoreCtx = createContext<Ctx | null>(null);

const EMPTY: State = { groups: [], screens: [], media: [], playlists: [], schedules: [] };

async function signedUrl(path: string) {
  const { data } = await supabase.storage.from("media").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? "";
}

async function fetchAll(): Promise<State> {
  const [groups, screens, media, playlists, items, schedules] = await Promise.all([
    supabase.from("groups").select("*").order("created_at"),
    supabase.from("screens").select("*").order("created_at"),
    supabase.from("media").select("*").order("created_at", { ascending: false }),
    supabase.from("playlists").select("*").order("created_at"),
    supabase.from("playlist_items").select("*").order("position"),
    supabase.from("schedules").select("*").order("created_at"),
  ]);
  for (const r of [groups, screens, media, playlists, items, schedules]) {
    if (r.error) throw r.error;
  }
  const mediaRows = await Promise.all(
    (media.data ?? []).map(async (m) => ({
      id: m.id, name: m.name, type: m.type as "image" | "video", size: m.size,
      duration: m.duration, path: m.path, url: await signedUrl(m.path), createdAt: m.created_at,
    })),
  );
  const itemsByPlaylist = new Map<string, PlaylistItem[]>();
  for (const it of items.data ?? []) {
    const list = itemsByPlaylist.get(it.playlist_id) ?? [];
    list.push({ id: it.id, mediaId: it.media_id, duration: it.duration });
    itemsByPlaylist.set(it.playlist_id, list);
  }
  return {
    groups: (groups.data ?? []).map((g) => ({ id: g.id, name: g.name, location: g.location })),
    screens: (screens.data ?? []).map((s) => ({
      id: s.id, name: s.name, pairingCode: s.pairing_code, groupId: s.group_id,
      status: s.status as Screen["status"], lastSeen: s.last_seen, playlistId: s.playlist_id,
    })),
    media: mediaRows,
    playlists: (playlists.data ?? []).map((p) => ({ id: p.id, name: p.name, items: itemsByPlaylist.get(p.id) ?? [], createdAt: p.created_at })),
    schedules: (schedules.data ?? []).map((s) => ({
      id: s.id, playlistId: s.playlist_id, targetType: s.target_type as "screen" | "group", targetId: s.target_id,
      startDate: s.start_date, endDate: s.end_date, startTime: s.start_time.slice(0, 5), endTime: s.end_time.slice(0, 5), days: s.days,
    })),
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["screenflow"], queryFn: fetchAll });
  const value = useMemo<Ctx>(() => ({
    ...(data ?? EMPTY),
    loading: isLoading,
    refresh: () => { void queryClient.invalidateQueries({ queryKey: ["screenflow"] }); },
  }), [data, isLoading, queryClient]);
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore outside StoreProvider");
  return c;
}

// ===== Actions (écritures Cloud) =====

async function userId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Non connecté");
  return data.user.id;
}

export async function addScreen(name: string, pairingCode: string, groupId: string | null) {
  const { error } = await supabase.from("screens").insert({ user_id: await userId(), name, pairing_code: pairingCode, group_id: groupId, status: "pending" });
  if (error) throw error;
}

export async function updateScreen(id: string, patch: { name?: string; groupId?: string | null; playlistId?: string | null }) {
  const row: { name?: string; group_id?: string | null; playlist_id?: string | null } = {};
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

export async function addMedia(file: File, type: "image" | "video", duration: number | null) {
  const uidValue = await userId();
  const path = `${uidValue}/${crypto.randomUUID()}-${file.name}`;
  const { error: upErr } = await supabase.storage.from("media").upload(path, file);
  if (upErr) throw upErr;
  const { error } = await supabase.from("media").insert({ user_id: uidValue, name: file.name, type, size: file.size, duration, path });
  if (error) throw error;
}

export async function deleteMedia(m: Media) {
  await supabase.storage.from("media").remove([m.path]);
  const { error } = await supabase.from("media").delete().eq("id", m.id);
  if (error) throw error;
}

export async function createPlaylist(name: string) {
  const { data, error } = await supabase.from("playlists").insert({ user_id: await userId(), name }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function renamePlaylist(id: string, name: string) {
  const { error } = await supabase.from("playlists").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function deletePlaylist(id: string) {
  await supabase.from("screens").update({ playlist_id: null }).eq("playlist_id", id);
  const { error } = await supabase.from("playlists").delete().eq("id", id);
  if (error) throw error;
}

// Remplace tout le contenu d'une playlist (ordre + durées) en une opération.
export async function savePlaylistItems(playlistId: string, items: { mediaId: string; duration: number }[]) {
  const { error: delErr } = await supabase.from("playlist_items").delete().eq("playlist_id", playlistId);
  if (delErr) throw delErr;
  if (items.length) {
    const { error } = await supabase.from("playlist_items").insert(
      items.map((it, i) => ({ playlist_id: playlistId, media_id: it.mediaId, duration: it.duration, position: i })),
    );
    if (error) throw error;
  }
}

export async function assignPlaylist(playlistId: string, targetType: "screen" | "group", targetId: string) {
  const q = supabase.from("screens").update({ playlist_id: playlistId });
  const { error } = targetType === "screen" ? await q.eq("id", targetId) : await q.eq("group_id", targetId);
  if (error) throw error;
}

export async function addSchedule(s: Omit<Schedule, "id">) {
  const { error } = await supabase.from("schedules").insert({
    user_id: await userId(), playlist_id: s.playlistId, target_type: s.targetType, target_id: s.targetId,
    start_date: s.startDate, end_date: s.endDate, start_time: s.startTime, end_time: s.endTime, days: s.days,
  });
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
