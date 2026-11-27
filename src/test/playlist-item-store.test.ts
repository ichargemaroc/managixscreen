import { expect, it, vi } from 'vitest';
import { DEFAULT_ITEM_SCHEDULE } from '@/lib/playlist-item-settings';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: mocks }));
import { savePlaylistItems } from '@/lib/store';

it('preserves explicit copies and their independent settings in the transactional save', async () => {
  mocks.rpc.mockResolvedValue({ error: null });
  mocks.from.mockReturnValue({ select: () => ({ eq: async () => ({ data: [] }) }) });
  const items = [
    { id: 'entry-a', mediaId: 'photo', duration: 10, schedule: DEFAULT_ITEM_SCHEDULE, transition: 'zoom' as const },
    { id: 'entry-b', mediaId: 'photo', duration: 20, schedule: null, transition: 'fade' as const },
  ];
  await savePlaylistItems('playlist', items);
  expect(mocks.rpc).toHaveBeenCalledWith('replace_playlist_items', { p_playlist_id: 'playlist', p_items: items });
});