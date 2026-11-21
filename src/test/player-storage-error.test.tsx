import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { TVPlayer } from '@/player/player';
const mocks = vi.hoisted(() => ({ api: vi.fn(), save: vi.fn() }));
vi.mock('@/player/platform', () => ({
  readCredentials: async () => { throw new Error('Keystore unavailable'); },
  saveCredentials: mocks.save, subscribeNetwork: async () => () => {}, keepAwake: async () => () => {}, enterPlayerMode: vi.fn(),
}));
vi.mock('@/player/protocol', async original => ({ ...await original<typeof import('@/player/protocol')>(), deviceApi: mocks.api }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('does not re-enroll or overwrite a paired terminal when the secure vault cannot be read', async () => {
  render(<TVPlayer />);
  await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  expect(mocks.api).not.toHaveBeenCalled();
  expect(mocks.save).not.toHaveBeenCalled();
});