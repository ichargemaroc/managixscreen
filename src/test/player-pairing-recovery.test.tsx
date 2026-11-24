import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { TVPlayer } from '@/player/player';

const identity = vi.hoisted(() => ({ device_id: 'a67f4500-b2f4-4049-9a31-5433f14aad57', device_token: 'a'.repeat(64), pairing_code: '123456', expires_at: 1, paired: false }));
const mocks = vi.hoisted(() => ({ api: vi.fn(), save: vi.fn() }));
vi.mock('@/player/platform', () => ({
  readCredentials: async () => identity, saveCredentials: mocks.save,
  subscribeNetwork: async () => () => {}, keepAwake: async () => () => {}, enterPlayerMode: vi.fn(),
}));
vi.mock('@/player/cache', () => ({ readContent: async () => null, downloadContent: vi.fn(), clearMediaCache: vi.fn(), cachedMedia: vi.fn(), commandReceipt: vi.fn(), saveReceipt: vi.fn(), saveEntitlement: vi.fn() }));
vi.mock('@/player/protocol', async original => ({ ...await original<typeof import('@/player/protocol')>(), deviceApi: mocks.api }));
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.restoreAllMocks(); vi.useRealTimers(); });

it('recovers the existing server pairing after an update interrupted local confirmation, even when the code expired', async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  mocks.api.mockImplementation(async (operation: string) => {
    if (operation === 'status') return { status: 'paired', paired: true };
    if (operation === 'content') throw new Error('Temporarily unavailable');
    return { commands: [] };
  });
  render(<TVPlayer />);
  await waitFor(() => expect(mocks.save).toHaveBeenCalledWith({ ...identity, paired: true }));
  expect(mocks.api).toHaveBeenCalledWith('status', identity);
  expect(mocks.api.mock.calls.some(([operation]) => operation === 'request')).toBe(false);
});

it('does not create a new identity for a genuinely expired unclaimed code and bounds status checks', async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  mocks.api.mockResolvedValue({ status: 'expired', paired: false });
  vi.useFakeTimers();
  render(<TVPlayer />);
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  expect(mocks.api).toHaveBeenCalledWith('status', identity);
  await act(async () => { await vi.advanceTimersByTimeAsync(16000); });
  expect(mocks.api).toHaveBeenCalledTimes(1);
  expect(mocks.save).not.toHaveBeenCalled();
  expect(mocks.api.mock.calls.some(([operation]) => operation === 'request')).toBe(false);
});