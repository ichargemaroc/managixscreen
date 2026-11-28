import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { Content } from '@/player/protocol';
const fixture = vi.hoisted(() => ({ content: null as Content | null }));
vi.mock('@/player/platform', () => ({ readCredentials: async () => ({ device_id: 'a67f4500-b2f4-4049-9a31-5433f14aad57', device_token: 'a'.repeat(64), paired: true }), saveCredentials: vi.fn(), subscribeNetwork: async () => () => {}, keepAwake: async () => () => {}, enterPlayerMode: vi.fn() }));
vi.mock('@/player/cache', () => ({ readContent: async () => fixture.content, cachedMedia: async () => new Blob(['image']), commandReceipt: vi.fn(), saveReceipt: vi.fn(), downloadContent: vi.fn(), clearMediaCache: vi.fn() }));
vi.mock('@/player/webpage-native', () => ({ nativeWebpage: async () => null }));
vi.mock('@/player/protocol', async importOriginal => ({ ...await importOriginal<typeof import('@/player/protocol')>(), deviceApi: async (operation: string) => operation === 'content' ? fixture.content : operation === 'commands' ? { commands: [] } : {} }));
import { TVPlayer } from '@/player/player';
import { MultiZoneStage } from '@/player/multi-zone-stage';
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function setup() {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  vi.stubGlobal('URL', class extends URL { static override createObjectURL() { return 'blob:cached-photo'; } static override revokeObjectURL() {} });
  const id = 'a67f4500-b2f4-4049-9a31-5433f14aad57';
  fixture.content = { screen_id: id, assignment_updated_at: '1', last_sync_at: '1', playlist: { id, name: 'Web', updated_at: '1', items: [
    { id, position: 0, display_duration: 2, media: { id, name: 'Slow site', type: 'webpage', size: 0, duration: 2, webpage_url: 'https://example.com' } },
    { id: 'b67f4500-b2f4-4049-9a31-5433f14aad57', position: 1, display_duration: 20, media: { id: 'b67f4500-b2f4-4049-9a31-5433f14aad57', name: 'Next photo', type: 'image', size: 5, duration: null, download_url: 'https://example.com/photo.png' } },
  ] } };
  return fixture.content;
}
it('applies a synced webpage URL change without requiring a playlist revision change', async () => {
  const content = setup();
  const first = content.playlist?.items[0];
  if (!first || !content.playlist) throw new Error('Missing entry');
  first.display_duration = 60;
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  const view = render(<TVPlayer />);
  await waitFor(() => expect(view.container.querySelector('iframe')).not.toBeNull());
  const initial = view.container.querySelector('iframe');
  if (!initial || !content.playlist) throw new Error('Missing webpage');
  fireEvent.load(initial);
  fixture.content = { ...content, playlist: { ...content.playlist, items: [{ ...first, display_duration: 60, media: { ...first.media, webpage_url: 'https://example.org/updated' } }] } };
  await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
  await waitFor(() => expect(view.container.querySelector('iframe')).toHaveAttribute('src', 'https://example.org/updated'));
});
for (const mode of ['standard', 'zone'] as const) {
  it(`waits for the webpage to load before counting its display duration in ${mode} playback`, async () => {
    const content = setup();
    const view = render(mode === 'standard' ? <TVPlayer /> : <MultiZoneStage paused={false} content={{ ...content, layout: { id: content.screen_id, name: 'Zones', revision: 1, zones: [{ id: 'one', x: 0, y: 0, width: 0.5, height: 1, playlist_id: content.screen_id, audio: false, playlist: content.playlist }, { id: 'two', x: 0.5, y: 0, width: 0.5, height: 1, playlist_id: content.screen_id, audio: false, playlist: null }] } }} />);
    await waitFor(() => expect(view.container.querySelector('iframe')).not.toBeNull());
    const frame = view.container.querySelector('iframe');
    expect(frame).not.toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(view.container.querySelector('iframe')).toBe(frame);
    if (!frame) throw new Error('Missing webpage');
    fireEvent.load(frame);
    await act(async () => { await vi.advanceTimersByTimeAsync(1900); });
    expect(view.container.querySelector('iframe')).toBe(frame);
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    expect(await screen.findByRole('img', { name: 'Next photo' })).toBeVisible();
  });
}