import { z } from 'zod';

const HEX = /^#[0-9a-fA-F]{6}$/;
export const TICKER_SPEEDS = [15, 30, 45, 60] as const;
export const tickerSchema = z.object({
  enabled: z.boolean(),
  text: z.string().trim().max(500),
  mode: z.enum(['loop', 'once']),
  seconds: z.number().int().min(5).max(300),
  height: z.number().min(4).max(20).default(7),
  background: z.string().regex(HEX).default('#000000'),
  opacity: z.number().int().min(0).max(100).default(75),
  textSize: z.number().min(2).max(10).default(3.6),
  textColor: z.string().regex(HEX).default('#ffffff'),
});
export type Ticker = z.infer<typeof tickerSchema>;
export const DEFAULT_TICKER: Ticker = { enabled: false, text: '', mode: 'loop', seconds: 30, height: 7, background: '#000000', opacity: 75, textSize: 3.6, textColor: '#ffffff' };

/** Parses stored or received ticker settings; invalid data never breaks playback. */
export function parseTicker(value: unknown): Ticker {
  const parsed = tickerSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_TICKER;
}

/** A ticker is shown only when enabled and it has text to display. */
export function tickerVisible(ticker: Ticker | null | undefined): ticker is Ticker {
  return Boolean(ticker?.enabled && ticker.text.trim());
}

/** Banner background with the chosen opacity applied (hex + alpha). */
export function tickerBackground(t: Ticker): string {
  return t.background + Math.round((t.opacity / 100) * 255).toString(16).padStart(2, '0');
}
