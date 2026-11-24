import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { Content } from '@/player/protocol';

const mocks = vi.hoisted(() => ({ api: vi.fn(), download: vi.fn() }));
vi.mock('@/player/protocol', async importOriginal => ({ ...await importOriginal<typeof import('@/player/protocol')>(), deviceApi: mocks.api }));
vi.mock('@/player/platform', () => ({
  readCredentials: async () => ({ device_id: 'a67f4500-b2f4-4049-9a31-5433f14aad57', device_token: 'a'.repeat(64), paired: true }),
  saveCredentials: vi.fn(), subscribeNetwork: async () => () => {}, keepAwake: async () => () => {}, enterPlayerMode: vi.fn(),
}));
vi.mock('@/player/cache', () => ({ readContent: async () => null, cachedMedia: async () => new Blob(['image']), downloadContent: mocks.download, commandReceipt: vi.fn(), saveReceipt: vi.fn(), clearMediaCache: vi.fn() }));
import { TVPlayer } from '@/player/player';

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('retrieves and displays the assigned playlist even when heartbeat temporarily fails', async () => {
  const id = 'a67f4500-b2f4-4049-9a31-5433f14aad57';
  const content: Content = { screen_id: id, assignment_updated_at: '2026-11-21T00:00:00Z', last_sync_at: '2026-11-21T00:00:00Z', playlist: { id, name: 'Updated', updated_at: '2026-11-21T01:00:00Z', items: [{ id, position: 0, display_duration: 23, media: { id, name: 'Updated photo', type: 'image', size: 5, duration: null, download_url: 'https://example.test/photo.png' } }] } };
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  vi.stubGlobal('URL', class extends URL { static override createObjectURL() { return 'blob:updated-photo'; } static override revokeObjectURL() {} });
  mocks.api.mockImplementation(async (operation: string) => {
    if (operation === 'heartbeat') throw new Error('Temporary telemetry outage');
    if (operation === 'content') return content;
    return { commands: [] };
  });
  mocks.download.mockResolvedValue(undefined);
  render(<TVPlayer />);
  expect(await screen.findByRole('img', { name: 'Updated photo' })).toHaveAttribute('src', 'blob:updated-photo');
  expect(mocks.api).toHaveBeenCalledWith('content', expect.objectContaining({ device_id: id }), {});
  expect(mocks.download).toHaveBeenCalledWith(expect.objectContaining({ playlist: expect.objectContaining({ updated_at: '2026-11-21T01:00:00Z' }) }), expect.any(Function));
});
it('keeps playback without re-downloading when the server reports no change', async () => {
  const id = 'a67f4500-b2f4-4049-9a31-5433f14aad57';
  const content: Content = { fingerprint: 'f'.repeat(64), screen_id: id, assignment_updated_at: '2026-11-21T00:00:00Z', last_sync_at: '2026-11-21T00:00:00Z', playlist: { id, name: 'P', updated_at: '1', items: [{ id, position: 0, display_duration: 23, media: { id, name: 'Same photo', type: 'image', size: 5, duration: null, download_url: 'https://example.test/p.png' } }] } };
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  vi.stubGlobal('URL', class extends URL { static override createObjectURL() { return 'blob:same'; } static override revokeObjectURL() {} });
  mocks.download.mockReset(); mocks.download.mockResolvedValue(undefined);
  mocks.api.mockReset();
  mocks.api.mockImplementation(async (operation: string, _c: unknown, fields?: { known?: string }) => {
    if (operation === 'content') return fields?.known ? { unchanged: true, fingerprint: 'f'.repeat(64), last_sync_at: '2026-11-21T00:00:00Z' } : content;
    return { commands: [] };
  });
  vi.useFakeTimers({ shouldAdvanceTime: true });
  render(<TVPlayer />);
  await screen.findByRole('img', { name: 'Same photo' });
  await vi.advanceTimersByTimeAsync(16000);
  vi.useRealTimers();
  expect(mocks.api).toHaveBeenCalledWith('content', expect.anything(), { known: 'f'.repeat(64) });
  expect(mocks.download).toHaveBeenCalledTimes(1);
});
