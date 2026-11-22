import { z } from 'zod';

export const zoneSchema = z.object({ id: z.string().min(1).max(80), x: z.number().finite().min(0).max(1), y: z.number().finite().min(0).max(1), width: z.number().finite().min(0.1).max(1), height: z.number().finite().min(0.1).max(1), playlist_id: z.string().uuid(), audio: z.boolean() });
export const zonesSchema = z.array(zoneSchema).min(2).max(4).superRefine((zones, ctx) => {
  if (zones.filter(z => z.audio).length > 1) ctx.addIssue({ code: 'custom', message: 'Une seule zone sonore est autorisée.' });
  if (new Set(zones.map(z => z.id)).size !== zones.length) ctx.addIssue({ code: 'custom', message: 'Identifiants de zone dupliqués.' });
  zones.forEach((a, i) => {
    if (a.x + a.width > 1.000001 || a.y + a.height > 1.000001) ctx.addIssue({ code: 'custom', message: 'Zone hors écran.' });
    zones.slice(i + 1).forEach(b => { if (a.x < b.x + b.width - 0.000001 && b.x < a.x + a.width - 0.000001 && a.y < b.y + b.height - 0.000001 && b.y < a.y + a.height - 0.000001) ctx.addIssue({ code: 'custom', message: 'Zones superposées.' }); });
  });
});
export const layoutInput = z.object({ id: z.string().uuid().nullable(), name: z.string().trim().min(1).max(80), zones: zonesSchema });
export type Zone = z.infer<typeof zoneSchema>;
export const layoutRowSchema = z.object({ id: z.string().uuid(), name: z.string(), zones: zonesSchema, revision: z.number(), updated_at: z.string() });
export type Layout = z.infer<typeof layoutRowSchema>;
export type LayoutPreset = 'columns' | 'rows' | 'sidebar' | 'grid';
export function presetZones(preset: LayoutPreset, playlistId: string, ratio = 0.5): Zone[] {
  const split = Math.min(0.9, Math.max(0.1, ratio));
  const rects = preset === 'grid' ? [[0,0,0.5,0.5],[0.5,0,0.5,0.5],[0,0.5,0.5,0.5],[0.5,0.5,0.5,0.5]] : preset === 'rows' ? [[0,0,1,split],[0,split,1,1-split]] : [[0,0,preset === 'sidebar' ? 0.75 : split,1],[preset === 'sidebar' ? 0.75 : split,0,preset === 'sidebar' ? 0.25 : 1-split,1]];
  return rects.map((r, i) => ({ id: `zone-${i + 1}`, x: r[0] ?? 0, y: r[1] ?? 0, width: r[2] ?? 1, height: r[3] ?? 1, playlist_id: playlistId, audio: i === 0 }));
}
export function zoneRect(zone: Pick<Zone,'x'|'y'|'width'|'height'>) { return { left: `${zone.x * 100}%`, top: `${zone.y * 100}%`, width: `${zone.width * 100}%`, height: `${zone.height * 100}%` }; }