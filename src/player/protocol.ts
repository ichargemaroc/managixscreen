import { z } from "zod";
import { wallPlaybackSchema } from "@/lib/video-wall";
import { webpageUrl } from '@/lib/webpage';
import { deviceEntitlementSchema } from '@/lib/billing';
import { zoneSchema } from '@/lib/multi-zone';

export const playerMediaSchema = z.object({ id: z.string().uuid(), name: z.string(), type: z.enum(['image', 'video', 'webpage']), size: z.number(), duration: z.number().nullable(), download_url: z.string().url().optional(), webpage_url: z.string().nullable().optional(), refresh_minutes: z.number().int().min(0).max(1440).optional(), webpage_fullscreen: z.boolean().optional() }).superRefine((media, ctx) => {
  if (media.type === 'webpage') { try { webpageUrl(media.webpage_url ?? ''); } catch { ctx.addIssue({ code: 'custom', message: 'Invalid webpage URL' }); } }
  else if (!media.download_url) ctx.addIssue({ code: 'custom', message: 'Missing media download URL' });
});

export const credentialsSchema = z.object({ device_id: z.string().uuid(), device_token: z.string().regex(/^[a-f0-9]{64}$/), pairing_code: z.string().regex(/^\d{6}$/), expires_at: z.number(), paired: z.boolean() });
export type Credentials = z.infer<typeof credentialsSchema>;
export const playerPlaylistSchema = z.object({ id: z.string().uuid(), name: z.string(), updated_at: z.string(), items: z.array(z.object({ id: z.string().uuid(), position: z.number().int().min(0), display_duration: z.number().positive(), media: playerMediaSchema })) });
export const playerLayoutSchema = z.object({ id:z.string().uuid(),name:z.string(),revision:z.number(),zones:z.array(zoneSchema.extend({ playlist:playerPlaylistSchema.nullable() })).min(2).max(4) });
export const contentSchema = z.object({ layout:playerLayoutSchema.nullable().optional(),entitlement: deviceEntitlementSchema.optional(), wall: wallPlaybackSchema.nullable().optional(), server_time: z.string().optional(), clock_offset: z.number().optional(), screen_id: z.string().uuid(), assignment_updated_at: z.string(), last_sync_at: z.string(), fingerprint: z.string().optional(), playlist: playerPlaylistSchema.nullable() });
export const unchangedSchema = z.object({ unchanged: z.literal(true), fingerprint: z.string(), entitlement: deviceEntitlementSchema.optional(), server_time: z.string().optional(), last_sync_at: z.string() });
export type Content = z.input<typeof contentSchema>;
export type Item = NonNullable<Content["playlist"]>["items"][number];
export function contentItems(content: Content): Item[] { return [...(content.playlist?.items ?? []), ...(content.layout?.zones.flatMap(z => z.playlist?.items ?? []) ?? [])]; }
export const commandsSchema = z.object({ server_time: z.string().optional(), commands: z.array(z.object({ id: z.string().uuid(), command: z.enum(["refresh_content", "reload_playlist", "restart_player", "clear_cache", "position_test", "stop_position_test"]), expires_at: z.string(), payload: z.unknown().optional() })) });
// Uploaded media IDs are immutable; editing order/duration must not redownload large videos.
export function cacheKey(_content: Content, item: Item) { return `media:${item.media.id}:${item.media.type}:${item.media.size}`; }
export function legacyCacheKey(content: Content, item: Item) { return `${content.playlist?.id}:${content.playlist?.updated_at}:${item.media.id}`; }
export function nextItem(index: number, count: number) { return count > 0 ? (index + 1) % count : 0; }
export function imageDuration(item: Item) { return Math.max(1, item.display_duration) * 1000; }

export class DeviceApiError extends Error { constructor(public status: number) { super(status === 401 ? "L’accès de cet appareil a été révoqué." : status === 429 ? "Trop de demandes, nouvel essai dans une minute." : "Connexion au serveur indisponible."); } }
export async function deviceApi(operation: string, credentials: Credentials | null, fields: Record<string, unknown> = {}) {
  const configured = import.meta.env['VITE_PLAYER_API_ORIGIN'];
  const origin = configured || window.location.origin;
  const url = new URL(`/api/public/devices/${operation}`, origin);
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") throw new Error("Une adresse HTTPS est requise.");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (credentials) headers['Authorization'] = `Bearer ${credentials.device_token}`;
  const body = credentials ? { device_id: credentials.device_id, ...fields } : fields;
  const { Capacitor, CapacitorHttp } = await import("@capacitor/core");
  if (Capacitor.isNativePlatform()) {
    if (!configured) throw new Error("L’adresse du serveur n’a pas été configurée pour Android.");
    // The WebView uses the same network stack as Chrome (which reaches the server), so try it first with a short cap;
    // native HTTP is only a fallback because it can hang on some devices.
    let webDetail = "";
    try { return await webRequest(url, headers, body, 8000); }
    catch (e) {
      if (e instanceof DeviceApiError) throw e;
      webDetail = e instanceof Error && e.message ? e.message : "réseau injoignable";
    }
    try {
      const response = await withTimeout(CapacitorHttp.post({ url: url.toString(), headers, data: body, connectTimeout: 7000, readTimeout: 7000 }), 8000);
      if (response.status < 200 || response.status >= 300) throw new DeviceApiError(response.status);
      return (typeof response.data === "string" ? JSON.parse(response.data) : response.data) as unknown;
    } catch (e) {
      if (e instanceof DeviceApiError) throw e;
      const nativeDetail = e instanceof Error && e.message ? e.message : "réseau injoignable";
      throw new Error(`Connexion impossible vers ${url.hostname} (web : ${webDetail} ; natif : ${nativeDetail})`);
    }
  }
  return webRequest(url, headers, body);
}
function withTimeout<T>(task: Promise<T>, ms: number) { return Promise.race([task, new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`délai de ${ms / 1000} s dépassé`)), ms))]); }
async function webRequest(url: URL, headers: Record<string, string>, body: unknown, ms = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const response = await withTimeout(fetch(url, { method: "POST", headers, body: JSON.stringify(body), cache: "no-store", signal: controller.signal }), ms);
    if (!response.ok) throw new DeviceApiError(response.status);
    return await response.json() as unknown;
  } finally { clearTimeout(timer); }
}