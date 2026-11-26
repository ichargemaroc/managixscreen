import { z } from "zod";

export const publicPricingSchema = z.object({
  currency: z.string().nullable(),
  annual_discount_percent: z.number().nullable(),
  trial_days: z.number().nullable(),
  trial_capacity: z.number().nullable(),
  founders: z.object({ limit: z.number(), remaining: z.number(), discount_percent: z.number(), months: z.number() }).nullable().optional(),
  plans: z.array(z.object({ id: z.string(), name: z.string(), capacity: z.number(), monthly_amount: z.number(), features: z.array(z.string()).default([]), comparison: z.object({ playlists: z.string().optional(), web: z.boolean().optional(), groups: z.boolean().optional(), walls: z.boolean().optional() }).default({}), quote_only: z.boolean().default(false) })),
});
export type PublicPricing = z.infer<typeof publicPricingSchema>;

/** Amounts are stored in cents. Returns the monthly-equivalent price for the cycle. */
export function displayMonthly(amountCents: number, cycle: "monthly" | "annual", discountPercent: number) {
  const monthly = amountCents / 100;
  return cycle === "annual" ? Math.round(annualTotal(amountCents, discountPercent) / 12 * 100) / 100 : monthly;
}

export function annualTotal(amountCents: number, discountPercent: number) {
  return Math.round((amountCents / 100) * 12 * (1 - discountPercent / 100));
}

export function formatPrice(value: number, currency: string) {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value)} ${currency}`;
}

export function founderMonthly(amountCents: number, discountPercent: number) {
  return Math.round(amountCents * (1 - discountPercent / 100)) / 100;
}

export function annualSavings(amountCents: number, discountPercent: number) {
  return Math.round((amountCents / 100 * 12 - annualTotal(amountCents, discountPercent)) * 100) / 100;
}

export function founderOfferActive(rank: number | null, endsAt: string | null, now = Date.now()) {
  return rank !== null && rank >= 1 && rank <= 20 && (endsAt === null || Date.parse(endsAt) > now);
}

export const quoteEmail = 'karim.gharbi@me.com';
export const enterpriseQuoteUrl = `mailto:${quoteEmail}?subject=${encodeURIComponent('Demande de devis Enterprise — Screenflow')}&body=${encodeURIComponent('Bonjour,\n\nJe souhaite un devis Screenflow Enterprise.\nEntreprise :\nNombre d’écrans :\nNombre de sites :\nTéléphone :\nBesoin et calendrier :\n\nMerci.')}`;
