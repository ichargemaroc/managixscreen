import {describe,it,expect} from 'vitest';
import {wallConfigSchema,wallViewport,wallMediaRect,wallPosition,validateWallMembers} from '@/lib/video-wall';
const config={name:'Mur',columns:2,rows:2,width:3840,height:2160,gap_x:0,gap_y:0,orientation:'landscape' as const,media_id:null};
describe('Video wall rules',()=>{
  it('maps each television to its own quarter, never repeats the entire content',()=>{
    expect(wallViewport({...config,row_index:1,column_index:1})).toEqual({x:1920,y:1080,width:1920,height:1080});
    expect(wallViewport({...config,row_index:0,column_index:0})).toEqual({x:0,y:0,width:1920,height:1080});
  });
  it('includes physical gaps in the global viewport',()=>{expect(wallViewport({...config,gap_x:40,gap_y:20,row_index:1,column_index:1})).toEqual({x:1940,y:1090,width:1900,height:1070});});
  it('preserves image proportions instead of stretching a square',()=>{expect(wallMediaRect(config,1000,1000)).toEqual({x:840,y:0,width:2160,height:2160});});
  it('forbids duplicate screens',()=>{expect(()=>validateWallMembers(config,[{screen_id:'a',row_index:0,column_index:0},{screen_id:'a',row_index:1,column_index:0}])).toThrow();});
  it('forbids duplicate positions',()=>{expect(()=>validateWallMembers(config,[{screen_id:'a',row_index:0,column_index:0},{screen_id:'b',row_index:0,column_index:0}])).toThrow();});
  it('forbids positions outside the grid',()=>{expect(()=>validateWallMembers(config,[{screen_id:'a',row_index:2,column_index:0}])).toThrow();});
  it('accepts all requested presets',()=>{for(const [columns,rows] of [[1,2],[2,2],[2,3],[3,3],[4,4]])expect(wallConfigSchema.safeParse({...config,columns,rows}).success).toBe(true);});
  it('rejects gaps that consume the entire wall',()=>{expect(wallConfigSchema.safeParse({...config,width:320,gap_x:320}).success).toBe(false);});
  it('joins a running video at its shared timeline, including after reconnection',()=>{expect(wallPosition({state:'playing',epoch:'2026-11-21T14:00:00Z',position_seconds:2},Date.parse('2026-11-21T14:00:12Z'),10)).toBe(4);});
  it('preserves the paused position',()=>{expect(wallPosition({state:'paused',epoch:'2026-11-21T14:00:00Z',position_seconds:7},Date.parse('2026-11-21T15:00:00Z'),10)).toBe(7);});
  it('holds at the initial position before the coordinated start',()=>{expect(wallPosition({state:'playing',epoch:'2026-11-21T14:00:15Z',position_seconds:0},Date.parse('2026-11-21T14:00:10Z'),10)).toBe(0);});
});
