import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { Content } from '@/player/protocol';
const fixture = vi.hoisted(() => ({ content: null as Content | null }));
vi.mock('@/player/platform', () => ({ readCredentials: async () => ({ device_id: 'a67f4500-b2f4-4049-9a31-5433f14aad57', device_token: 'a'.repeat(64), paired: true }), saveCredentials: vi.fn(), subscribeNetwork: async () => () => {}, keepAwake: async () => () => {}, enterPlayerMode: vi.fn() }));
vi.mock('@/player/cache', () => ({ readContent: async () => fixture.content, cachedMedia: async () => new Blob(['image']), commandReceipt: vi.fn(), saveReceipt: vi.fn(), downloadContent: vi.fn(), clearMediaCache: vi.fn() }));
vi.mock('@/player/webpage-native', () => ({ nativeWebpage: async () => null }));
vi.mock('@/player/protocol', async importOriginal => ({ ...await importOriginal<typeof import('@/player/protocol')>(), deviceApi: async (operation: string) => operation === 'content' ? fixture.content : operation === 'commands' ? { commands: [] } : {} }));
import { TVPlayer } from '@/player/player';
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('keeps a loaded webpage on screen for its full 60 second duration while syncing', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  vi.stubGlobal('URL', class extends URL { static override createObjectURL() { return 'blob:cached-photo'; } static override revokeObjectURL() {} });
  const id = 'a67f4500-b2f4-4049-9a31-5433f14aad57';
  fixture.content = { screen_id: id, assignment_updated_at: '1', last_sync_at: '1', playlist: { id, name: 'Web', updated_at: '1', items: [
    { id, position: 0, display_duration: 60, media: { id, name: 'Menu', type: 'webpage', size: 0, duration: 30, webpage_url: 'https://example.com/menu' } },
    { id: 'b67f4500-b2f4-4049-9a31-5433f14aad57', position: 1, display_duration: 20, media: { id: 'b67f4500-b2f4-4049-9a31-5433f14aad57', name: 'Next photo', type: 'image', size: 5, duration: null, download_url: 'https://example.com/photo.png' } },
  ] } };
  const view = render(<TVPlayer />);
  await waitFor(() => expect(view.container.querySelector('iframe')).not.toBeNull());
  const frame = view.container.querySelector('iframe');
  if (!frame) throw new Error('Missing webpage');
  await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
  fireEvent.load(frame);
  await act(async () => { await vi.advanceTimersByTimeAsync(59000); });
  expect(view.container.querySelector('iframe')).toBe(frame);
  expect(screen.queryByText(/Page Web indisponible/)).toBeNull();
  await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
  expect(await screen.findByRole('img', { name: 'Next photo' })).toBeVisible();
});
it('does not cut a loaded native webpage short when a late error arrives', async () => {
  const listeners: Array<(event: { session: string; state: 'loaded' | 'error' | 'back'; code?: string }) => void> = [];
  const sessions: string[] = [];
  const native = { open: vi.fn(async (o: { session: string }) => { sessions.push(o.session); }), close: vi.fn(async () => {}), reload: vi.fn(async () => {}), listen: vi.fn(async (cb: (typeof listeners)[number]) => { listeners.push(cb); return { remove: async () => {} }; }) };
  const mod = await import('@/player/webpage-native');
  vi.spyOn(mod, 'nativeWebpage').mockResolvedValue(native as never);
  const { WebpageStage } = await import('@/player/webpage-stage');
  const onError = vi.fn(); const onState = vi.fn();
  render(<WebpageStage url="https://example.com/menu" name="Menu" onError={onError} onState={onState} />);
  await waitFor(() => expect(sessions).toHaveLength(1));
  const session = sessions[0]!;
  act(() => listeners.forEach(cb => cb({ session, state: 'loaded' })));
  act(() => listeners.forEach(cb => cb({ session, state: 'error', code: 'timeout' })));
  expect(onError).not.toHaveBeenCalled();
  expect(native.close).not.toHaveBeenCalled();
  expect(onState).toHaveBeenLastCalledWith('playing');
});
it('still reports a native webpage that fails before it is shown', async () => {
  const listeners: Array<(event: { session: string; state: 'loaded' | 'error' | 'back'; code?: string }) => void> = [];
  const sessions: string[] = [];
  const native = { open: vi.fn(async (o: { session: string }) => { sessions.push(o.session); }), close: vi.fn(async () => {}), reload: vi.fn(async () => {}), listen: vi.fn(async (cb: (typeof listeners)[number]) => { listeners.push(cb); return { remove: async () => {} }; }) };
  const mod = await import('@/player/webpage-native');
  vi.spyOn(mod, 'nativeWebpage').mockResolvedValue(native as never);
  const { WebpageStage } = await import('@/player/webpage-stage');
  const onError = vi.fn();
  render(<WebpageStage url="https://example.com/menu" name="Menu" onError={onError} onState={vi.fn()} />);
  await waitFor(() => expect(sessions).toHaveLength(1));
  act(() => listeners.forEach(cb => cb({ session: sessions[0]!, state: 'error', code: 'net_-2' })));
  expect(onError).toHaveBeenCalledWith('net_-2');
});
