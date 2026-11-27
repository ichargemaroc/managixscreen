import { describe, expect, it } from 'vitest';
import { changePlaylistItem } from '@/lib/playlist-item-actions';

describe('playlist item actions', () => {
  const items = [{ mediaId: 'photo-a', duration: 10 }, { mediaId: 'photo-b', duration: 20 }, { mediaId: 'photo-c', duration: 30 }];
  it('moves a photo up without duplicating it or changing durations', () => {
    expect(changePlaylistItem(items, 1, 'up')).toEqual([items[1], items[0], items[2]]);
    expect(items.map((item) => item.mediaId)).toEqual(['photo-a', 'photo-b', 'photo-c']);
  });
  it('moves a photo down', () => {
    expect(changePlaylistItem(items, 1, 'down')).toEqual([items[0], items[2], items[1]]);
  });
  it('does not move beyond playlist boundaries', () => {
    expect(changePlaylistItem(items, 0, 'up')).toEqual(items);
    expect(changePlaylistItem(items, 2, 'down')).toEqual(items);
  });
  it('removes only the selected photo from the playlist', () => {
    expect(changePlaylistItem(items, 1, 'remove')).toEqual([items[0], items[2]]);
  });
});