import { describe, expect, it } from 'vitest';
import { webpageThumbnailConfig } from '@/lib/webpage-thumbnail';

describe('webpage thumbnail isolation', () => {
  it('keeps external pages opaque even when they share the dashboard origin', () => {
    const config = webpageThumbnailConfig('https://screenflow.live/auth', 'https://screenflow.live');
    expect(config.src).toBe('https://screenflow.live/auth');
    expect(config.sandbox).toBe('allow-scripts');
    expect(webpageThumbnailConfig('https://example.com', 'https://screenflow.live').sandbox).toBe('allow-scripts');
  });
  it('retains origin only for allow-listed internal displays', () => {
    const config = webpageThumbnailConfig('https://screenflow.live/display/weather?lat=30&lon=4', 'http://localhost:8080');
    expect(config.src).toBe('http://localhost:8080/display/weather?lat=30&lon=4');
    expect(config.sandbox).toBe('allow-scripts allow-same-origin');
  });
  it('disables YouTube autoplay without changing playback configuration', () => {
    const config = webpageThumbnailConfig('https://youtu.be/dQw4w9WgXcQ', 'https://screenflow.live');
    expect(new URL(config.src).searchParams.get('autoplay')).toBe('0');
    expect(new URL(config.src).searchParams.get('mute')).toBe('1');
    expect(config.sandbox).toBe('allow-scripts');
  });
  it('rejects unsafe URLs instead of embedding them', () => {
    expect(() => webpageThumbnailConfig('javascript:alert(1)', 'https://screenflow.live')).toThrow();
    expect(() => webpageThumbnailConfig('http://127.0.0.1', 'https://screenflow.live')).toThrow();
  });
});