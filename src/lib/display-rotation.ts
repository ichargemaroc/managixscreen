import { z } from 'zod';

export const DISPLAY_ROTATIONS = [0, 90, 180, 270] as const;
export const displayRotationSchema = z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]);
export type DisplayRotation = z.infer<typeof displayRotationSchema>;

// The surface has logical dimensions before being turned into the physical viewport.
export function displayDimensions(width: number, height: number, rotation: DisplayRotation) {
  return rotation === 90 || rotation === 270 ? { width: height, height: width } : { width, height };
}