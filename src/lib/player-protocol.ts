import { z } from "zod";
import { wallPlaybackSchema } from "./video-wall";

export const deviceCommand = z.enum(["refresh_content", "reload_playlist", "restart_player", "clear_cache", "position_test", "stop_position_test"]);
const deviceInfo = z.object({ manufacturer: z.string().max(120).optional(), model: z.string().max(120).optional(), android_version: z.string().max(80).optional() }).strict();
const playbackStatus = z.object({ state: z.enum(["idle", "playing", "paused", "buffering", "error"]), media_id: z.string().uuid().nullable().optional(), playlist_id: z.string().uuid().nullable().optional(), position_seconds: z.number().finite().min(0).max(86400).optional(), error: z.string().max(500).optional() }).strict();
export const deviceIdentity = z.object({ device_id: z.string().uuid() }).strict();
export const deviceReport = deviceIdentity.extend({ player_version: z.string().trim().min(1).max(80).optional(), device_info: deviceInfo.optional(), playback_status: playbackStatus.optional() }).strict();
export const commandAck = deviceIdentity.extend({ command_id: z.string().uuid(), status: z.enum(["completed", "failed"]), error: z.string().max(500).optional() }).strict();
export const manifestSchema = z.object({
  wall: wallPlaybackSchema.nullable().optional(), server_time: z.string().optional(),
  screen_id: z.string().uuid(), assignment_updated_at: z.string(),
  playlist: z.object({ id: z.string().uuid(), name: z.string(), updated_at: z.string(), items: z.array(z.object({
    id: z.string().uuid(), position: z.number(), display_duration: z.number(), media: z.object({ id: z.string().uuid(), name: z.string(), type: z.enum(["image", "video"]), size: z.number(), duration: z.number().nullable(), path: z.string() }),
  })) }).nullable(),
});
export const COMMAND_LABELS: Record<z.infer<typeof deviceCommand>, string> = {
  refresh_content: "Actualiser le contenu", reload_playlist: "Recharger la playlist", restart_player: "Redémarrer le lecteur", clear_cache: "Vider le cache", position_test: "Test de position", stop_position_test: "Arrêter le test",
};
export const COMMAND_STATUSES: Record<string, string> = { pending: "En attente", delivered: "Reçue par le lecteur", completed: "Exécutée", failed: "Échec", expired: "Expirée" };