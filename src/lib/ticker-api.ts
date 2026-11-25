import { z } from 'zod';

/** Body accepted from external apps updating a playlist banner text. */
export const tickerApiBody = z.object({ text: z.string().max(500), enabled: z.boolean().optional() }).strict();

export function bearerToken(header: string | null): string | null {
  const m = /^Bearer\s+([a-f0-9]{64})$/i.exec(header?.trim() ?? '');
  return m?.[1]?.toLowerCase() ?? null;
}
