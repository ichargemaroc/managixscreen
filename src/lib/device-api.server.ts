import { z } from "zod";
import { effectivePairingStatus, generateDeviceToken, generatePairingCode, hashDeviceToken, PAIRING_LIFETIME_SECONDS } from "@/lib/device-protocol";

const identity = z.object({ device_id: z.string().uuid() }).strict();
const registration = z.object({ device_name: z.string().trim().max(120).default("Android TV"), device_metadata: z.record(z.string(), z.union([z.string().max(200), z.number(), z.boolean()])).default({}) }).strict();

export async function handleDeviceRequest(request: Request, operation: "request" | "status" | "heartbeat") {
  const reply = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
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
    const input = identity.parse(JSON.parse(body));
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
      const { data, error } = await supabaseAdmin.rpc("device_heartbeat", { p_device: input.device_id, p_hash: hash });
      if (error) return reply({ error: "Appareil non autorisé" }, 401);
      return reply({ last_seen: data, status: "online" });
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