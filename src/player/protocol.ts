import { z } from "zod";

export const credentialsSchema = z.object({ device_id: z.string().uuid(), device_token: z.string().regex(/^[a-f0-9]{64}$/), pairing_code: z.string().regex(/^\d{6}$/), expires_at: z.number(), paired: z.boolean() });
export type Credentials = z.infer<typeof credentialsSchema>;
export const contentSchema = z.object({ screen_id: z.string().uuid(), assignment_updated_at: z.string(), last_sync_at: z.string(), playlist: z.object({ id: z.string().uuid(), name: z.string(), updated_at: z.string(), items: z.array(z.object({ id: z.string().uuid(), position: z.number().int().min(0), display_duration: z.number().positive(), media: z.object({ id: z.string().uuid(), name: z.string(), type: z.enum(["image", "video"]), size: z.number(), duration: z.number().nullable(), download_url: z.string().url() }) })) }).nullable() });
export type Content = z.infer<typeof contentSchema>;
export type Item = NonNullable<Content["playlist"]>["items"][number];
export const commandsSchema = z.object({ commands: z.array(z.object({ id: z.string().uuid(), command: z.enum(["refresh_content", "reload_playlist", "restart_player", "clear_cache"]), expires_at: z.string() })) });
export function cacheKey(content: Content, item: Item) { return `${content.playlist?.id}:${content.playlist?.updated_at}:${item.media.id}`; }
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
    let response;
    try {
      response = await CapacitorHttp.post({ url: url.toString(), headers, data: body, connectTimeout: 15000, readTimeout: 15000 });
    } catch (e) {
      const detail = e instanceof Error && e.message ? e.message : "réseau injoignable";
      throw new Error(`Connexion impossible vers ${url.hostname} : ${detail}`);
    }
    if (response.status < 200 || response.status >= 300) throw new DeviceApiError(response.status);
    return (typeof response.data === "string" ? JSON.parse(response.data) : response.data) as unknown;
  }
  const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new DeviceApiError(response.status);
  return response.json() as Promise<unknown>;
}