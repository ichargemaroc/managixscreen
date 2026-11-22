import { beforeEach,describe,it,expect,vi } from 'vitest';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),from:vi.fn()}));
vi.mock('@tanstack/react-start',()=>({createServerFn:()=>{const builder={middleware:()=>builder,inputValidator:()=>builder,handler:(handler:unknown)=>handler};return builder;}}));
vi.mock('@/integrations/supabase/auth-middleware',()=>({requireSupabaseAuth:{}}));
import { proposeContent,reviewContent,acceptTeam } from '@/lib/team.functions';
type Handler=(args:{data:Record<string,unknown>;context:{userId:string;supabase:typeof mocks}})=>Promise<unknown>;
const owner='a67f4500-b2f4-4049-9a31-5433f14aad57';const member='b67f4500-b2f4-4049-9a31-5433f14aad57';
describe('Content-only team permissions',()=>{
 beforeEach(()=>vi.resetAllMocks());
 it('refuses a collaborator proposal when transactional membership validation fails',async()=>{mocks.rpc.mockResolvedValue({error:{message:'Forbidden'}});await expect((proposeContent as unknown as Handler)({context:{userId:member,supabase:mocks},data:{ownerId:owner,playlistId:null,name:'Brouillon',items:[]}})).rejects.toThrow('Proposition refusée');expect(mocks.rpc).toHaveBeenCalledWith('submit_content_draft',{p_owner:owner,p_playlist:null,p_name:'Brouillon',p_items:[]});});
 it('prevents a collaborator from approving another owner’s live playlist',async()=>{const query={select:vi.fn(),eq:vi.fn(),single:vi.fn().mockResolvedValue({data:null,error:{message:'Not found'}})};query.select.mockReturnValue(query);query.eq.mockReturnValue(query);mocks.from.mockReturnValue(query);await expect((reviewContent as unknown as Handler)({context:{userId:member,supabase:mocks},data:{id:owner,approve:true}})).rejects.toThrow('Proposition inaccessible');expect(query.eq).toHaveBeenCalledWith('owner_id',member);expect(mocks.rpc).not.toHaveBeenCalled();});
 it('requires a verified email before accepting a team invitation',async()=>{const getUser=vi.fn().mockResolvedValue({data:{user:{email_confirmed_at:null}},error:null});const context={userId:member,supabase:{...mocks,auth:{getUser}}};await expect((acceptTeam as unknown as Handler)({context,data:{id:owner,token:'a'.repeat(64)}})).rejects.toThrow('adresse e-mail doit être vérifiée');expect(mocks.rpc).not.toHaveBeenCalled();});
});