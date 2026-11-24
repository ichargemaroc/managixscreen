import { describe, expect, it } from 'vitest';
import { musicSettingsSchema, defaultMusicSettings, shouldPlayMusic, musicCacheKey, validateMusicFile } from '@/lib/background-music';

describe('Screen background music rules', () => {
  it('rejects non-MP3 files and imports above 50 MB', async () => {
    await expect(validateMusicFile(new File(['ID3'], 'sound.wav'))).rejects.toThrow();
    const large = new File(['ID3'], 'large.mp3');
    Object.defineProperty(large, 'size', { value: 50 * 1024 * 1024 + 1 });
    await expect(validateMusicFile(large)).rejects.toThrow();
  });
  it('accepts an MP3 with no MIME type and rejects disguised non-audio data', async () => {
    const mp3 = new File(['ID3music'], 'Ambiance.mp3');
    // jsdom File lacks arrayBuffer; use an actual Blob implementation for its slice.
    Object.defineProperty(mp3, 'slice', { value: () => ({ arrayBuffer: async () => new Uint8Array([73, 68, 51]).buffer }) });
    await expect(validateMusicFile(mp3)).resolves.toBeUndefined();
    const bad = new File(['PNG'], 'fake.mp3');
    Object.defineProperty(bad, 'slice', { value: () => ({ arrayBuffer: async () => new Uint8Array([80, 78, 71]).buffer }) });
    await expect(validateMusicFile(bad)).rejects.toThrow();
  });
  it('limits configurable volume to 0–100 percent', () => {
    expect(musicSettingsSchema.safeParse({ ...defaultMusicSettings, volume: -1 }).success).toBe(false);
    expect(musicSettingsSchema.safeParse({ ...defaultMusicSettings, volume: 101 }).success).toBe(false);
    expect(musicSettingsSchema.parse({ ...defaultMusicSettings, volume: 35 }).volume).toBe(35);
  });
  it('continues on images and cuts during videos only when selected', () => {
    expect(shouldPlayMusic(defaultMusicSettings, true, false)).toBe(true);
    expect(shouldPlayMusic(defaultMusicSettings, true, true)).toBe(false);
    expect(shouldPlayMusic({ ...defaultMusicSettings, pause_on_video: false }, true, true)).toBe(true);
  });
  it('stops when playback is inactive or music is disabled', () => {
    expect(shouldPlayMusic(defaultMusicSettings, false, false)).toBe(false);
    expect(shouldPlayMusic({ ...defaultMusicSettings, enabled: false }, true, false)).toBe(false);
    expect(shouldPlayMusic({ ...defaultMusicSettings, volume: 0 }, true, false)).toBe(false);
  });
  it('keeps the same offline key across slide and URL changes', () => {
    expect(musicCacheKey({ id: 'track', size: 100 })).toBe('music:track:100');
    expect(musicCacheKey({ id: 'replacement', size: 100 })).not.toBe(musicCacheKey({ id: 'track', size: 100 }));
  });
});