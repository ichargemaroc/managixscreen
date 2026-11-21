import { expect, it } from 'vitest';
import { moveWallMedia, wallMediaRect, wallConfigSchema } from '@/lib/video-wall';
it('converts a mouse drag into wall-relative coordinates', () => {
  expect(moveWallMedia({ media_x: 0, media_y: 0 }, 100, -50, 500, 250)).toEqual({ media_x: 0.2, media_y: -0.2 });
});
it('applies the same placement to the actual globally cropped player media', () => {
  expect(wallMediaRect({ width: 4000, height: 2000, media_x: 0.25, media_y: -0.1 }, 1000, 1000)).toEqual({ x: 2000, y: -200, width: 2000, height: 2000 });
});
it('bounds placement and rejects out-of-range saved values', () => {
  expect(moveWallMedia({ media_x: 0, media_y: 0 }, 1000, -1000, 100, 100)).toEqual({ media_x: 1, media_y: -1 });
  expect(wallConfigSchema.safeParse({ name: 'Mur', columns: 1, rows: 1, width: 1920, height: 1080, gap_x: 0, gap_y: 0, orientation: 'landscape', media_id: null, media_x: 1.1 }).success).toBe(false);
});
it('resizes width and height by the same multiplier without deforming the image', () => {
  const rect = wallMediaRect({ width: 4000, height: 2000, media_scale: 1.5 }, 1600, 900);
  expect(rect.width).toBeCloseTo(5333.333333);
  expect(rect.height).toBe(3000);
  expect(rect.width / rect.height).toBeCloseTo(1600 / 900);
});
it('reduces proportionally while keeping the positioned center fixed', () => {
  const rect = wallMediaRect({ width: 4000, height: 2000, media_x: 0.25, media_y: -0.1, media_scale: 0.5 }, 1000, 1000);
  expect(rect).toEqual({ x: 2500, y: 300, width: 1000, height: 1000 });
});
it('accepts saved scales and legacy manifests but rejects invalid scales', () => {
  const config = { name: 'Mur', columns: 1, rows: 1, width: 1920, height: 1080, gap_x: 0, gap_y: 0, orientation: 'landscape', media_id: null };
  expect(wallConfigSchema.safeParse(config).success).toBe(true);
  expect(wallConfigSchema.parse({ ...config, media_scale: 1.5 }).media_scale).toBe(1.5);
  for (const media_scale of [0, 0.09, 3.01, Infinity, NaN]) expect(wallConfigSchema.safeParse({ ...config, media_scale }).success).toBe(false);
});