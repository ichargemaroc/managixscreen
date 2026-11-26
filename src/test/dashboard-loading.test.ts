import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ from: vi.fn(), sign: vi.fn(), thumbnail: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: mocks.from,
  storage: { from: () => ({ createSignedUrls: mocks.sign, createSignedUrl: mocks.thumbnail }) },
} }));
import { fetchAll, storeScope, mediaPreviewOptions } from '@/lib/store';

type Result = { data: Record<string, unknown>[]; error: null };
type ReadQuery = Promise<Result> & { select: () => ReadQuery; order: () => ReadQuery; limit: () => ReadQuery };

describe('Dashboard loading', () => {
  beforeEach(() => {
    mocks.from.mockReset().mockImplementation((table: string) => {
      const fixtures: Record<string, Record<string, unknown>[]> = {
        screens: [{ id: 'screen-1', name: 'Écran réel', status: 'online', last_seen: new Date().toISOString(), playlist_id: 'playlist-1' }],
        media: [{ id: 'photo-1', name: 'Photo', type: 'image', path: 'owner/photo.jpg' }],
        playlists: [{ id: 'playlist-1', name: 'Playlist réelle' }],
        device_telemetry: [{ device_id: 'device-1', player_version: 'android-tv-1.0.5', last_sync_at: '2026-11-26T20:17:00Z', playback_status: { state: 'playing', media_id: 'photo-1', playlist_id: 'playlist-1' } }],
        pairing_sessions: [{ screen_id: 'screen-1', device_id: 'device-1', status: 'revoked' }],
      };
      const query: ReadQuery = Object.assign(Promise.resolve({ data: fixtures[table] ?? [], error: null }), {
        select: (): ReadQuery => query,
        order: (): ReadQuery => query,
        limit: (): ReadQuery => query,
      });
      return query;
    });
    mocks.sign.mockReset().mockResolvedValue({ data: [{ path: 'owner/photo.jpg', signedUrl: 'https://media.test/original' }], error: null });
    mocks.thumbnail.mockReset().mockResolvedValue({ data: { signedUrl: 'https://media.test/thumbnail' }, error: null });
  });

  it('loads only five useful tables and never waits for storage signing', async () => {
    const client = new QueryClient();
    const data = await fetchAll(client, storeScope('/'));
    expect(mocks.from.mock.calls.map(([table]) => table).sort()).toEqual(['device_telemetry', 'media', 'pairing_sessions', 'playlists', 'screens']);
    expect(data.screens.map((screen) => screen.name)).toEqual(['Écran réel']);
    expect(data.media).toHaveLength(1);
    expect(data.playlists).toHaveLength(1);
    expect(data.screens[0]?.playerVersion).toBe('android-tv-1.0.5');
    expect(data.screens[0]?.lastSyncAt).toBe('2026-11-26T20:17:00Z');
    expect(data.screens[0]?.playbackStatus).toEqual({ state: 'playing', media_id: 'photo-1', playlist_id: 'playlist-1' });
    expect(mocks.sign).not.toHaveBeenCalled();
    expect(mocks.thumbnail).not.toHaveBeenCalled();
    client.clear();
  });

  it('signs only the selected media when opening a dashboard preview', async () => {
    const client = new QueryClient();
    const data = await fetchAll(client, 'dashboard');
    const media = data.media[0];
    if (!media) throw new Error('Missing media fixture');
    expect(mocks.thumbnail).not.toHaveBeenCalled();
    expect(await client.fetchQuery(mediaPreviewOptions(media))).toBe('https://media.test/thumbnail');
    expect(mocks.thumbnail).toHaveBeenCalledWith('owner/photo.jpg', 3600);
    expect(mocks.sign).not.toHaveBeenCalled();
    await client.fetchQuery(mediaPreviewOptions(media));
    expect(mocks.thumbnail).toHaveBeenCalledTimes(1);
    client.clear();
  });

  it('preserves revoked-device status in dashboard counters', async () => {
    const client = new QueryClient();
    const data = await fetchAll(client, 'dashboard');
    expect(data.screens[0]?.status).toBe('offline');
    expect(data.screens[0]?.revoked).toBe(true);
    client.clear();
  });

  it('loads signed originals and thumbnails when entering a media-preview page', async () => {
    const client = new QueryClient();
    await fetchAll(client, 'dashboard');
    const data = await fetchAll(client, storeScope('/media'));
    expect(data.media[0]?.url).toBe('https://media.test/original');
    expect(data.media[0]?.thumbnailUrl).toBe('https://media.test/thumbnail');
    expect(mocks.sign).toHaveBeenCalledTimes(1);
    expect(mocks.thumbnail).toHaveBeenCalledTimes(1);
    for (const path of ['/playlists', '/video-walls', '/multi-zones', '/team']) expect(storeScope(path)).toBe('media');
    client.clear();
  });

  it('keeps screen entitlements available outside the dashboard without signing media', async () => {
    const client = new QueryClient();
    await fetchAll(client, storeScope('/subscription'));
    expect(mocks.from).toHaveBeenCalledWith('screen_entitlements');
    expect(mocks.sign).not.toHaveBeenCalled();
    client.clear();
  });
});