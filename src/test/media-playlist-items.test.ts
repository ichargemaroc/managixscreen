import { describe, expect, it } from 'vitest';
import { addLibraryItems, removeLibraryItems } from '../lib/media-playlist-items';

describe('library playlist actions', () => {
  it('never adds the same media twice and preserves existing duration and order', () => {
    const items = [{ mediaId: 'first', duration: 23 }];
    expect(addLibraryItems(items, [
      { id: 'first', type: 'image', duration: null },
      { id: 'new', type: 'image', duration: null },
      { id: 'new', type: 'image', duration: null },
    ])).toEqual([{ mediaId: 'first', duration: 23 }, { mediaId: 'new', duration: 10 }]);
    expect(items).toEqual([{ mediaId: 'first', duration: 23 }]);
  });
  it('retains video duration when adding to a playlist', () => {
    expect(addLibraryItems([], [{ id: 'video', type: 'video', duration: 20 }])).toEqual([{ mediaId: 'video', duration: 20 }]);
  });
  it('removes only selected media without deleting or reordering remaining items', () => {
    expect(removeLibraryItems([{ mediaId: 'a', duration: 5 }, { mediaId: 'b', duration: 7 }, { mediaId: 'c', duration: 12 }], ['b']))
      .toEqual([{ mediaId: 'a', duration: 5 }, { mediaId: 'c', duration: 12 }]);
  });
});