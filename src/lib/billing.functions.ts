import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { billingAccountSchema, billingAdminSchema, billingClientSchema, billingError, planInputSchema, settingsInputSchema } from './billing';

export const getBillingAccount = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.rpc('billing_my_account');
  if (error) throw new Error('Votre abonnement n’a pas pu être chargé.');
  return billingAccountSchema.parse(data);
});
export const getBillingAdmin = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator(z.object({ page: z.number().int().min(0).max(100000) })).handler(async ({ context, data }) => {
  const result = await context.supabase.rpc('billing_admin_overview', { p_page: data.page });
  if (result.error) throw new Error('Administration réservée aux administrateurs de Screenflow.');
  return billingAdminSchema.parse(result.data);
});
export const getBillingClient = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator(z.object({ userId: z.string().uuid() })).handler(async ({ context, data }) => {
  const result = await context.supabase.rpc('billing_admin_client', { p_user: data.userId });
  if (result.error) throw new Error('Accès client refusé.');
  return billingClientSchema.parse(result.data);
});
export const saveBillingPlan = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator(planInputSchema).handler(async ({ context, data }) => {
  const result = await context.supabase.rpc('billing_admin_save_plan', { ...(data.id ? { p_id: data.id } : {}), p_name: data.name, p_capacity: data.capacity, ...(data.amount !== null ? { p_amount: data.amount } : {}), p_published: data.published });
  if (result.error) throw new Error(billingError(result.error.message));
  return result.data;
});
export const saveBillingSettings = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator(settingsInputSchema).handler(async ({ context, data }) => {
  const result = await context.supabase.rpc('billing_admin_settings', { p_currency: data.currency, p_discount: data.discount, p_grace: data.grace });
  if (result.error) throw new Error(billingError(result.error.message));
});
export const changeBillingAccess = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator(z.object({ userId: z.string().uuid(), action: z.enum(['suspend', 'reactivate', 'trial_plan']), planId: z.string().uuid().nullable() })).handler(async ({ context, data }) => {
  const result = await context.supabase.rpc('billing_admin_access', { p_user: data.userId, p_action: data.action, ...(data.planId ? { p_plan: data.planId } : {}) });
  if (result.error) throw new Error(billingError(result.error.message));
});
export const changeScreenEntitlement = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator(z.object({ screenId: z.string().uuid(), active: z.boolean() })).handler(async ({ context, data }) => {
  const result = await context.supabase.rpc('set_screen_entitlement', { p_screen: data.screenId, p_active: data.active });
  if (result.error) throw new Error(billingError(result.error.message));
});