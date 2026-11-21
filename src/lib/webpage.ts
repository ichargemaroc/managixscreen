import { z } from 'zod';

export function webpageUrl(input: string): string {
  const url = new URL(input.trim());
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || !host ||
    host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host === '::1' || host === '0.0.0.0' ||
    /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) || host.includes(':') ||
    /^\d+$/.test(host)) throw new Error('Utilisez une URL HTTP ou HTTPS publique, sans identifiants.');
  return url.href;
}
const YOUTUBE_ID = /^[A-Za-z0-9_-]{6,20}$/;
export function youtubeEmbedUrl(input: string): string | null {
  let url: URL;
  try { url = new URL(input.trim()); } catch { return null; }
  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, '');
  let id: string | null = null;
  if (host === 'youtu.be') id = url.pathname.split('/')[1] ?? null;
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    else id = url.pathname.match(/^\/(embed|shorts|live)\/([^/?]+)/)?.[2] ?? null;
  }
  if (!id || !YOUTUBE_ID.test(id)) return null;
  const params = new URLSearchParams({ autoplay: '1', mute: '1', controls: '0', rel: '0', modestbranding: '1', playsinline: '1', loop: '1', playlist: id });
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}
export function displayWebpageUrl(input: string): string {
  const safe = webpageUrl(input);
  return youtubeEmbedUrl(safe) ?? safe;
}
export const webpageSchema = z.object({
  name: z.string().trim().min(1, 'Le nom est obligatoire.').max(120),
  url: z.string().max(2048).transform((value, ctx) => { try { return webpageUrl(value); } catch { ctx.addIssue({ code: 'custom', message: 'Utilisez une URL HTTP ou HTTPS publique, sans identifiants.' }); return z.NEVER; } }),
  duration: z.number().int().min(1).max(86400).default(30),
  refreshMinutes: z.number().int().min(0).max(1440).default(0),
  fullscreen: z.boolean().default(true),
});
export type WebpageConfig = z.infer<typeof webpageSchema>;
export const WEBPAGE_TIMEOUT_MS = 15000;
export function webpageRefreshMs(minutes: number) { return Number.isInteger(minutes) && minutes > 0 && minutes <= 1440 ? minutes * 60000 : 0; }