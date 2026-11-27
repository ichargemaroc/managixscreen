import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { Content } from '@/player/protocol';
import { DEFAULT_ITEM_SCHEDULE } from '@/lib/playlist-item-settings';
const fixture = vi.hoisted(() => ({ content: null as Content | null }));
vi.mock('@/player/platform', () => ({ readCredentials: async () => ({ device_id: 'a67f4500-b2f4-4049-9a31-5433f14aad57', device_token: 'a'.repeat(64), paired: true }), saveCredentials: vi.fn(), subscribeNetwork: async () => () => {}, keepAwake: async () => () => {}, enterPlayerMode: vi.fn() }));
vi.mock('@/player/cache', () => ({ readContent: async () => fixture.content, cachedMedia: async () => new Blob(['image']), commandReceipt: vi.fn(), saveReceipt: vi.fn(), downloadContent: vi.fn(), clearMediaCache: vi.fn() }));
import { TVPlayer } from '@/player/player';
import { MultiZoneStage } from '@/player/multi-zone-stage';
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function setup() {
  vi.useFakeTimers({ shouldAdvanceTime: true }); vi.setSystemTime(new Date('2026-11-27T08:59:58Z'));
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  vi.stubGlobal('URL', class extends URL { static override createObjectURL() { return 'blob:cached-photo'; } static override revokeObjectURL() {} });
  const id = 'a67f4500-b2f4-4049-9a31-5433f14aad57';
  fixture.content = { screen_id: id, assignment_updated_at: '1', last_sync_at: '1', slide_transition: 'fade', playlist: { id, name: 'Scheduled', updated_at: '1', items: [{ id, position: 0, display_duration: 20, transition: 'zoom', schedule: { ...DEFAULT_ITEM_SCHEDULE, timezone: 'UTC', daily: { enabled: true, start: '09:00', end: '09:01' } }, media: { id, name: 'Scheduled photo', type: 'image', size: 5, duration: null, download_url: 'https://example.test/photo.png' } }] } };
  return fixture.content;
}
it('starts and stops a cached photo at its scheduled boundaries while offline and uses its custom transition', async () => {
  setup(); const { container } = render(<TVPlayer />);
  await screen.findByText('En attente de contenu');
  expect(screen.queryByRole('img', { name: 'Scheduled photo' })).toBeNull();
  await act(async () => { await vi.advanceTimersByTimeAsync(2200); });
  const image = await screen.findByRole('img', { name: 'Scheduled photo' });
  expect(image.closest('.tv-stage')).toHaveAttribute('data-transition', 'zoom');
  await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
  await waitFor(() => expect(container.querySelector('.tv-stage')).toBeNull());
});
it('applies the same offline schedule and transition to multi-zone playlists', async () => {
  const content = setup();
  const layout = { id: content.screen_id, name: 'Zones', revision: 1, zones: [{ id: 'one', x: 0, y: 0, width: 0.5, height: 1, playlist_id: content.screen_id, audio: false, playlist: content.playlist }, { id: 'two', x: 0.5, y: 0, width: 0.5, height: 1, playlist_id: content.screen_id, audio: false, playlist: null }] };
  const { container } = render(<MultiZoneStage content={{ ...content, layout }} paused={false} />);
  expect(container.querySelector('img')).toBeNull();
  await act(async () => { await vi.advanceTimersByTimeAsync(2200); });
  const image = await screen.findByRole('img', { name: 'Scheduled photo' });
  expect(image.closest('.tv-stage')).toHaveAttribute('data-transition', 'zoom');
  await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
  expect(container.querySelector('img')).toBeNull();
});