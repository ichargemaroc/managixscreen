import { describe, expect, it } from 'vitest';
import { emptyMediaFilters, matchesMediaFilters } from '@/lib/media-filters';

describe('media filters', () => {
  const now = new Date(2026, 10, 26, 21, 48);
  const photo = { type: 'image', createdAt: new Date(2026, 10, 26, 12).toISOString() };
  it('keeps all media when reset', () => {
    expect(matchesMediaFilters(photo, emptyMediaFilters, now)).toBe(true);
  });
  it('combines selected types without duplicates and excludes other types', () => {
    const filters = { imported: 'all', types: ['image', 'video'] };
    expect(matchesMediaFilters(photo, filters, now)).toBe(true);
    expect(matchesMediaFilters({ ...photo, type: 'video' }, filters, now)).toBe(true);
    expect(matchesMediaFilters({ ...photo, type: 'webpage' }, filters, now)).toBe(false);
  });
  it('filters today using local midnight', () => {
    const filters = { imported: 'today', types: [] };
    expect(matchesMediaFilters(photo, filters, now)).toBe(true);
    expect(matchesMediaFilters({ ...photo, createdAt: new Date(2026, 10, 25, 23, 59).toISOString() }, filters, now)).toBe(false);
  });
  it.each([['week', 7], ['month', 30]] as const)('filters the last %s inclusively', (imported, days) => {
    const boundary = new Date(now);
    boundary.setDate(boundary.getDate() - days);
    const filters = { imported, types: [] };
    expect(matchesMediaFilters({ ...photo, createdAt: boundary.toISOString() }, filters, now)).toBe(true);
    expect(matchesMediaFilters({ ...photo, createdAt: new Date(boundary.getTime() - 1).toISOString() }, filters, now)).toBe(false);
    expect(matchesMediaFilters({ ...photo, createdAt: 'invalid' }, filters, now)).toBe(false);
  });
});