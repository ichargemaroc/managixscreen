import { z } from 'zod';

export const TICKER_SPEEDS = [15, 30, 45, 60] as const;
export const tickerSchema = z.object({
  enabled: z.boolean(),
  text: z.string().trim().max(500),
  mode: z.enum(['loop', 'once']),
  seconds: z.number().int().min(5).max(300),
});
export type Ticker = z.infer<typeof tickerSchema>;
export const DEFAULT_TICKER: Ticker = { enabled: false, text: '', mode: 'loop', seconds: 30 };

/** Parses stored or received ticker settings; invalid data never breaks playback. */
export function parseTicker(value: unknown): Ticker {
  const parsed = tickerSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_TICKER;
}

/** A ticker is shown only when enabled and it has text to display. */
export function tickerVisible(ticker: Ticker | null | undefined): ticker is Ticker {
  return Boolean(ticker?.enabled && ticker.text.trim());
}
