import { z } from "zod";
import { wallPlaybackSchema } from "./video-wall";
import { displayRotationSchema } from './display-rotation';
import { tickerSchema } from '@/lib/ticker';
import { slideTransitionSchema } from './slide-transition';
import { musicManifestSchema } from './background-music';
import { itemScheduleSchema } from './playlist-item-settings';

export const manifestMediaSchema = z.object({ id: z.string().uuid(), name: z.string(), type: z.enum(['image', 'video', 'webpage']), size: z.number(), duration: z.number().nullable(), path: z.string(), webpage_url: z.string().nullable().optional(), refresh_minutes: z.number().int().min(0).max(1440).default(0), webpage_fullscreen: z.boolean().default(true) });

export const deviceCommand = z.enum(["refresh_content", "reload_playlist", "restart_player", "clear_cache", "position_test", "stop_position_test", "update_apk"]);
const deviceInfo = z.object({ manufacturer: z.string().max(120).optional(), model: z.string().max(120).optional(), android_version: z.string().max(80).optional(), storage_total_bytes: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(), storage_available_bytes: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(), storage_source: z.enum(['device', 'browser']).optional() }).strict().refine((value) => value.storage_total_bytes === undefined || value.storage_available_bytes === undefined || value.storage_available_bytes <= value.storage_total_bytes);
const playbackStatus = z.object({ state: z.enum(["idle", "playing", "paused", "buffering", "error"]), media_id: z.string().uuid().nullable().optional(), playlist_id: z.string().uuid().nullable().optional(), position_seconds: z.number().finite().min(0).max(86400).optional(), error: z.string().max(500).optional() }).strict();
export const deviceIdentity = z.object({ device_id: z.string().uuid() }).strict();
export const contentRequest = deviceIdentity.extend({ known: z.string().regex(/^[a-f0-9]{64}$/).optional() }).strict();
export const deviceReport = deviceIdentity.extend({ player_version: z.string().trim().min(1).max(80).optional(), device_info: deviceInfo.optional(), playback_status: playbackStatus.optional() }).strict();
export const commandAck = deviceIdentity.extend({ command_id: z.string().uuid(), status: z.enum(["completed", "failed"]), error: z.string().max(500).optional() }).strict();
export const manifestSchema = z.object({
  background_music: musicManifestSchema.nullable().optional(),
  display_rotation: displayRotationSchema.default(0),
  slide_transition: slideTransitionSchema.catch('default'),
  wall: wallPlaybackSchema.nullable().optional(), server_time: z.string().optional(),
  screen_id: z.string().uuid(), assignment_updated_at: z.string(),
  playlist: z.object({ id: z.string().uuid(), name: z.string(), updated_at: z.string(), slide_transition: slideTransitionSchema.optional(), ticker: tickerSchema.nullable().optional().catch(null), items: z.array(z.object({
    id: z.string().uuid(), position: z.number(), display_duration: z.number(), schedule: itemScheduleSchema.nullable().optional(), transition: slideTransitionSchema.nullable().optional(), media: manifestMediaSchema,
  })) }).nullable(),
});
export const COMMAND_LABELS: Record<z.infer<typeof deviceCommand>, string> = {
  refresh_content: "Actualiser le contenu", reload_playlist: "Recharger la playlist", restart_player: "Redémarrer le lecteur", clear_cache: "Vider le cache", position_test: "Test de position", stop_position_test: "Arrêter le test", update_apk: "Mettre à jour l’application",
};
export const COMMAND_STATUSES: Record<string, string> = { pending: "En attente", delivered: "Reçue par le lecteur", completed: "Exécutée", failed: "Échec", expired: "Expirée" };