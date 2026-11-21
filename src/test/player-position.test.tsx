import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { TVPlayer } from '@/player/player';

const id = 'a67f4500-b2f4-4049-9a31-5433f14aad57';
const mocks = vi.hoisted(() => ({ api: vi.fn(), receipt: vi.fn() }));
vi.mock('@/player/platform', () => ({
  readCredentials: async () => ({ device_id: 'a67f4500-b2f4-4049-9a31-5433f14aad57', device_token: 'a'.repeat(64), paired: true }),
  saveCredentials: vi.fn(), subscribeNetwork: async () => () => {}, keepAwake: async () => () => {}, enterPlayerMode: vi.fn(),
}));
vi.mock('@/player/cache', () => ({ readContent: async () => null, commandReceipt: async () => null, saveReceipt: mocks.receipt, downloadContent: vi.fn(), cachedMedia: vi.fn(), clearMediaCache: vi.fn() }));
vi.mock('@/player/protocol', async original => ({ ...await original<typeof import('@/player/protocol')>(), deviceApi: mocks.api }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('renders the real assigned number and acknowledges it without waiting for a stalled content download', async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  const ackId = 'b67f4500-b2f4-4049-9a31-5433f14aad57';
  const expires = new Date(Date.now() + 60_000).toISOString();
  mocks.api.mockImplementation(async (operation: string) => {
    if (operation === 'content') return new Promise(() => {});
    if (operation === 'commands') return { server_time: new Date().toISOString(), commands: [{ id: ackId, command: 'position_test', expires_at: expires, payload: { wall_id: id, test_id: id, wall_name: 'Mur principal', screen_name: 'Télévision droite', columns: 3, row_index: 1, column_index: 2, number: 6, expires_at: expires } }] };
    return {};
  });
  render(<TVPlayer/>);
  await waitFor(() => expect(mocks.api).toHaveBeenCalledWith('commands/ack', expect.any(Object), { command_id: ackId, status: 'completed' }));
  expect(screen.getByRole('region', { name: 'Test de position' })).toHaveTextContent('6');
  expect(screen.getByRole('region', { name: 'Test de position' })).toHaveTextContent('LIGNE 2 — COLONNE 3');
  expect(mocks.receipt).toHaveBeenCalledWith(ackId, { status: 'completed' });
});