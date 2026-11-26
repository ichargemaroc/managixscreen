export type MediaFilters = { imported: string; types: string[] };
export const emptyMediaFilters: MediaFilters = { imported: 'all', types: [] };

export function matchesMediaFilters(media: { type: string; createdAt: string }, filters: MediaFilters, now: Date) {
  if (filters.types.length && !filters.types.includes(media.type)) return false;
  if (filters.imported === 'all') return true;
  const start = new Date(now);
  if (filters.imported === 'today') start.setHours(0, 0, 0, 0);
  else if (filters.imported === 'week') start.setDate(start.getDate() - 7);
  else if (filters.imported === 'month') start.setDate(start.getDate() - 30);
  else return true;
  const imported = Date.parse(media.createdAt);
  return Number.isFinite(imported) && imported >= start.getTime() && imported <= now.getTime();
}