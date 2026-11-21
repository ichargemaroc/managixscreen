import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { wallConfigSchema, validateWallMembers } from './video-wall';
export const saveWall = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({ id:z.string().uuid().nullable(), config:wallConfigSchema, members:z.array(z.object({screen_id:z.string().uuid(),row_index:z.number().int(),column_index:z.number().int()})).max(64) })).handler(async ({data,context})=>{
  validateWallMembers(data.config,data.members);
  const {data:id,error}=await context.supabase.rpc('save_video_wall',{p_id:data.id as string,p_config:data.config,p_members:data.members});
  if(error) throw new Error('Enregistrement impossible. Vérifiez que les écrans ne sont pas déjà affectés à un autre mur.');
  return id;
});
export const controlWall = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({id:z.string().uuid(),action:z.enum(['play','pause','stop'])})).handler(async ({data,context})=>{
  const {error}=await context.supabase.rpc('control_video_wall',{p_wall:data.id,p_action:data.action});
  if(error) throw new Error('Sélectionnez un contenu et au moins un écran avant de lancer le mur.');
});
