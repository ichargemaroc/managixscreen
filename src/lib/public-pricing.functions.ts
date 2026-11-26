import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import { publicPricingSchema } from './public-pricing';
import type { Database } from '@/integrations/supabase/types';

export const getPublicPricing = createServerFn({ method: 'GET' }).handler(async () => {
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) throw new Error('Les tarifs ne sont pas disponibles.');
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization');
      headers.set('apikey', key);
      return fetch(input, { ...init, headers });
    } },
  });
  const { data, error } = await client.rpc('public_pricing');
  if (error) throw new Error('Les tarifs n’ont pas pu être chargés.');
  return publicPricingSchema.parse(data);
});