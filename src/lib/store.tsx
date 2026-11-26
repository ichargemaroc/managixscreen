import { createContext, useContext, useMemo, type ReactNode } from "react";
import { queryOptions, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useRouterState } from '@tanstack/react-router';
import { supabase } from "@/integrations/supabase/client";
import { mediaKind, mediaMimeType, mediaStorageFilename, screenStatus } from "@/lib/signage-rules";
import { claimScreen, revokeScreen } from "@/lib/pairing.functions";
import { enqueueCommand } from "@/lib/player.functions";
import type { deviceCommand } from "@/lib/player-protocol";
import type { z } from "zod";
import { saveWall, controlWall, positionTest } from "./video-wall.functions";
import type { VideoWall, WallConfig, WallMember } from "./video-wall";
import { webpageSchema, type WebpageConfig } from './webpage';
import { getBillingAccount, getBillingAdmin, getBillingClient, saveBillingPlan, saveBillingSettings, changeBillingAccess, changeScreenEntitlement, saveTrialSettings, grantBillingAccess, scheduleDowngrade } from './billing.functions';
import type { planInputSchema, settingsInputSchema, trialSettingsInputSchema, grantInputSchema } from './billing';
import { readLayouts, writeLayout, linkLayout } from './multi-zone.functions';
import type { layoutInput } from './multi-zone';
import { readTeam,inviteTeam,acceptTeam,revokeTeam,proposeContent,reviewContent } from './team.functions';
import type { draftInputSchema } from './team';
import { displayRotationSchema, type DisplayRotation } from './display-rotation';
import { slideTransitionSchema, type SlideTransition } from './slide-transition';
import { parseTicker, tickerSchema, type Ticker } from './ticker';
import { musicSettingsSchema, validateMusicFile, type MusicSettings } from './background-music';

// Données ScreenFlow lues depuis Lovable Cloud. Les pages utilisent useStore()
// et les actions ci-dessous ; la synchronisation temps réel des écrans est
// branchée dans RealtimeSync (src/components/realtime-sync.tsx).

export type Group = { id: string; name: string; location: string; screenIds: string[]; playlistId: string | null };
export type Screen = {
  id: string; name: string; pairingCode: string; groupId: string | null;
  status: "online" | "offline" | "pending"; lastSeen: string | null; playlistId: string | null; location: string; deviceId: string | null; revoked: boolean;
  playerVersion: string | null; lastSyncAt: string | null; deviceInfo: unknown; playbackStatus: unknown; enabled?: boolean;
  displayRotation?: DisplayRotation; soundEnabled?: boolean;
};
export type DeviceCommand = { id: string; screenId: string; command: z.infer<typeof deviceCommand>; status: string; createdAt: string; deliveredAt: string | null; acknowledgedAt: string | null; expiresAt: string; error: string | null; wallId: string | null; testId: string | null; payload: unknown };
export type Media = { id: string; name: string; type: "image" | "video" | "webpage"; size: number; duration: number | null; url: string; thumbnailUrl?: string; path: string; createdAt: string; refreshMinutes?: number; fullscreen?: boolean };
export type PlaylistItem = { id: string; mediaId: string; duration: number };
export type Playlist = { id: string; name: string; description: string; items: PlaylistItem[]; createdAt: string; slideTransition?: SlideTransition; ticker?: Ticker };
export type Schedule = {
  id: string; playlistId: string; targetType: "screen" | "group"; targetId: string;
  startDate: string; endDate: string; startTime: string; endTime: string; days: number[];
};

type State = { groups: Group[]; screens: Screen[]; media: Media[]; playlists: Playlist[]; schedules: Schedule[]; commands: DeviceCommand[]; walls: VideoWall[]; wallEvents: { id: string; wall_id: string; action: string; effective_at: string; created_at: string }[] };
type Ctx = State & { loading: boolean; loadError: boolean; retry: () => void; refresh: () => void };

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

// Resolve only the opened preview; the dashboard never signs the whole library.
export const mediaPreviewOptions = (media: Media) => queryOptions({
  queryKey: ['media-preview-link', media.id, media.path, media.url],
  staleTime: 50 * 60_000,
  retry: false,
  queryFn: async () => {
    if (media.url) return media.url;
    if (media.type === 'webpage') throw new Error('Aperçu indisponible.');
    const { data, error } = await supabase.storage.from('media').createSignedUrl(media.path, 3600);
    if (error || !data?.signedUrl) throw new Error('Aperçu indisponible.');
    return data.signedUrl;
  },
});

export type StoreScope = 'dashboard' | 'metadata' | 'media';

export function storeScope(pathname: string): StoreScope {
  if (pathname === '/') return 'dashboard';
  if (['/media', '/playlists', '/video-walls', '/multi-zones', '/team', '/monitoring'].includes(pathname)) return 'media';
  return 'metadata';
}

export async function fetchAll(queryClient: QueryClient, scope: StoreScope = 'media'): Promise<State> {
  const full = scope !== 'dashboard';
  const empty = { data: [], error: null };
  const [groups, screens, media, playlists, items, schedules, members, sessions, telemetry, commands, walls, wallMembers, wallEvents, entitlements] = await Promise.all([
    full ? supabase.from("groups").select("*").order("created_at") : empty,
    supabase.from("screens").select("*").order("created_at"),
    supabase.from("media").select("*").order("created_at", { ascending: false }),
    supabase.from("playlists").select("*").order("created_at"),
    full ? supabase.from("playlist_items").select("*").order("position") : empty,
    full ? supabase.from("schedules").select("*").order("created_at") : empty,
    full ? supabase.from("screen_group_members").select("*") : empty,
    supabase.from("pairing_sessions").select("screen_id, device_id, status"),
    supabase.from("device_telemetry").select("device_id,player_version,last_sync_at,device_info,playback_status"),
    full ? supabase.from("device_commands").select("*").order("created_at", { ascending: false }).limit(200) : empty,
    full ? supabase.from("video_walls").select("*").order("created_at") : empty,
    full ? supabase.from("video_wall_screens").select("*") : empty,
    full ? supabase.from("video_wall_events").select("id,wall_id,action,effective_at,created_at").order("created_at", { ascending: false }).limit(100) : empty,
    full ? supabase.from('screen_entitlements').select('screen_id,active') : empty,
  ]);
  for (const r of [groups, screens, media, playlists, items, schedules, members, sessions, telemetry, commands, walls, wallMembers, wallEvents, entitlements]) {
    if (r.error) throw r.error;
  }
  const mediaUrls = scope === 'media' ? await loadMediaUrls(queryClient, media.data ?? []) : new Map<string, { url: string; thumbnailUrl: string }>();
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
    groups: (groups.data ?? []).map((g) => ({ id: g.id, name: g.name, location: g.location, playlistId: g.playlist_id ?? null, screenIds: (members.data ?? []).filter((m) => m.group_id === g.id).map((m) => m.screen_id) })),
    screens: (screens.data ?? []).map((s) => ({
      id: s.id, name: s.name, pairingCode: s.pairing_code, groupId: s.group_id,
      displayRotation: displayRotationSchema.parse(s.display_rotation ?? 0), soundEnabled: s.sound_enabled ?? true,
      status: sessions.data?.some((p) => p.screen_id === s.id && p.status === "revoked") ? "offline" : screenStatus(s.status, s.last_seen), lastSeen: s.last_seen, playlistId: s.playlist_id, location: s.location,
      deviceId: sessions.data?.find((p) => p.screen_id === s.id)?.device_id ?? null,
      revoked: sessions.data?.some((p) => p.screen_id === s.id && p.status === "revoked") ?? false,
      enabled: entitlements.data?.find((e) => e.screen_id === s.id)?.active ?? true,
      playerVersion: telemetry.data?.find((t) => sessions.data?.some((p) => p.screen_id === s.id && p.device_id === t.device_id))?.player_version ?? null,
      lastSyncAt: telemetry.data?.find((t) => sessions.data?.some((p) => p.screen_id === s.id && p.device_id === t.device_id))?.last_sync_at ?? null,
      deviceInfo: telemetry.data?.find((t) => sessions.data?.some((p) => p.screen_id === s.id && p.device_id === t.device_id))?.device_info ?? {},
      playbackStatus: telemetry.data?.find((t) => sessions.data?.some((p) => p.screen_id === s.id && p.device_id === t.device_id))?.playback_status ?? {},
    })),
    commands: (commands.data ?? []).map((c) => ({ id: c.id, screenId: c.screen_id, command: c.command as DeviceCommand["command"], status: c.status, createdAt: c.created_at, deliveredAt: c.delivered_at, acknowledgedAt: c.acknowledged_at, expiresAt: c.expires_at, error: c.error_message, wallId: c.wall_id, testId: c.test_id, payload: c.payload })),
    media: mediaRows,
    playlists: (playlists.data ?? []).map((p) => ({ id: p.id, name: p.name, description: p.description, items: itemsByPlaylist.get(p.id) ?? [], createdAt: p.created_at, slideTransition: slideTransitionSchema.catch('default').parse(p.slide_transition), ticker: parseTicker(p.ticker) })),
    schedules: (schedules.data ?? []).map((s) => ({
      id: s.id, playlistId: s.playlist_id, targetType: s.target_type as "screen" | "group", targetId: s.target_id,
      startDate: s.start_date, endDate: s.end_date, startTime: s.start_time.slice(0, 5), endTime: s.end_time.slice(0, 5), days: s.days,
    })),
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const scope = useRouterState({ select: (state) => storeScope(state.location.pathname) });
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["screenflow", scope], queryFn: () => fetchAll(queryClient, scope), staleTime: 30_000, refetchInterval: 60_000 });
  const value = useMemo<Ctx>(() => ({
    ...(data ?? EMPTY),
    loading: isLoading,
    loadError: Boolean(error),
    retry: () => { void refetch(); },
    refresh: () => { void queryClient.invalidateQueries({ queryKey: ["screenflow"] }); },
  }), [data, isLoading, error, refetch, queryClient]);
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
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

export const billingQueryOptions = queryOptions({ queryKey: ['billing-account'], queryFn: () => getBillingAccount(), staleTime: 15_000 });
export const billingAdminOptions = (page: number) => queryOptions({ queryKey: ['billing-admin', page], queryFn: () => getBillingAdmin({ data: { page } }), staleTime: 15_000 });
export const billingClientOptions = (userId: string) => queryOptions({ queryKey: ['billing-client', userId], queryFn: () => getBillingClient({ data: { userId } }), staleTime: 15_000 });
export function useBillingStore() { return useQuery(billingQueryOptions); }
export function usePlatformAdmin() { return useQuery({ queryKey: ['platform-admin'], staleTime: 60_000, queryFn: async () => { const { data, error } = await supabase.from('user_roles').select('role'); if (error) throw error; return data?.some((r) => r.role === 'admin') ?? false; } }); }
export const savePlan = (data: z.infer<typeof planInputSchema>) => saveBillingPlan({ data });
export const saveBillingConfig = (data: z.infer<typeof settingsInputSchema>) => saveBillingSettings({ data });
export const setClientAccess = (userId: string, action: 'suspend' | 'reactivate' | 'trial_plan', planId: string | null = null) => changeBillingAccess({ data: { userId, action, planId } });
export const saveTrialConfig = (data: z.infer<typeof trialSettingsInputSchema>) => saveTrialSettings({ data });
export const grantClientAccess = (data: z.infer<typeof grantInputSchema>) => grantBillingAccess({ data });
export const planDowngrade = (planId: string | null, keep: string[] = []) => scheduleDowngrade({ data: { planId, keep } });
export const setScreenEnabled = (screenId: string, active: boolean) => changeScreenEntitlement({ data: { screenId, active } });
export const layoutsOptions = queryOptions({ queryKey: ['screen-layouts'], queryFn: () => readLayouts(), staleTime: 15_000 });
export const saveComposition = (data: z.infer<typeof layoutInput>) => writeLayout({ data });
export const assignComposition = (screenId: string, layoutId: string | null) => linkLayout({ data: { screenId, layoutId } });
export const teamOptions = queryOptions({queryKey:['content-team'],queryFn:()=>readTeam(),staleTime:15_000});
export const inviteCollaborator = (email:string)=>inviteTeam({data:{email}});
export const acceptCollaboration = (id:string,token:string)=>acceptTeam({data:{id,token}});
export const revokeCollaborator = (memberId:string|null,inviteId:string|null)=>revokeTeam({data:{memberId,inviteId}});
export const submitContentProposal = (data:z.infer<typeof draftInputSchema>)=>proposeContent({data});
export const reviewContentProposal = (id:string,approve:boolean)=>reviewContent({data:{id,approve}});

export async function revokeDeviceAccess(screenId: string) {
  await revokeScreen({ data: { screenId } });
}

export async function sendDeviceCommand(screenId: string, command: DeviceCommand["command"]) {
  return enqueueCommand({ data: { screenId, command } });
}

export async function updateScreen(id: string, patch: { name?: string; groupId?: string | null; playlistId?: string | null; location?: string; displayRotation?: DisplayRotation; pairingCode?: string; soundEnabled?: boolean }) {
  const row: { name?: string; group_id?: string | null; playlist_id?: string | null; location?: string; display_rotation?: DisplayRotation; sound_enabled?: boolean } = {};
  if (patch.soundEnabled !== undefined) row.sound_enabled = patch.soundEnabled;
  if (patch.displayRotation !== undefined) row.display_rotation = displayRotationSchema.parse(patch.displayRotation);
  if (patch.location !== undefined) row.location = patch.location;
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.groupId !== undefined) row.group_id = patch.groupId;
  if (patch.playlistId !== undefined) row.playlist_id = patch.playlistId;
  if (patch.pairingCode !== undefined) {
    if (!/^\d{6}$/.test(patch.pairingCode)) throw new Error("Le code d’appairage doit contenir 6 chiffres.");
    const { error: codeError } = await supabase.rpc("set_screen_pairing_code", { p_screen: id, p_code: patch.pairingCode });
    if (codeError) throw new Error(codeError.message.includes("DUPLICATE_CODE") ? "Ce code est déjà utilisé par un autre de vos écrans." : "Le code d’appairage n’a pas pu être enregistré.");
  }
  const { error } = Object.keys(row).length ? await supabase.from("screens").update(row).eq("id", id) : { error: null };
  if (error) throw error;
  // Wake the TV within ~5 s instead of waiting for its next periodic check; best effort.
  if (patch.playlistId !== undefined || patch.groupId !== undefined || patch.displayRotation !== undefined || patch.soundEnabled !== undefined) void enqueueCommand({ data: { screenId: id, command: "refresh_content" } }).catch(() => {});
}

export async function deleteScreen(id: string) {
  const { data: music } = await supabase.from('screen_music').select('path').eq('screen_id', id).maybeSingle();
  const { error } = await supabase.from("screens").delete().eq("id", id);
  if (error) throw error;
  if (music) await supabase.storage.from('media').remove([music.path]);
}

export const screenMusicOptions = (screenId: string) => queryOptions({
  queryKey: ['screen-music', screenId], staleTime: 30_000,
  queryFn: async () => {
    const { data, error } = await supabase.from('screen_music').select('*').eq('screen_id', screenId).maybeSingle();
    if (error) throw new Error('Musique indisponible. Réessayez.');
    if (!data) return null;
    const signed = await supabase.storage.from('media').createSignedUrl(data.path, 3600);
    return { ...data, previewUrl: signed.data?.signedUrl ?? '' };
  },
});

export async function saveScreenMusic(screenId: string, settings: MusicSettings, file?: File) {
  const config = musicSettingsSchema.parse(settings);
  const previous = await supabase.from('screen_music').select('path').eq('screen_id', screenId).maybeSingle();
  if (previous.error) throw new Error('La musique n’a pas pu être enregistrée.');
  if (file) {
    await validateMusicFile(file);
    const owner = await userId(); const trackId = crypto.randomUUID(); const path = `${owner}/${trackId}.mp3`;
    const uploaded = await supabase.storage.from('media').upload(path, file, { contentType: 'audio/mpeg' });
    if (uploaded.error) throw new Error('L’import de la musique a échoué.');
    const saved = await supabase.from('screen_music').upsert({ ...config, screen_id: screenId, user_id: owner, track_id: trackId, name: file.name.slice(0, 255), path, size: file.size }).select('screen_id').single();
    if (saved.error) { await supabase.storage.from('media').remove([path]); throw new Error('La musique n’a pas pu être enregistrée.'); }
    if (previous.data && previous.data.path !== path) await supabase.storage.from('media').remove([previous.data.path]);
  } else {
    const saved = await supabase.from('screen_music').update(config).eq('screen_id', screenId).select('screen_id').single();
    if (saved.error) throw new Error('La musique n’a pas pu être enregistrée.');
  }
  void enqueueCommand({ data: { screenId, command: 'refresh_content' } }).catch(() => {});
}

export async function removeScreenMusic(screenId: string) {
  const removed = await supabase.from('screen_music').delete().eq('screen_id', screenId).select('path').single();
  if (removed.error) throw new Error('La musique n’a pas pu être retirée.');
  await supabase.storage.from('media').remove([removed.data.path]);
  void enqueueCommand({ data: { screenId, command: 'refresh_content' } }).catch(() => {});
}

async function refreshPlaylistScreens(playlistId: string) {
  const { data: screens } = await supabase.from("screens").select("id").eq("playlist_id", playlistId);
  for (const screen of screens ?? []) void enqueueCommand({ data: { screenId: screen.id, command: "refresh_content" } }).catch(() => {});
}

export const playlistMusicOptions = (playlistId: string) => queryOptions({
  queryKey: ['playlist-music', playlistId], staleTime: 30_000,
  queryFn: async () => {
    const { data, error } = await supabase.from('playlist_music').select('*').eq('playlist_id', playlistId).maybeSingle();
    if (error) throw new Error('Musique indisponible. Réessayez.');
    if (!data) return null;
    const signed = await supabase.storage.from('media').createSignedUrl(data.path, 3600);
    return { ...data, previewUrl: signed.data?.signedUrl ?? '' };
  },
});

export async function savePlaylistMusic(playlistId: string, settings: MusicSettings, file?: File) {
  const config = musicSettingsSchema.parse(settings);
  const previous = await supabase.from('playlist_music').select('path').eq('playlist_id', playlistId).maybeSingle();
  if (previous.error) throw new Error('La musique n’a pas pu être enregistrée.');
  if (file) {
    await validateMusicFile(file);
    const owner = await userId(); const trackId = crypto.randomUUID(); const path = `${owner}/${trackId}.mp3`;
    const uploaded = await supabase.storage.from('media').upload(path, file, { contentType: 'audio/mpeg' });
    if (uploaded.error) throw new Error('L’import de la musique a échoué.');
    const saved = await supabase.from('playlist_music').upsert({ ...config, playlist_id: playlistId, user_id: owner, track_id: trackId, name: file.name.slice(0, 255), path, size: file.size }).select('playlist_id').single();
    if (saved.error) { await supabase.storage.from('media').remove([path]); throw new Error('La musique n’a pas pu être enregistrée.'); }
    if (previous.data && previous.data.path !== path) await supabase.storage.from('media').remove([previous.data.path]);
  } else {
    const saved = await supabase.from('playlist_music').update(config).eq('playlist_id', playlistId).select('playlist_id').single();
    if (saved.error) throw new Error('La musique n’a pas pu être enregistrée.');
  }
  await refreshPlaylistScreens(playlistId);
}

export async function removePlaylistMusic(playlistId: string) {
  const removed = await supabase.from('playlist_music').delete().eq('playlist_id', playlistId).select('path').single();
  if (removed.error) throw new Error('La musique n’a pas pu être retirée.');
  await supabase.storage.from('media').remove([removed.data.path]);
  await refreshPlaylistScreens(playlistId);
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
  if (included) void enqueueCommand({ data: { screenId, command: "refresh_content" } }).catch(() => {});
  if (!included) {
    const { error: unlinkError } = await supabase.from("screens").update({ group_id: null }).eq("id", screenId).eq("group_id", groupId);
    if (unlinkError) throw unlinkError;
  }
}

export async function addMedia(file: File, type: "image" | "video", duration: number | null) {
  if (mediaKind(file.type, file.name) !== type) throw new Error("Format de média non pris en charge");
  const uidValue = await userId();
  const path = `${uidValue}/${mediaStorageFilename(file.name, crypto.randomUUID())}`;
  const { error: upErr } = await supabase.storage.from("media").upload(path, file, {
    contentType: mediaMimeType(file.type, file.name),
  });
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

export async function savePlaylistTransition(id: string, transition: SlideTransition) {
  const slide_transition = slideTransitionSchema.parse(transition);
  const { error } = await supabase.from('playlists').update({ slide_transition }).eq('id', id).select('id').single();
  if (error) throw new Error('L’animation n’a pas pu être enregistrée.');
  await refreshPlaylistScreens(id);
}

export async function savePlaylistTicker(id: string, value: Ticker) {
  const ticker = tickerSchema.parse(value);
  const { error } = await supabase.from('playlists').update({ ticker }).eq('id', id).select('id').single();
  if (error) throw new Error('Le bandeau n’a pas pu être enregistré.');
  await refreshPlaylistScreens(id);
}

export async function deletePlaylist(id: string) {
  const { error } = await supabase.from("playlists").delete().eq("id", id);
  if (error) throw error;
}

// Remplace tout le contenu d'une playlist (ordre + durées) en une opération.
export async function savePlaylistItems(playlistId: string, items: { mediaId: string; duration: number }[]) {
  const seen = new Set<string>();
  items = items.filter((it) => !seen.has(it.mediaId) && seen.add(it.mediaId));
  const { error } = await supabase.rpc("replace_playlist_items", { p_playlist_id: playlistId, p_items: items });
  if (error) throw error;
  // Notify TVs showing this playlist so they update within seconds; best effort.
  const { data: screens } = await supabase.from("screens").select("id").eq("playlist_id", playlistId);
  for (const screen of screens ?? []) void enqueueCommand({ data: { screenId: screen.id, command: "refresh_content" } }).catch(() => {});
}

export async function assignPlaylist(playlistId: string, targetType: "screen" | "group", targetId: string) {
  let ids = [targetId];
  if (targetType === "group") {
    const { data, error } = await supabase.from("screen_group_members").select("screen_id").eq("group_id", targetId);
    if (error) throw error;
    ids = (data ?? []).map((m) => m.screen_id);
    const { error: groupError } = await supabase.from("groups").update({ playlist_id: playlistId }).eq("id", targetId);
    if (groupError) throw groupError;
    if (!ids.length) return;
  }
  const { error } = await supabase.from("screens").update({ playlist_id: playlistId }).in("id", ids);
  if (error) throw error;
  for (const id of ids) void enqueueCommand({ data: { screenId: id, command: "refresh_content" } }).catch(() => {});
}

export async function assignPlaylistMany(playlistId: string, groupIds: string[], screenIds: string[]) {
  const ids = new Set(screenIds);
  if (groupIds.length) {
    const { data, error } = await supabase.from("screen_group_members").select("screen_id").in("group_id", groupIds);
    if (error) throw error;
    for (const m of data ?? []) ids.add(m.screen_id);
    const { error: groupError } = await supabase.from("groups").update({ playlist_id: playlistId }).in("id", groupIds);
    if (groupError) throw groupError;
  }
  if (!ids.size) return 0;
  const { error } = await supabase.from("screens").update({ playlist_id: playlistId }).in("id", [...ids]);
  if (error) throw error;
  for (const id of ids) void enqueueCommand({ data: { screenId: id, command: "refresh_content" } }).catch(() => {});
  return ids.size;
}

export async function replacePlaylistAssignments(playlistId: string, groupIds: string[], screenIds: string[]) {
  const { data, error } = await supabase.rpc('replace_playlist_assignments', {
    p_playlist: playlistId, p_groups: [...new Set(groupIds)], p_screens: [...new Set(screenIds)],
  });
  if (error) throw new Error('L’affectation n’a pas pu être enregistrée.');
  const result = readAssignmentResult(data);
  for (const screenId of result.screenIds) void enqueueCommand({ data: { screenId, command: 'refresh_content' } }).catch(() => {});
  return result.count;
}

function readAssignmentResult(data: unknown): { count: number; screenIds: string[] } {
  if (!data || typeof data !== 'object' || !('count' in data) || typeof data.count !== 'number' || !('screen_ids' in data) || !Array.isArray(data.screen_ids) || !data.screen_ids.every(id => typeof id === 'string')) throw new Error('L’affectation n’a pas pu être confirmée.');
  return { count: data.count, screenIds: data.screen_ids as string[] };
}

export async function addSchedule(s: Omit<Schedule, "id">, id?: string) {
  const row = {
    user_id: await userId(), playlist_id: s.playlistId, target_type: s.targetType, target_id: s.targetId,
    start_date: s.startDate, end_date: s.endDate, start_time: s.startTime, end_time: s.endTime, days: s.days,
    start_datetime: new Date(`${s.startDate}T${s.startTime}`).toISOString(),
    end_datetime: new Date(`${s.endDate}T${s.endTime}`).toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Casablanca",
  };
  const { error } = id ? await supabase.from("schedules").update(row).eq("id", id) : await supabase.from("schedules").insert(row);
  if (error) throw error;
  await refreshScheduleTargets(s.targetType, s.targetId);
}

async function refreshScheduleTargets(targetType: string, targetId: string) {
  let ids = [targetId];
  if (targetType === "group") {
    const [{ data: a }, { data: b }] = await Promise.all([
      supabase.from("screen_group_members").select("screen_id").eq("group_id", targetId),
      supabase.from("screens").select("id").eq("group_id", targetId),
    ]);
    ids = [...new Set([...(a ?? []).map((r) => r.screen_id), ...(b ?? []).map((r) => r.id)])];
  }
  for (const screenId of ids) void enqueueCommand({ data: { screenId, command: "refresh_content" } }).catch(() => {});
}

export async function deleteSchedule(id: string) {
  const { data: old } = await supabase.from("schedules").select("target_type,target_id").eq("id", id).maybeSingle();
  const { error } = await supabase.from("schedules").delete().eq("id", id);
  if (error) throw error;
  if (old) await refreshScheduleTargets(old.target_type, old.target_id);
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
