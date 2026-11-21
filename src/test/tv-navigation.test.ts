import { afterEach, expect, it, vi } from 'vitest';
import { nextFocusIndex, subscribePlayerBack } from '@/player/tv-navigation';

const app = vi.hoisted(() => ({ addListener: vi.fn(), exitApp: vi.fn() }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock('@capacitor/app', () => ({ App: app }));
afterEach(() => vi.resetAllMocks());
it('moves forward with right/down and backwards with left/up, wrapping both ends', () => {
  expect(nextFocusIndex(0, 4, 1)).toBe(1);
  expect(nextFocusIndex(1, 4, -1)).toBe(0);
  expect(nextFocusIndex(0, 4, -1)).toBe(3);
  expect(nextFocusIndex(3, 4, 1)).toBe(0);
});
it('handles no controls and an initially unfocused screen', () => {
  expect(nextFocusIndex(-1, 0, 1)).toBe(-1);
  expect(nextFocusIndex(-1, 4, 1)).toBe(0);
  expect(nextFocusIndex(-1, 4, -1)).toBe(3);
});
it('Android Back closes open controls, then exits at root without erasing identity', async () => {
  let callback: (() => void) | undefined;
  const remove = vi.fn();
  app.addListener.mockImplementation(async (_name: string, handler: () => void) => { callback = handler; return { remove }; });
  let overlay = true;
  const cleanup = await subscribePlayerBack(() => { const wasOpen = overlay; overlay = false; return wasOpen; });
  callback?.(); expect(app.exitApp).not.toHaveBeenCalled();
  callback?.(); expect(app.exitApp).toHaveBeenCalledTimes(1);
  cleanup(); expect(remove).toHaveBeenCalledTimes(1);
});