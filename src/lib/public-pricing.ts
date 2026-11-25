import { z } from "zod";

export const publicPricingSchema = z.object({
  currency: z.string().nullable(),
  annual_discount_percent: z.number().nullable(),
  trial_days: z.number().nullable(),
  trial_capacity: z.number().nullable(),
  plans: z.array(z.object({ id: z.string(), name: z.string(), capacity: z.number(), monthly_amount: z.number() })),
});
export type PublicPricing = z.infer<typeof publicPricingSchema>;

/** Amounts are stored in cents. Returns the monthly-equivalent price for the cycle. */
export function displayMonthly(amountCents: number, cycle: "monthly" | "annual", discountPercent: number) {
  const monthly = amountCents / 100;
  return cycle === "annual" ? Math.round(monthly * (1 - discountPercent / 100)) : Math.round(monthly);
}

export function annualTotal(amountCents: number, discountPercent: number) {
  return Math.round((amountCents / 100) * 12 * (1 - discountPercent / 100));
}

export function formatPrice(value: number, currency: string) {
  return `${new Intl.NumberFormat("fr-FR").format(value)} ${currency}`;
}
