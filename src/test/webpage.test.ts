import { describe, expect, it } from 'vitest';
import { displayWebpageUrl, webpageSchema, webpageUrl, webpageRefreshMs, youtubeEmbedUrl, WEBPAGE_TIMEOUT_MS } from '@/lib/webpage';
import { contentSchema } from '@/player/protocol';

describe('webpage sources', () => {
  it('accepts public HTTP and HTTPS URLs', () => { expect(webpageUrl('https://example.com/page')).toBe('https://example.com/page'); expect(webpageUrl('http://example.com')).toBe('http://example.com/'); });
  it.each(['javascript:alert(1)', 'file:///data/file', 'data:text/html,secret', 'intent://app', 'https://user:password@example.com', 'http://localhost', 'http://127.0.0.1', 'http://2130706433', 'http://192.168.0.1', 'http://10.0.0.1', 'http://169.254.169.254', 'http://[::1]'])('rejects dangerous or private URL %s', url => { expect(() => webpageUrl(url)).toThrow(); });
  it('disables refresh by default and enables fullscreen', () => { const config = webpageSchema.parse({ name: 'Site', url: 'https://example.com' }); expect(config.refreshMinutes).toBe(0); expect(config.fullscreen).toBe(true); expect(webpageRefreshMs(config.refreshMinutes)).toBe(0); });
  it('reloads on a minutes interval, not seconds, with a bounded timeout', () => { expect(webpageRefreshMs(2)).toBe(120000); expect(WEBPAGE_TIMEOUT_MS).toBe(15000); });
  it('uses an explicit positive playlist duration', () => { expect(webpageSchema.parse({ name: 'Site', url: 'https://example.com', duration: 45 }).duration).toBe(45); expect(webpageSchema.safeParse({ name: 'Site', url: 'https://example.com', duration: 0 }).success).toBe(false); });
  it.each(['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://m.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123', 'https://youtu.be/dQw4w9WgXcQ?t=42', 'https://www.youtube.com/shorts/dQw4w9WgXcQ', 'https://www.youtube.com/live/dQw4w9WgXcQ', 'https://www.youtube.com/embed/dQw4w9WgXcQ'])('shows only the video for YouTube URL %s', url => {
    const embed = youtubeEmbedUrl(url);
    expect(embed).toBeTruthy();
    expect(embed).toContain('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?');
    expect(embed).toContain('autoplay=1'); expect(embed).toContain('controls=0'); expect(embed).toContain('loop=1'); expect(embed).toContain('playlist=dQw4w9WgXcQ');
    expect(displayWebpageUrl(url)).toBe(embed);
  });
  it('rejects malformed YouTube IDs and leaves other sites untouched', () => {
    expect(youtubeEmbedUrl('https://www.youtube.com/watch?v=<script>')).toBeNull();
    expect(youtubeEmbedUrl('https://www.youtube.com/watch')).toBeNull();
    expect(youtubeEmbedUrl('https://example.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(displayWebpageUrl('https://example.com/page')).toBe('https://example.com/page');
  });
  it('accepts webpages without a downloadable storage file and preserves old file manifests', () => {
    const id = 'a67f4500-b2f4-4049-9a31-5433f14aad57';
    const base = { screen_id: id, assignment_updated_at: 'now', last_sync_at: 'now', playlist: { id, name: 'Mixte', updated_at: 'now', items: [{ id, position: 0, display_duration: 45, media: { id, name: 'Site', type: 'webpage', size: 0, duration: 45, webpage_url: 'https://example.com' } }, { id, position: 1, display_duration: 10, media: { id, name: 'Photo', type: 'image', size: 4, duration: null, download_url: 'https://example.com/image.png' } }] } };
    expect(contentSchema.parse(base).playlist?.items).toHaveLength(2);
    expect(contentSchema.safeParse({ ...base, playlist: { ...base.playlist, items: [{ ...base.playlist.items[0], media: { id, name: 'Site', type: 'webpage', size: 0, duration: 45, webpage_url: 'javascript:alert(1)' } }] } }).success).toBe(false);
  });
});