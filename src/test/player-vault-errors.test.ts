import { expect, it } from 'vitest';
import { vaultErrorMessage } from '@/player/vault-errors';

it('never exposes native exception content or arbitrary codes', () => {
  const secret = 'private-device-token';
  const message = vaultErrorMessage({ code: secret, message: secret });
  expect(message).not.toContain(secret);
  expect(message).toContain('VAULT_UNKNOWN');
});
it('preserves the fixed Android diagnostic code without exposing its message', () => {
  const message = vaultErrorMessage({ code: 'VAULT_READ_FAILED', message: 'private-device-token' });
  expect(message).toContain('VAULT_READ_FAILED');
  expect(message).not.toContain('private-device-token');
});