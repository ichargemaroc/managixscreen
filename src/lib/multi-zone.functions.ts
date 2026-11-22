import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { layoutInput, layoutRowSchema } from './multi-zone';

export const readLayouts = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [layouts, assignments] = await Promise.all([context.supabase.from('screen_layouts').select('*').order('updated_at', { ascending: false }), context.supabase.from('screen_layout_assignments').select('screen_id,layout_id')]);
  if (layouts.error || assignments.error) throw new Error('Les compositions ne peuvent pas être chargées.');
  return { layouts: z.array(layoutRowSchema).parse(layouts.data), assignments: assignments.data ?? [] };
});
export const writeLayout = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator(layoutInput).handler(async ({ context, data }) => {
  const result = await context.supabase.rpc('save_screen_layout', { p_id: data.id as string, p_name: data.name, p_zones: data.zones });
  if (result.error) throw new Error('Composition refusée : vérifiez les playlists et les zones.');
  return result.data;
});
export const linkLayout = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator(z.object({ screenId: z.string().uuid(), layoutId: z.string().uuid().nullable() })).handler(async ({ context, data }) => {
  const result = await context.supabase.rpc('assign_screen_layout', { p_screen: data.screenId, p_layout: data.layoutId as string });
  if (result.error) throw new Error('Affectation refusée : vérifiez les droits de l’écran et son appartenance à un mur.');
});