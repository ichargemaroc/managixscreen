import { z } from 'zod';
export const draftItemSchema = z.object({ mediaId:z.string().uuid(),duration:z.number().int().min(1).max(86400) });
export const draftInputSchema = z.object({ ownerId:z.string().uuid(),playlistId:z.string().uuid().nullable(),name:z.string().trim().min(1).max(80),items:z.array(draftItemSchema).max(100) });
export const teamDataSchema = z.object({
  members:z.array(z.object({member_id:z.string().uuid(),email:z.string().nullable(),name:z.string().nullable(),revoked_at:z.string().nullable()})),
  invites:z.array(z.object({id:z.string().uuid(),email:z.string(),expires_at:z.string(),accepted_at:z.string().nullable(),revoked_at:z.string().nullable()})),
  workspaces:z.array(z.object({owner_id:z.string().uuid(),name:z.string(),playlists:z.array(z.object({id:z.string().uuid(),name:z.string(),items:z.array(draftItemSchema)})),media:z.array(z.object({id:z.string().uuid(),name:z.string(),type:z.string(),size:z.number(),duration:z.number().nullable()}))})),
  drafts:z.array(z.object({id:z.string().uuid(),owner_id:z.string().uuid(),author_id:z.string().uuid(),playlist_id:z.string().nullable(),name:z.string(),items:z.array(draftItemSchema),status:z.enum(['pending','approved','rejected']),created_at:z.string(),reviewed_at:z.string().nullable()})),
});
export type TeamData = z.infer<typeof teamDataSchema>;