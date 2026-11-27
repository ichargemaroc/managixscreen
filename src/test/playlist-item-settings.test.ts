import { describe, expect, it } from 'vitest';
import { DEFAULT_ITEM_SCHEDULE, itemIsActive, itemScheduleSchema, type ItemSchedule } from '@/lib/playlist-item-settings';
import { duplicatePlaylistItem } from '@/lib/playlist-item-actions';
import { addLibraryItems } from '@/lib/media-playlist-items';

const daily: ItemSchedule = { ...DEFAULT_ITEM_SCHEDULE, timezone: 'UTC', daily: { enabled: true, start: '08:00', end: '18:00' } };
describe('individual playlist scheduling', () => {
  it('leaves unrestricted media available', () => expect(itemIsActive(null, Date.parse('2026-11-27T03:00:00Z'))).toBe(true));
  it('uses daily start inclusive and end exclusive', () => {
    expect(itemIsActive(daily, Date.parse('2026-11-27T07:59:59Z'))).toBe(false);
    expect(itemIsActive(daily, Date.parse('2026-11-27T08:00:00Z'))).toBe(true);
    expect(itemIsActive(daily, Date.parse('2026-11-27T18:00:00Z'))).toBe(false);
  });
  it('combines date range, weekdays and daily hours', () => {
    const schedule = { ...daily, periodic: { enabled: true, startDate: '2026-11-27', endDate: '2026-12-04', days: [4] } };
    expect(itemIsActive(schedule, Date.parse('2026-11-27T09:00:00Z'))).toBe(true);
    expect(itemIsActive(schedule, Date.parse('2026-11-28T09:00:00Z'))).toBe(false);
    expect(itemIsActive(schedule, Date.parse('2026-12-11T09:00:00Z'))).toBe(false);
  });
  it('interprets the selected timezone, not the TV timezone', () => {
    expect(itemIsActive({ ...daily, timezone: 'Africa/Casablanca' }, Date.parse('2026-11-27T07:00:00Z'))).toBe(true);
    expect(itemIsActive(daily, Date.parse('2026-11-27T07:00:00Z'))).toBe(false);
  });
  it('handles overnight slots using the starting date and weekday', () => {
    const schedule = { ...daily, daily: { enabled: true, start: '22:00', end: '02:00' }, periodic: { enabled: true, startDate: '2026-11-27', endDate: '2026-11-27', days: [4] } };
    expect(itemIsActive(schedule, Date.parse('2026-11-28T01:59:00Z'))).toBe(true);
    expect(itemIsActive(schedule, Date.parse('2026-11-28T02:00:00Z'))).toBe(false);
  });
  it('rejects invalid dates, timezone and enabled empty periods', () => {
    expect(itemScheduleSchema.safeParse({ ...daily, timezone: 'Invalid/Zone' }).success).toBe(false);
    expect(itemScheduleSchema.safeParse({ ...daily, periodic: { enabled: true, startDate: '2026-02-30', endDate: '2026-03-01', days: [0] } }).success).toBe(false);
    expect(itemScheduleSchema.safeParse({ ...daily, periodic: { enabled: true, startDate: '2026-12-01', endDate: '2026-11-27', days: [] } }).success).toBe(false);
  });
});
describe('explicit duplication', () => {
  it('copies the media and settings but gives each occurrence its own identity', () => {
    const original = { id: 'entry-a', mediaId: 'same-photo', duration: 10, schedule: daily, transition: 'zoom' as const };
    expect(duplicatePlaylistItem([original], 0, 'entry-b')).toEqual([original, { ...original, id: 'entry-b' }]);
  });
  it('ordinary library additions still prevent repeated media and retain existing copies', () => {
    const items = [{ mediaId: 'same-photo', duration: 10 }, { mediaId: 'same-photo', duration: 20 }];
    expect(addLibraryItems(items, [{ id: 'same-photo', type: 'image', duration: null }])).toEqual(items);
  });
});