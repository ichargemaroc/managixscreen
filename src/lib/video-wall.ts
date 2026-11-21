import { z } from 'zod';
export const wallConfigSchema = z.object({ name: z.string().trim().min(1).max(120), columns: z.number().int().min(1).max(8), rows: z.number().int().min(1).max(8), width: z.number().int().min(320).max(32768), height: z.number().int().min(180).max(32768), gap_x: z.number().int().min(0).max(1000), gap_y: z.number().int().min(0).max(1000), orientation: z.enum(['landscape','portrait']), media_id: z.string().uuid().nullable() }).refine(w => w.width > (w.columns-1)*w.gap_x && w.height > (w.rows-1)*w.gap_y, 'Les espaces dépassent la taille du mur.');
export const wallPlaybackSchema = z.object({ id: z.string().uuid(), name: z.string(), columns: z.number().int().min(1).max(8), rows: z.number().int().min(1).max(8), width: z.number().positive(), height: z.number().positive(), gap_x: z.number().nonnegative(), gap_y: z.number().nonnegative(), orientation: z.enum(['landscape','portrait']), row_index: z.number().int().nonnegative(), column_index: z.number().int().nonnegative(), state: z.enum(['playing','paused','stopped']), epoch: z.string(), position_seconds: z.number().nonnegative(), revision: z.number() });
export type WallConfig = z.infer<typeof wallConfigSchema>;
export type WallPlayback = z.infer<typeof wallPlaybackSchema>;
export type WallMember = { screen_id: string; row_index: number; column_index: number };
export type VideoWall = WallConfig & { id: string; state: WallPlayback['state']; epoch: string; position_seconds: number; revision: number; members: WallMember[] };
export function validateWallMembers(config: WallConfig, members: WallMember[]) {
  const screens = new Set<string>(); const positions = new Set<string>();
  for (const m of members) {
    const key = `${m.row_index}:${m.column_index}`;
    if (m.row_index < 0 || m.row_index >= config.rows || m.column_index < 0 || m.column_index >= config.columns || !Number.isInteger(m.row_index) || !Number.isInteger(m.column_index) || screens.has(m.screen_id) || positions.has(key)) throw new Error('Chaque écran doit occuper une seule position valide.');
    screens.add(m.screen_id); positions.add(key);
  }
}
export function wallViewport(w: Pick<WallPlayback,'width'|'height'|'columns'|'rows'|'gap_x'|'gap_y'|'row_index'|'column_index'>) {
  const width=(w.width-(w.columns-1)*w.gap_x)/w.columns;
  const height=(w.height-(w.rows-1)*w.gap_y)/w.rows;
  return { x:w.column_index*(width+w.gap_x), y:w.row_index*(height+w.gap_y), width, height };
}
export function wallPosition(w: Pick<WallPlayback,'state'|'epoch'|'position_seconds'>, serverNow: number, duration?: number) {
  const time=w.position_seconds+(w.state==='playing' ? Math.max(0,(serverNow-Date.parse(w.epoch))/1000) : 0);
  return duration && duration>0 ? time%duration : time;
}
// A single global contain-fit preserves the source proportions before each physical viewport is cropped.
export function wallMediaRect(w: Pick<WallPlayback,'width'|'height'>, sourceWidth:number, sourceHeight:number) {
  const scale=Math.min(w.width/sourceWidth,w.height/sourceHeight);
  return { x:(w.width-sourceWidth*scale)/2,y:(w.height-sourceHeight*scale)/2,width:sourceWidth*scale,height:sourceHeight*scale };
}
