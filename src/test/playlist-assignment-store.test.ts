import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), command: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock('@/lib/player.functions', () => ({ enqueueCommand: mocks.command }));
import { replacePlaylistAssignments } from '@/lib/store';
beforeEach(() => { vi.resetAllMocks(); mocks.command.mockResolvedValue(undefined); });
it('removes all assignments with an empty selection and refreshes removed TVs', async () => {
  mocks.rpc.mockResolvedValue({ data: { count: 0, screen_ids: ['tv-a'] }, error: null });
  expect(await replacePlaylistAssignments('playlist-a', [], [])).toBe(0);
  expect(mocks.rpc).toHaveBeenCalledWith('replace_playlist_assignments', { p_playlist:'playlist-a',p_groups:[],p_screens:[] });
  expect(mocks.command).toHaveBeenCalledWith({ data: {screenId:'tv-a',command:'refresh_content'} });
});
it('deduplicates selected IDs before the transactional replacement', async () => {
  mocks.rpc.mockResolvedValue({ data: { count: 1, screen_ids: [] }, error: null });
  expect(await replacePlaylistAssignments('playlist-a', ['g','g'], ['tv','tv'])).toBe(1);
  expect(mocks.rpc).toHaveBeenCalledWith('replace_playlist_assignments', { p_playlist:'playlist-a',p_groups:['g'],p_screens:['tv'] });
});
it('does not refresh any TV if assignment is refused', async () => {
  mocks.rpc.mockResolvedValue({ error: new Error('Forbidden') });
  await expect(replacePlaylistAssignments('playlist-a', [], [])).rejects.toThrow('L’affectation n’a pas pu être enregistrée.');
  expect(mocks.command).not.toHaveBeenCalled();
});