import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => ({ createSignedUrls: vi.fn(), createSignedUrl: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { storage: { from: () => storage } } }));
import { loadMediaUrls } from '@/lib/store';

describe('Private media thumbnails', () => {
  beforeEach(() => {
    storage.createSignedUrls.mockReset().mockImplementation(async (paths: string[]) => ({
      data: paths.map((path) => ({ path, signedUrl: `https://media.test/original/${path}` })), error: null,
    }));
    storage.createSignedUrl.mockReset().mockImplementation(async (path: string) => ({
      data: { signedUrl: `https://media.test/thumbnail/${path}` }, error: null,
    }));
  });

  it('requests a compressed thumbnail separately without replacing the original', async () => {
    const client = new QueryClient();
    const result = await loadMediaUrls(client, [{ path: 'owner/photo.jpg', type: 'image' }]);
    expect(storage.createSignedUrl).toHaveBeenCalledWith('owner/photo.jpg', 3600, {
      transform: { width: 480, height: 270, resize: 'cover', quality: 70 },
    });
    expect(result.get('owner/photo.jpg')).toEqual({
      url: 'https://media.test/original/owner/photo.jpg',
      thumbnailUrl: 'https://media.test/thumbnail/owner/photo.jpg',
    });
    client.clear();
  });

  it('batches originals, excludes Web pages, and never transforms videos', async () => {
    const client = new QueryClient();
    await loadMediaUrls(client, [
      { path: 'owner/photo.jpg', type: 'image' },
      { path: 'owner/video.mp4', type: 'video' },
      { path: 'owner/link.webpage', type: 'webpage' },
    ]);
    expect(storage.createSignedUrls).toHaveBeenCalledTimes(1);
    expect(storage.createSignedUrls).toHaveBeenCalledWith(['owner/photo.jpg', 'owner/video.mp4'], 3600);
    expect(storage.createSignedUrl).toHaveBeenCalledTimes(1);
    client.clear();
  });

  it('reuses signed links on refresh, but signs again after session cache is cleared', async () => {
    const client = new QueryClient();
    const rows = [{ path: 'owner/photo.jpg', type: 'image' }];
    await loadMediaUrls(client, rows);
    await loadMediaUrls(client, rows);
    expect(storage.createSignedUrls).toHaveBeenCalledTimes(1);
    expect(storage.createSignedUrl).toHaveBeenCalledTimes(1);
    client.clear();
    await loadMediaUrls(client, rows);
    expect(storage.createSignedUrls).toHaveBeenCalledTimes(2);
    expect(storage.createSignedUrl).toHaveBeenCalledTimes(2);
    client.clear();
  });

  it('keeps the original available if thumbnail signing fails', async () => {
    const client = new QueryClient();
    storage.createSignedUrl.mockResolvedValue({ data: null, error: new Error('Unavailable') });
    const result = await loadMediaUrls(client, [{ path: 'owner/photo.jpg', type: 'image' }]);
    expect(result.get('owner/photo.jpg')?.thumbnailUrl).toBe('https://media.test/original/owner/photo.jpg');
    client.clear();
  });
});