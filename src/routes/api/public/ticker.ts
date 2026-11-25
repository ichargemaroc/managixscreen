import { createFileRoute } from '@tanstack/react-router';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Max-Age': '86400' };
const reply = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store', ...cors } });

export const Route = createFileRoute('/api/public/ticker')({
  server: { handlers: {
    OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
    POST: async ({ request }) => {
      const { bearerToken, tickerApiBody } = await import('@/lib/ticker-api');
      const token = bearerToken(request.headers.get('authorization'));
      if (!token) return reply({ error: 'Clé API manquante ou invalide' }, 401);
      const raw = await request.text();
      if (raw.length > 4096) return reply({ error: 'Demande trop volumineuse' }, 413);
      let body;
      try { body = tickerApiBody.parse(JSON.parse(raw)); } catch { return reply({ error: 'Corps attendu : { "text": "…" (500 caractères max), "enabled": true|false }' }, 400); }
      const { hashDeviceToken } = await import('@/lib/device-protocol');
      const hash = await hashDeviceToken(token);
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      const { data: allowed, error: limitError } = await supabaseAdmin.rpc('consume_device_limit', { p_key: `ticker:${hash}`, p_max: 60, p_seconds: 60 });
      if (limitError || !allowed) return reply({ error: 'Trop de demandes. Réessayez dans une minute.' }, 429);
      const { data: ok, error } = await supabaseAdmin.rpc('set_playlist_ticker_text', { p_hash: hash, p_text: body.text, p_enabled: body.enabled ?? null as unknown as boolean });
      if (error) return reply({ error: 'Service indisponible' }, 503);
      if (!ok) return reply({ error: 'Clé API invalide' }, 401);
      return reply({ ok: true });
    },
  } },
});
