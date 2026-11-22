import { z } from "zod";
import { effectivePairingStatus, generateDeviceToken, generatePairingCode, hashDeviceToken, PAIRING_LIFETIME_SECONDS } from "@/lib/device-protocol";
import { deviceIdentity, deviceReport, commandAck, manifestSchema, manifestMediaSchema } from "@/lib/player-protocol";
import { wallPlaybackSchema } from "@/lib/video-wall";
import { webpageUrl } from './webpage';
import { deviceEntitlementSchema } from './billing';

const registration = z.object({ device_name: z.string().trim().max(120).default("Android TV"), device_metadata: z.record(z.string(), z.union([z.string().max(200), z.number(), z.boolean()])).default({}) }).strict();

// Device routes use bearer tokens, never cookies: allowing any origin lets the Android WebView fall back to fetch.
export const deviceCorsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Max-Age": "86400" };
export function deviceCorsPreflight() { return new Response(null, { status: 204, headers: deviceCorsHeaders }); }

export async function handleDeviceRequest(request: Request, operation: "request" | "status" | "heartbeat" | "content" | "commands" | "ack") {
  const reply = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store", ...deviceCorsHeaders } });
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) return reply({ error: "JSON requis" }, 415);
    const body = await request.text();
    if (body.length > 4096) return reply({ error: "Demande trop volumineuse" }, 413);
    if (operation === "request") {
      const input = registration.parse(JSON.parse(body));
      // Bootstrap creates only a new identity; clients cannot select another device's ID.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: config } = await supabaseAdmin.from("device_pairing_config").select("enabled").eq("id", true).maybeSingle();
      if (!config?.enabled) return reply({ error: "Les demandes de jumelage ne sont pas encore activées." }, 503);
      // Do not trust arbitrary forwarded IP headers. Missing edge identity shares a conservative bucket.
      const origin = request.headers.get("cf-connecting-ip") ?? "unknown-edge";
      const addressHash = await hashDeviceToken(origin);
      for (const [key, max] of [["request:global", 100], [`request:address:${addressHash}`, 5]] as const) {
        const { data: allowed, error } = await supabaseAdmin.rpc("consume_device_limit", { p_key: key, p_max: max, p_seconds: 600 });
        if (error || !allowed) return reply({ error: "Trop de demandes. Réessayez dans 10 minutes." }, 429);
      }
      const deviceId = crypto.randomUUID();
      const token = generateDeviceToken();
      const hash = await hashDeviceToken(token);
      for (let attempt = 0; attempt < 8; attempt++) {
        const code = generatePairingCode();
        const { error } = await supabaseAdmin.rpc("register_pairing_session", { p_id: crypto.randomUUID(), p_code: code, p_device_id: deviceId, p_name: input.device_name, p_metadata: input.device_metadata, p_hash: hash });
        if (!error) return reply({ device_id: deviceId, device_token: token, pairing_code: code, expires_in: PAIRING_LIFETIME_SECONDS }, 201);
        if (error.code !== "23505") return reply({ error: "Le jumelage est indisponible." }, 503);
      }
      return reply({ error: "Réessayez ultérieurement." }, 503);
    }
    const parsedBody: unknown = JSON.parse(body);
    const input = operation === "heartbeat" ? deviceReport.parse(parsedBody) : operation === "ack" ? commandAck.parse(parsedBody) : deviceIdentity.parse(parsedBody);
    const token = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
    if (!/^[a-f0-9]{64}$/.test(token)) return reply({ error: "Appareil non autorisé" }, 401);
    const hash = await hashDeviceToken(token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Both identifiers must match before any session data is read or any screen is updated.
    const { data: credential } = await supabaseAdmin.from("device_credentials").select("device_id").eq("device_id", input.device_id).eq("token_hash", hash).is("revoked_at", null).maybeSingle();
    if (!credential) return reply({ error: "Appareil non autorisé" }, 401);
    const { data: allowed, error: limitError } = await supabaseAdmin.rpc("consume_device_limit", { p_key: `device:${input.device_id}`, p_max: 30, p_seconds: 60 });
    if (limitError || !allowed) return reply({ error: "Trop de demandes. Réessayez dans une minute." }, 429);
    if (operation === "heartbeat") {
      const { device_id, ...report } = deviceReport.parse(parsedBody);
      const { data, error } = await supabaseAdmin.rpc("device_report", { p_device: device_id, p_hash: hash, p_report: report });
      if (error) return reply({ error: "Appareil non autorisé" }, 401);
      return reply({ last_seen: data, status: "online" });
    }
    if (operation === "content") {
      const entitlementResult = await supabaseAdmin.rpc('device_entitlement', { p_device: input.device_id, p_hash: hash });
      if (entitlementResult.error) return reply({ error: 'Droits indisponibles' }, 503);
      const entitlement = deviceEntitlementSchema.parse(entitlementResult.data);
      const { data, error } = await supabaseAdmin.rpc("device_content", { p_device: input.device_id, p_hash: hash });
      if (error) return reply({ error: "Appareil non autorisé" }, 401);
      if (!entitlement.active) { const base = manifestSchema.parse(data); return reply({ screen_id: base.screen_id, assignment_updated_at: base.assignment_updated_at, last_sync_at: new Date().toISOString(), server_time: new Date().toISOString(), entitlement, playlist: null, wall: null }); }
      const { data: wallData, error: wallError } = await supabaseAdmin.rpc("device_wall", { p_device: input.device_id, p_hash: hash });
      if (wallError) throw new Error("Wall unavailable");
      const wall = wallData ? wallPlaybackSchema.parse(wallData) : null;
      const wallMedia = wallData ? z.object({ media: manifestMediaSchema.nullable() }).parse(wallData).media : null;
      const base = manifestSchema.parse(data);
      // An assigned wall is an explicit playback mode, even when stopped or without media.
      // Media ID, not control revision, keys the offline cache so pause/resume never redownloads.
      const manifest = { ...base, wall, playlist: wall ? wallMedia ? { id: wall.id, name: wall.name, updated_at: wallMedia.type === 'webpage' ? `${wallMedia.id}:${wallMedia.webpage_url ?? ''}:${wallMedia.refresh_minutes}:${wallMedia.webpage_fullscreen}` : wallMedia.id, items: [{ id: wallMedia.id, position: 0, display_duration: wallMedia.duration ?? 10, media: wallMedia }] } : null : base.playlist };
      const items = await Promise.all((manifest.playlist?.items ?? []).map(async ({ media, ...item }) => {
        const { path, ...metadata } = media;
        if (media.type === 'webpage') return { ...item, media: { ...metadata, webpage_url: webpageUrl(media.webpage_url ?? '') } };
        const { data: url, error: urlError } = await supabaseAdmin.storage.from("media").createSignedUrl(path, 3600);
        if (urlError || !url?.signedUrl) throw new Error("Media unavailable");
        // The backend request host may be internal in drafts. Downloads must use the browser-facing host.
        const publicHost = import.meta.env['VITE_SUPABASE_URL'];
        if (!publicHost) throw new Error("Storage unavailable");
        const download = new URL(url.signedUrl);
        const publicUrl = new URL(publicHost);
        download.protocol = publicUrl.protocol; download.host = publicUrl.host;
        return { ...item, media: { ...metadata, download_url: download.toString() } };
      }));
      const { data: synced, error: syncError } = await supabaseAdmin.rpc("device_record_sync", { p_device: input.device_id, p_hash: hash });
      if (syncError) return reply({ error: "Appareil non autorisé" }, 401);
      return reply({ ...manifest, entitlement, playlist: manifest.playlist ? { ...manifest.playlist, items } : null, server_time: new Date().toISOString(), last_sync_at: synced, download_urls_expire_in: 3600 });
    }
    if (operation === "commands") {
      const { data, error } = await supabaseAdmin.rpc("device_poll_commands", { p_device: input.device_id, p_hash: hash });
      if (error) return reply({ error: "Appareil non autorisé" }, 401);
      return reply({ commands: data, server_time: new Date().toISOString() });
    }
    if (operation === "ack") {
      const ack = commandAck.parse(parsedBody);
      const { data, error } = await supabaseAdmin.rpc("device_ack_command", { p_device: input.device_id, p_hash: hash, p_command: ack.command_id, p_status: ack.status, ...(ack.error ? { p_error: ack.error } : {}) });
      if (error) return reply({ error: "Appareil non autorisé" }, 401);
      if (!data) return reply({ error: "Commande indisponible ou état incompatible" }, 409);
      return reply({ acknowledged: true });
    }
    const { data: session } = await supabaseAdmin.from("pairing_sessions").select("status, expires_at, screen_id").eq("device_id", input.device_id).maybeSingle();
    if (!session) return reply({ error: "Appareil non autorisé" }, 401);
    const status = effectivePairingStatus(session.status, session.expires_at);
    return reply({ status, expires_at: session.expires_at, paired: status === "paired" && session.screen_id !== null });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) return reply({ error: "Demande invalide" }, 400);
    return reply({ error: "Service temporairement indisponible" }, 503);
  }
}