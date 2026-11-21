import { z } from 'zod';

export const DEFAULT_POSITION_TEST_SECONDS = 60;
export const positionPayloadSchema = z.object({
  wall_id: z.string().uuid(), test_id: z.string().uuid(), wall_name: z.string().max(120), screen_name: z.string().max(120),
  row_index: z.number().int().min(0).max(7), column_index: z.number().int().min(0).max(7), columns: z.number().int().min(1).max(8),
  number: z.number().int().min(1).max(64), expires_at: z.string().datetime({ offset: true }),
}).refine(p => p.column_index < p.columns && p.number === positionNumber(p.row_index, p.column_index, p.columns), 'Position invalide');
export type PositionTest = z.infer<typeof positionPayloadSchema> & { deadline: number };
export function positionNumber(row: number, column: number, columns: number) { return row * columns + column + 1; }
export function positionColor(number: number) { return `position-color-${(number - 1) % 6}`; }
export function receivedPositionTest(payload: unknown, remainingMs: number, now = Date.now()): PositionTest {
  const parsed = positionPayloadSchema.parse(payload);
  if (remainingMs <= 0) throw new Error('Test expiré');
  return { ...parsed, deadline: now + Math.min(300_000, remainingMs) };
}