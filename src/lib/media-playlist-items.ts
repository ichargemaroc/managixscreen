import type { Media, PlaylistItem } from './store';

// Keep existing ordering and durations; adding from the library never duplicates an item.
export function addLibraryItems(items: Pick<PlaylistItem, 'mediaId' | 'duration'>[], media: Pick<Media, 'id' | 'type' | 'duration'>[]) {
  const next = items.map(item => ({ ...item }));
  const present = new Set(items.map(item => item.mediaId));
  for (const item of media) {
    if (present.has(item.id)) continue;
    present.add(item.id);
    next.push({ mediaId: item.id, duration: item.type === 'image' ? 10 : Math.max(1, Math.round(item.duration ?? 10)) });
  }
  return next;
}

export function removeLibraryItems(items: Pick<PlaylistItem, 'mediaId' | 'duration'>[], ids: string[]) {
  const removed = new Set(ids);
  return items.filter(item => !removed.has(item.mediaId)).map(item => ({ ...item }));
}