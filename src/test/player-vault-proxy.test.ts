import { afterEach, expect, it, vi } from 'vitest';
import { readCredentials, saveCredentials } from '@/player/platform';

const native = vi.hoisted(() => ({
  read: vi.fn(), write: vi.fn(), clear: vi.fn(), unexpected: vi.fn(),
}));
// Capacitor supplies a method for every property, including `then`.
// Promise resolution must never receive the plugin proxy itself.
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, isPluginAvailable: () => true },
  registerPlugin: () => new Proxy({}, {
    get: (_, property) => {
      if (property === 'read') return native.read;
      if (property === 'write') return native.write;
      if (property === 'clear') return native.clear;
      return (...args: unknown[]) => { native.unexpected(property, ...args); };
    },
  }),
}));

afterEach(() => { vi.useRealTimers(); vi.resetAllMocks(); localStorage.clear(); });

it('reads and saves through a Capacitor proxy without invoking its synthetic then method', async () => {
  vi.useFakeTimers();
  const identity = { device_id: 'a67f4500-b2f4-4049-9a31-5433f14aad57', device_token: 'a'.repeat(64), pairing_code: '123456', expires_at: 1, paired: true };
  native.read.mockResolvedValue({ value: JSON.stringify(identity) });
  native.write.mockResolvedValue(undefined);
  native.clear.mockResolvedValue(undefined);
  const result = Promise.race([
    (async () => {
      const stored = await readCredentials();
      await saveCredentials(identity);
      await saveCredentials(null);
      return stored;
    })(),
    new Promise<string>(resolve => setTimeout(() => resolve('bridge stalled'), 6000)),
  ]);
  await vi.advanceTimersByTimeAsync(6000);
  expect(await result).toEqual(identity);
  expect(native.read).toHaveBeenCalledOnce();
  expect(native.write).toHaveBeenCalledWith({ value: JSON.stringify(identity) });
  expect(native.clear).toHaveBeenCalledOnce();
  expect(native.unexpected).not.toHaveBeenCalled();
});