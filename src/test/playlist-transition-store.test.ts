import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), update: vi.fn(), eq: vi.fn(), single: vi.fn(), select: vi.fn(), command: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));
vi.mock('@/lib/player.functions', () => ({ enqueueCommand: mocks.command }));
import { savePlaylistTransition } from '@/lib/store';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.from.mockImplementation((table: string) => table === 'playlists' ? { update: mocks.update } : { select: mocks.select });
  mocks.update.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ select: () => ({ single: mocks.single }) });
  mocks.single.mockResolvedValue({ data: { id: 'playlist-a' }, error: null });
  mocks.select.mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [{ id: 'tv-a' }, { id: 'tv-b' }], error: null }) });
  mocks.command.mockResolvedValue(undefined);
});

it('stores Zoom on the playlist and refreshes every assigned TV', async () => {
  await savePlaylistTransition('playlist-a', 'zoom');
  expect(mocks.from).toHaveBeenCalledWith('playlists');
  expect(mocks.update).toHaveBeenCalledWith({ slide_transition: 'zoom' });
  expect(mocks.eq).toHaveBeenCalledWith('id', 'playlist-a');
  expect(mocks.command).toHaveBeenCalledTimes(2);
  for (const screenId of ['tv-a', 'tv-b']) expect(mocks.command).toHaveBeenCalledWith({ data: { screenId, command: 'refresh_content' } });
});

it('does not refresh TVs if the playlist write is refused', async () => {
  mocks.single.mockResolvedValue({ error: new Error('Forbidden') });
  await expect(savePlaylistTransition('playlist-a', 'zoom')).rejects.toThrow('L’animation n’a pas pu être enregistrée.');
  expect(mocks.command).not.toHaveBeenCalled();
});