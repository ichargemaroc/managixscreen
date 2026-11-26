import { z } from 'zod';

export const storageReportSchema = z.object({
  storage_total_bytes: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  storage_available_bytes: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  storage_source: z.enum(['device', 'browser']),
}).refine((value) => value.storage_available_bytes <= value.storage_total_bytes);
export type StorageReport = z.infer<typeof storageReportSchema>;

export function parseStorageReport(value: unknown): StorageReport | null {
  const result = storageReportSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function formatStorageBytes(bytes: number): string {
  const unit = bytes >= 1024 ** 3 ? 'Go' : 'Mo';
  const divisor = unit === 'Go' ? 1024 ** 3 : 1024 ** 2;
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(bytes / divisor)} ${unit}`;
}