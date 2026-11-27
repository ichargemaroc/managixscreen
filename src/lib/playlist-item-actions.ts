export function changePlaylistItem<T>(items: readonly T[], index: number, action: 'up' | 'down' | 'remove'): T[] {
  const next = [...items];
  if (index < 0 || index >= next.length) return next;
  if (action === 'remove') return next.filter((_, position) => position !== index);
  const target = index + (action === 'up' ? -1 : 1);
  if (target < 0 || target >= next.length) return next;
  const [item] = next.splice(index, 1);
  if (item !== undefined) next.splice(target, 0, item);
  return next;
}