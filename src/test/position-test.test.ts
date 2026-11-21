import { describe, expect, it } from 'vitest';
import { DEFAULT_POSITION_TEST_SECONDS, positionNumber, receivedPositionTest } from '@/lib/position-test';

const id = 'a67f4500-b2f4-4049-9a31-5433f14aad57';
const payload = { wall_id: id, test_id: id, wall_name: 'Mur', screen_name: 'TV', columns: 3, row_index: 1, column_index: 2, number: 6, expires_at: '2026-11-21T15:00:00Z' };
describe('Position tests', () => {
  it('numbers left to right then top to bottom: row 2 column 3 is 6', () => {
    expect(positionNumber(1, 2, 3)).toBe(6);
    expect(Array.from({length: 6}, (_, i) => positionNumber(Math.floor(i / 3), i % 3, 3))).toEqual([1, 2, 3, 4, 5, 6]);
  });
  it('defaults to exactly 60 seconds', () => { expect(DEFAULT_POSITION_TEST_SECONDS).toBe(60); });
  it('returns to normal after the remaining duration, never a new full minute', () => {
    expect(receivedPositionTest(payload, 17_000, 1_000).deadline).toBe(18_000);
  });
  it('rejects a test whose server expiry has passed', () => { expect(() => receivedPositionTest(payload, 0)).toThrow(); });
  it('rejects inconsistent real cell numbers', () => { expect(() => receivedPositionTest({...payload, number: 5}, 60_000)).toThrow(); });
  it('caps any received test at five minutes', () => { expect(receivedPositionTest(payload, 900_000, 1_000).deadline).toBe(301_000); });
});