import { afterEach, expect, it, vi } from 'vitest';
import { readCredentials, saveCredentials } from '@/player/platform';

const vault = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), clear: vi.fn() }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true }, registerPlugin: () => vault }));
const key = 'screenflow-player-identity';
const identity = { device_id: 'a67f4500-b2f4-4049-9a31-5433f14aad57', device_token: 'a'.repeat(64), pairing_code: '123456', expires_at: 1, paired: true };
afterEach(() => { localStorage.clear(); vi.resetAllMocks(); });

it('never stores native credentials in plaintext when the secure write fails', async () => {
  vault.write.mockRejectedValue(new Error('Unavailable'));
  await expect(saveCredentials(identity)).rejects.toThrow('Unavailable');
  expect(localStorage.getItem(key)).toBeNull();
});
it('does not return plaintext credentials if the native vault cannot be read', async () => {
  localStorage.setItem(key, JSON.stringify(identity));
  vault.read.mockRejectedValue(new Error('Unavailable'));
  await expect(readCredentials()).rejects.toThrow('Unavailable');
  expect(vault.write).not.toHaveBeenCalled();
});
it('migrates the old fallback into the Keystore vault before deleting plaintext', async () => {
  localStorage.setItem(key, JSON.stringify(identity)); vault.read.mockResolvedValue({}); vault.write.mockResolvedValue(undefined);
  expect(await readCredentials()).toEqual(identity);
  expect(vault.write).toHaveBeenCalledWith({ value: JSON.stringify(identity) });
  expect(localStorage.getItem(key)).toBeNull();
});
it('does not report a successful revocation if the native vault could not be cleared', async () => {
  vault.clear.mockRejectedValue(new Error('Unavailable'));
  await expect(saveCredentials(null)).rejects.toThrow('Unavailable');
});