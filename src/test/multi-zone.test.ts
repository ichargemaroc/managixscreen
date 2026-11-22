import { describe,it,expect,beforeEach,vi } from 'vitest';
import 'fake-indexeddb/auto';
import { presetZones,zonesSchema } from '@/lib/multi-zone';
import { contentItems,type Content,type Item } from '@/player/protocol';
import { downloadContent,readContent,cachedMedia,clearMediaCache } from '@/player/cache';
const id='a67f4500-b2f4-4049-9a31-5433f14aad57';const other='b67f4500-b2f4-4049-9a31-5433f14aad57';
const item:Item={id,position:0,display_duration:2,media:{id,name:'Photo',type:'image',size:4,duration:null,download_url:'https://example.test/a.png'}};
const base:Content={screen_id:id,assignment_updated_at:'2026-11-22',last_sync_at:'2026-11-22',playlist:{id,name:'Standard',updated_at:'v1',items:[item]}};
const layout:Content={...base,playlist:null,layout:{id,name:'Deux zones',revision:1,zones:presetZones('columns',id).map((z,i)=>({...z,playlist:{id,name:`Zone ${i+1}`,updated_at:'v1',items:[i?{...item,id:other,media:{...item.media,id:other,download_url:'https://example.test/b.png'}}:item]}}))}};
describe('Composition rules',()=>{
 it('allows two to four independent zones',()=>{for(const p of ['columns','rows','sidebar','grid'] as const)expect(zonesSchema.parse(presetZones(p,id))).toHaveLength(p==='grid'?4:2);expect(zonesSchema.safeParse(presetZones('grid',id).concat(presetZones('columns',id))).success).toBe(false);});
 it('permits only one audio-enabled zone',()=>{expect(zonesSchema.safeParse(presetZones('columns',id)).success).toBe(true);expect(zonesSchema.safeParse(presetZones('columns',id).map(z=>({...z,audio:true}))).success).toBe(false);});
 it('rejects overlaps and zones outside the screen',()=>{const zones=presetZones('columns',id);expect(zonesSchema.safeParse(zones.map(z=>({...z,x:0}))).success).toBe(false);expect(zonesSchema.safeParse(zones.map(z=>({...z,width:0.9}))).success).toBe(false);});
});
describe('All-zone offline commit',()=>{
 beforeEach(async()=>{await clearMediaCache();vi.restoreAllMocks();});
 it('downloads every zone before committing the composition',async()=>{const fetcher=vi.spyOn(globalThis,'fetch').mockImplementation(async()=>new Response('data'));await downloadContent(layout,()=>{});expect(fetcher).toHaveBeenCalledTimes(2);expect((await readContent())?.layout?.zones).toHaveLength(2);for(const it of contentItems(layout))expect(await cachedMedia(layout,it)).toBeDefined();});
 it('preserves the previous playable content if any zone download fails',async()=>{vi.spyOn(globalThis,'fetch').mockResolvedValueOnce(new Response('data')).mockRejectedValue(new Error('Offline'));await downloadContent(base,()=>{});await expect(downloadContent(layout,()=>{})).rejects.toThrow('Offline');expect(await readContent()).toEqual(base);expect(await cachedMedia(base,item)).toBeDefined();});
 it('does not redownload unchanged zones when only signed URLs change',async()=>{const fetcher=vi.spyOn(globalThis,'fetch').mockImplementation(async()=>new Response('data'));await downloadContent(layout,()=>{});await downloadContent({...layout,layout:layout.layout?{...layout.layout,revision:2}:null},()=>{});expect(fetcher).toHaveBeenCalledTimes(2);});
});