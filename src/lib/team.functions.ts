import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { draftInputSchema,teamDataSchema } from './team';

export const readTeam = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async ({context})=>{
  const r=await context.supabase.rpc('content_team_data');if(r.error)throw new Error('Équipe indisponible.');const parsed=teamDataSchema.parse(r.data);
  const {data:members}=await context.supabase.from('content_team_members').select('owner_id,member_id').is('revoked_at',null);
  const allowed=new Map<string,Set<string>>();for(const d of parsed.drafts){if(!members?.some(m=>m.owner_id===d.owner_id&&m.member_id===d.author_id))continue;for(const it of d.items){const owners=allowed.get(it.mediaId)??new Set<string>();owners.add(d.owner_id);owners.add(d.author_id);allowed.set(it.mediaId,owners);}}
  const draftMedia:{id:string;name:string;type:string;url:string}[]=[];
  if(allowed.size){const {supabaseAdmin}=await import('@/integrations/supabase/client.server');const {data:media}=await supabaseAdmin.from('media').select('id,user_id,name,type,path,webpage_url').in('id',[...allowed.keys()]);
    for(const m of media??[]){if(!allowed.get(m.id)?.has(m.user_id))continue;let url=m.webpage_url??'';if(m.type!=='webpage'){const signed=await supabaseAdmin.storage.from('media').createSignedUrl(m.path,900);if(signed.error||!signed.data)continue;const value=new URL(signed.data.signedUrl);const base=import.meta.env['VITE_SUPABASE_URL'];url=base?`${base}${value.pathname}${value.search}`:value.href;}draftMedia.push({id:m.id,name:m.name,type:m.type,url});}
  }
  return {...parsed,currentUserId:context.userId,draftMedia};
});
export const inviteTeam = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({email:z.string().email().max(254)})).handler(async({context,data})=>{
  const r=await context.supabase.rpc('invite_content_member',{p_email:data.email});if(r.error)throw new Error('Invitation refusée. Vérifiez l’adresse ou les invitations en cours.');return z.object({id:z.string().uuid(),token:z.string().regex(/^[a-f0-9]{64}$/)}).parse(r.data);
});
export const acceptTeam = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({id:z.string().uuid(),token:z.string().regex(/^[a-f0-9]{64}$/)})).handler(async({context,data})=>{
  const {data:verified,error}=await context.supabase.auth.getUser();if(error || !verified.user?.email_confirmed_at)throw new Error('Votre adresse e-mail doit être vérifiée.');
  const r=await context.supabase.rpc('accept_content_invite',{p_id:data.id,p_token:data.token});if(r.error)throw new Error('Invitation expirée, révoquée ou destinée à une autre adresse.');return {ok:true};
});
export const revokeTeam = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({memberId:z.string().uuid().nullable(),inviteId:z.string().uuid().nullable()})).handler(async({context,data})=>{
  const r=await context.supabase.rpc('revoke_content_access',{p_member:data.memberId as string,p_invite:data.inviteId as string});if(r.error)throw new Error('Révocation refusée.');
});
export const proposeContent = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(draftInputSchema).handler(async({context,data})=>{
  const r=await context.supabase.rpc('submit_content_draft',{p_owner:data.ownerId,p_playlist:data.playlistId as string,p_name:data.name,p_items:data.items});if(r.error)throw new Error('Proposition refusée : vérifiez vos droits et les médias sélectionnés.');return r.data;
});
export const reviewContent = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(z.object({id:z.string().uuid(),approve:z.boolean()})).handler(async({context,data})=>{
  const {data:d,error}=await context.supabase.from('content_team_drafts').select('*').eq('id',data.id).eq('owner_id',context.userId).eq('status','pending').single();
  if(error || !d)throw new Error('Proposition inaccessible.');
  const {data:member}=await context.supabase.from('content_team_members').select('member_id').eq('owner_id',context.userId).eq('member_id',d.author_id).is('revoked_at',null).maybeSingle();
  if(!member)throw new Error('Le collaborateur n’a plus accès à cet espace.');
  const original=draftInputSchema.shape.items.parse(d.items);const items:typeof original=[];
  if(data.approve){
    // Privileged copying is limited to the selected proposal after owner and current membership checks.
    const {supabaseAdmin}=await import('@/integrations/supabase/client.server');const copied=new Map<string,string>();
    for(const item of original){
      if(copied.has(item.mediaId)){const id=copied.get(item.mediaId);if(id)items.push({...item,mediaId:id});continue;}
      const {data:m,error:mediaError}=await supabaseAdmin.from('media').select('*').eq('id',item.mediaId).in('user_id',[context.userId,d.author_id]).single();
      if(mediaError || !m)throw new Error('Un média proposé n’est plus disponible.');
      if(m.user_id===context.userId){items.push(item);continue;}
      const id=crypto.randomUUID();const extension=m.type==='webpage'?'webpage':m.path.split('.').pop()?.toLowerCase();
      if(!extension || !/^[a-z0-9]{1,10}$/.test(extension))throw new Error('Format du média refusé.');
      const path=`${context.userId}/${id}.${extension}`;
      if(m.type!=='webpage'){const r=await supabaseAdmin.storage.from('media').copy(m.path,path);if(r.error)throw new Error('Copie du média impossible.');}
      const {error:insertError}=await context.supabase.from('media').insert({id,user_id:context.userId,name:m.name,type:m.type,size:m.size,duration:m.duration,path,webpage_url:m.webpage_url,refresh_minutes:m.refresh_minutes,webpage_fullscreen:m.webpage_fullscreen});
      if(insertError)throw new Error('Import du média proposé impossible.');copied.set(item.mediaId,id);items.push({...item,mediaId:id});
    }
  }
  const r=await context.supabase.rpc('review_content_draft',{p_id:data.id,p_approve:data.approve,p_items:items});if(r.error)throw new Error('Validation refusée. Aucun changement de playlist n’a été appliqué.');return r.data;
});