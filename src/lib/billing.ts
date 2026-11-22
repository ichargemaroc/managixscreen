import { z } from 'zod';

export const billingStatus = z.enum(['active', 'trial', 'past_due', 'suspended', 'cancelled', 'expired']);
export const billingPlanSchema = z.object({ id: z.string().uuid(), name: z.string(), capacity: z.number().int(), monthly_amount: z.number().nullable(), published: z.boolean(), price_revision: z.number() });
export const billingSettingsSchema = z.object({ currency: z.string().nullable(), annual_discount_percent: z.number().nullable(), grace_days: z.number().nullable(), provider: z.string().nullable(), provider_ready: z.boolean(), suspension_policy: z.string(), trial_days: z.number().int().default(14), trial_capacity: z.number().int().default(5), trial_one_per_email: z.boolean().default(true) });
export const billingPaymentSchema = z.object({ id: z.string(), kind: z.enum(['invoice', 'refund']), status: z.string(), amount: z.number(), currency: z.string(), hosted_url: z.string().nullable(), created_at: z.string() });
export const billingHistorySchema = z.object({ action: z.string(), details: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])), created_at: z.string() });
export const billingAccountSchema = z.object({
  subscription: z.object({ user_id: z.string().uuid(), plan_id: z.string().nullable(), capacity: z.number().int(), status: billingStatus, legacy_access: z.boolean(), enforce_capacity: z.boolean(), interval: z.enum(['month', 'year']), amount: z.number().nullable(), currency: z.string().nullable(), current_period_end: z.string().nullable(), grace_until: z.string().nullable(), cancel_at_period_end: z.boolean(), trial_ends_at: z.string().nullable().default(null), complimentary_screens: z.number().int().default(0), scheduled_plan_id: z.string().nullable().default(null) }),
  used: z.number().int(), plans: z.array(billingPlanSchema), settings: billingSettingsSchema, payments: z.array(billingPaymentSchema), history: z.array(billingHistorySchema), entitlements: z.array(z.object({ screen_id: z.string(), active: z.boolean() })), is_admin: z.boolean(),
});
export const billingAdminSchema = z.object({ clients: z.array(z.object({ user_id: z.string().uuid(), email: z.string().nullable(), full_name: z.string().nullable(), org_name: z.string().nullable(), plan_id: z.string().nullable(), status: billingStatus, capacity: z.number(), legacy_access: z.boolean(), enforce_capacity: z.boolean(), current_period_end: z.string().nullable(), trial_ends_at: z.string().nullable().default(null), complimentary_screens: z.number().default(0), used: z.number() })), total: z.number(), active: z.number(), trials: z.number().default(0), mrr: z.number().default(0), past_due: z.number(), suspended: z.number(), screens: z.number(), plans: z.array(billingPlanSchema), settings: billingSettingsSchema });
export const billingClientSchema = z.object({ screens: z.array(z.object({ id: z.string(), name: z.string(), active: z.boolean(), last_seen: z.string().nullable() })), payments: z.array(billingPaymentSchema), history: z.array(billingHistorySchema) });
export type BillingAccount = z.infer<typeof billingAccountSchema>;
export type BillingPlan = z.infer<typeof billingPlanSchema>;
export const BILLING_LABELS: Record<z.infer<typeof billingStatus>, string> = { active: 'Actif', trial: 'Essai / accès accordé', past_due: 'Paiement en retard', suspended: 'Suspendu', cancelled: 'Annulé', expired: 'Expiré' };
export const planInputSchema = z.object({ id: z.string().uuid().nullable(), name: z.string().trim().min(1).max(80), capacity: z.number().int().min(5).max(100000).multipleOf(5), amount: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable(), published: z.boolean() });
export const settingsInputSchema = z.object({ currency: z.string().regex(/^[A-Z]{3}$/), discount: z.number().min(0).max(100), grace: z.number().int().min(0).max(90) });
export function nextCapacity(capacity: number) { return Math.max(5, Math.ceil(capacity / 5) * 5 + 5); }
export function availablePlaces(capacity: number, used: number) { return Math.max(0, capacity - used); }
export function capacityAllows(capacity: number, used: number) { return used < capacity; }
export function minorUnit(currency: string) { return 10 ** (new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2); }
export function billingMoney(amount: number | null, currency: string | null) { return amount === null || !currency ? 'Tarif à configurer' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount / minorUnit(currency)); }
export function annualAmount(monthly: number, discount: number) { return Math.round(monthly * 12 * (1 - discount / 100)); }
export function billingDate(value: string | null) { return value ? new Date(value).toLocaleDateString('fr-FR') : '—'; }
export function billingError(message: string) {
  const quota = /SCREEN_LIMIT:(\d+)/.exec(message)?.[1];
  if (quota) return `Vous avez atteint la limite de ${quota} écrans de votre abonnement. Passez à l’offre ${Number(quota) + 5} écrans pour ajouter de nouveaux Players.`;
  if (message.includes('TRIAL_EXPIRED')) return 'Votre essai gratuit est terminé. Vos écrans et contenus sont conservés ; choisissez un forfait pour ajouter de nouveaux Players.';
  const keep = /KEEP_SELECTION_REQUIRED:(\d+)/.exec(message)?.[1];
  if (keep) return `Sélectionnez exactement ${keep} écrans à conserver avant ce changement de forfait.`;
  if (message.includes('DOWNGRADE_NOT_AVAILABLE')) return 'Le changement vers un forfait inférieur sera disponible avec un abonnement payant actif.';
  if (message.includes('BILLING_INACTIVE')) return 'Votre accès ne permet pas de nouvelles activations. Consultez votre abonnement.';
  if (message.includes('CAPACITY_BELOW_USAGE')) return 'Ce forfait est inférieur au nombre d’écrans utilisés. Désactivez les écrans en trop avant de réduire la capacité.';
  if (message.includes('DEVICE_REVOKED')) return 'Cet appareil a été révoqué ; un nouveau jumelage est nécessaire.';
  if (message.includes('PROVIDER_MANAGED')) return 'Cet abonnement doit être modifié chez le fournisseur de paiement.';
  return 'La modification n’a pas pu être enregistrée. Vérifiez vos droits et réessayez.';
}
export const deviceEntitlementSchema = z.object({ version: z.literal(1), active: z.boolean(), revision: z.number().int().nonnegative() });
export const trialSettingsInputSchema = z.object({ days: z.number().int().min(0).max(90), capacity: z.number().int().min(0).max(1000).multipleOf(5), onePerEmail: z.boolean() });
export const grantInputSchema = z.object({ userId: z.string().uuid(), kind: z.enum(['free_screens', 'special', 'extend_trial']), value: z.number().int().min(0).max(100000), until: z.string().datetime().nullable() });
/** Whole days left in a trial (0 when finished). */
export function trialDaysLeft(endsAt: string | null, now = Date.now()) { return endsAt ? Math.max(0, Math.ceil((new Date(endsAt).getTime() - now) / 86_400_000)) : null; }
/** Downgrades need a screen selection only when active screens exceed the new allowance. */
export function keepSelectionNeeded(used: number, newCapacity: number, complimentary = 0) { return used > newCapacity + complimentary ? newCapacity + complimentary : 0; }
export function monthlyEquivalentLabel(discount: number | null) { return discount === null ? null : Math.round(12 * (discount / 100) * 10) / 10; }
