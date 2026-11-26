import { describe, expect, it } from 'vitest';
import { mediaPage } from '@/lib/media-pagination';

describe('media pagination', () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1);
  it('shows twelve items per page without duplicates or gaps', () => {
    expect(mediaPage(items, 1).items).toEqual(items.slice(0, 12));
    expect(mediaPage(items, 2).items).toEqual(items.slice(12, 24));
    expect(mediaPage(items, 3).items).toEqual([25]);
    expect(mediaPage(items, 1).pages).toBe(3);
  });
  it('clamps pages after filtering or deleting the final item', () => {
    expect(mediaPage([1], 3)).toMatchObject({ page: 1, pages: 1, items: [1] });
    expect(mediaPage([], 2)).toMatchObject({ page: 1, pages: 1, items: [] });
  });
});