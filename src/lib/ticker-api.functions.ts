import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { generateDeviceToken, hashDeviceToken } from '@/lib/device-protocol';

const input = z.object({ playlistId: z.string().uuid() }).strict();

export const tickerKeyStatus = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator(input)
  .handler(async ({ data, context }) => {
    const { data: s, error } = await context.supabase.rpc('playlist_ticker_key_status', { p_playlist: data.playlistId });
    if (error) throw new Error('Statut de la clé indisponible.');
    return (s ?? null) as { created_at: string; last_used_at: string | null } | null;
  });

export const rotateTickerKey = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator(input)
  .handler(async ({ data, context }) => {
    const key = generateDeviceToken();
    const { data: ok, error } = await context.supabase.rpc('rotate_playlist_ticker_key', { p_playlist: data.playlistId, p_hash: await hashDeviceToken(key) });
    if (error || !ok) throw new Error('La clé n’a pas pu être générée.');
    return key;
  });

export const revokeTickerKey = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator(input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc('revoke_playlist_ticker_key', { p_playlist: data.playlistId });
    if (error) throw new Error('La clé n’a pas pu être désactivée.');
    return true;
  });
