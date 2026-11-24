import { z } from 'zod';

export const MUSIC_MAX_BYTES = 50 * 1024 * 1024;
export const musicSettingsSchema = z.object({ enabled: z.boolean(), volume: z.number().int().min(0).max(100), pause_on_video: z.boolean() });
export const musicTrackSchema = musicSettingsSchema.extend({ id: z.string().uuid(), name: z.string(), size: z.number().int().positive().max(MUSIC_MAX_BYTES) });
export const musicManifestSchema = musicTrackSchema.extend({ path: z.string() });
export const musicPlaybackSchema = musicTrackSchema.extend({ download_url: z.string().url() });
export type MusicSettings = z.infer<typeof musicSettingsSchema>;
export const defaultMusicSettings: MusicSettings = { enabled: true, volume: 50, pause_on_video: true };

export async function validateMusicFile(file: File) {
  if (!/\.mp3$/i.test(file.name) || !file.size || file.size > MUSIC_MAX_BYTES) throw new Error('Choisissez un fichier MP3 non vide de 50 Mo maximum.');
  const bytes = new Uint8Array(await file.slice(0, 3).arrayBuffer());
  const id3 = bytes[0] === 73 && bytes[1] === 68 && bytes[2] === 51;
  const frame = bytes[0] === 255 && bytes[1] !== undefined && (bytes[1] & 0xe0) === 0xe0 && (bytes[1] & 6) !== 0;
  if (!id3 && !frame) throw new Error('Ce fichier ne contient pas de musique MP3 reconnue.');
}

export function musicCacheKey(track: { id: string; size: number }) { return `music:${track.id}:${track.size}`; }
export function shouldPlayMusic(settings: MusicSettings, active: boolean, videoPlaying: boolean) {
  return active && settings.enabled && settings.volume > 0 && !(settings.pause_on_video && videoPlaying);
}