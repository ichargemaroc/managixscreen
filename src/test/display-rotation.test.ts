import { describe, expect, it } from 'vitest';
import { displayDimensions, displayRotationSchema } from '@/lib/display-rotation';
import { contentSchema } from '@/player/protocol';
import { manifestSchema } from '@/lib/player-protocol';

const id = 'a67f4500-b2f4-4049-9a31-5433f14aad57';
const base = { screen_id: id, assignment_updated_at: '2026-11-24T00:00:00Z', last_sync_at: '2026-11-24T00:00:00Z', playlist: null };

describe('physical display rotation', () => {
  it.each([0, 90, 180, 270] as const)('accepts %i degrees and preserves it through both manifests', rotation => {
    expect(displayRotationSchema.parse(rotation)).toBe(rotation);
    expect(manifestSchema.parse({ ...base, display_rotation: rotation }).display_rotation).toBe(rotation);
    expect(contentSchema.parse({ ...base, display_rotation: rotation }).display_rotation).toBe(rotation);
  });
  it('defaults older server and offline manifests to standard orientation', () => {
    expect(manifestSchema.parse(base).display_rotation).toBe(0);
    expect(contentSchema.parse(base).display_rotation).toBe(0);
  });
  it.each([-90, 45, 360, '90', null])('rejects unsupported rotation %s', rotation => {
    expect(displayRotationSchema.safeParse(rotation).success).toBe(false);
    expect(contentSchema.safeParse({ ...base, display_rotation: rotation }).success).toBe(false);
  });
  it.each([90, 270] as const)('swaps logical viewport dimensions at %i degrees without stretching', rotation => {
    expect(displayDimensions(1920, 1080, rotation)).toEqual({ width: 1080, height: 1920 });
  });
  it.each([0, 180] as const)('keeps landscape dimensions at %i degrees', rotation => {
    expect(displayDimensions(1920, 1080, rotation)).toEqual({ width: 1920, height: 1080 });
  });
});