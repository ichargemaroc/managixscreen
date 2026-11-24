import { act, cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { WebpageStage } from '@/player/webpage-stage';
import type { WebpageEvent } from '@/player/webpage-native';

const native = vi.hoisted(() => ({ open: vi.fn(), close: vi.fn(), reload: vi.fn(), remove: vi.fn(), callback: null as ((event: WebpageEvent) => void) | null }));
vi.mock('@/player/webpage-native', () => ({ nativeWebpage: async () => ({ open: native.open, close: native.close, reload: native.reload, listen: async (cb: (event: WebpageEvent) => void) => { native.callback = cb; return { remove: native.remove }; } }) }));
afterEach(() => { cleanup(); vi.resetAllMocks(); vi.useRealTimers(); });
it('opens an isolated native surface, handles Back and removes it before returning to media', async () => {
  native.open.mockResolvedValue(undefined); native.close.mockResolvedValue(undefined);
  const error = vi.fn(); const state = vi.fn();
  const view = render(<WebpageStage url="https://example.com" name="Site" onError={error} onState={state} />);
  await act(async () => {});
  expect(native.open).toHaveBeenCalledWith({ url: 'https://example.com/', session: expect.any(String), fullscreen: true, timeoutMs: 15000 });
  const options = native.open.mock.calls[0]?.[0] as { session: string } | undefined;
  if (!options) throw new Error('Native open not called');
  await act(async () => { native.callback?.({ session: options.session, state: 'loaded' }); });
  expect(state).toHaveBeenLastCalledWith('playing');
  await act(async () => { native.callback?.({ session: options.session, state: 'back' }); });
  expect(error).toHaveBeenCalledTimes(1); expect(native.close).toHaveBeenCalledWith(options.session);
  view.unmount(); expect(native.remove).toHaveBeenCalled();
});
it('closes a stalled native page after fifteen seconds rather than leaving it over the playlist', async () => {
  vi.useFakeTimers(); native.open.mockResolvedValue(undefined); native.close.mockResolvedValue(undefined);
  const error = vi.fn(); render(<WebpageStage url="https://example.com" name="Site" onError={error} onState={() => {}} />);
  await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
  expect(error).toHaveBeenCalledTimes(1); expect(native.close).toHaveBeenCalled();
});
it('repositions a native zone when rotation changes and closes only its previous session', async () => {
  native.open.mockResolvedValue(undefined); native.close.mockResolvedValue(undefined);
  const rectangle = { x: 0, y: 0, width: 0.5, height: 1 };
  const view = render(<WebpageStage url="https://example.com" name="Site" rotation={90} rectangle={rectangle} onError={() => {}} onState={() => {}} />);
  await act(async () => {});
  expect(native.open).toHaveBeenLastCalledWith(expect.objectContaining({ rotation: 90, rectangle }));
  const previous = native.open.mock.calls[0]?.[0] as { session: string } | undefined;
  if (!previous) throw new Error('Native zone missing');
  view.rerender(<WebpageStage url="https://example.com" name="Site" rotation={270} rectangle={{ ...rectangle }} onError={() => {}} onState={() => {}} />);
  await act(async () => {});
  expect(native.close).toHaveBeenCalledWith(previous.session);
  expect(native.open).toHaveBeenLastCalledWith(expect.objectContaining({ rotation: 270, rectangle }));
  const count = native.open.mock.calls.length;
  view.rerender(<WebpageStage url="https://example.com" name="Site" rotation={270} rectangle={{ ...rectangle }} onError={() => {}} onState={() => {}} />);
  await act(async () => {});
  expect(native.open).toHaveBeenCalledTimes(count);
});