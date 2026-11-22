import { describe, expect, it } from 'vitest';
import { annualAmount, availablePlaces, capacityAllows, nextCapacity, planInputSchema, billingError, minorUnit, deviceEntitlementSchema } from '@/lib/billing';

describe('Screenflow capacity rules', () => {
  it.each([5, 10, 15, 20, 25, 30])('accepts the %i screen tier', (capacity) => { expect(planInputSchema.safeParse({ id: null, name: 'Tier', capacity, amount: null, published: true }).success).toBe(true); });
  it('rejects a tier outside increments of five', () => { expect(planInputSchema.safeParse({ id: null, name: 'Tier', capacity: 6, amount: null, published: true }).success).toBe(false); });
  it('refuses the sixth screen on Starter', () => { expect(capacityAllows(5, 5)).toBe(false); });
  it('permits the sixth screen after upgrading to ten', () => { expect(capacityAllows(10, 5)).toBe(true); });
  it('a released entitlement frees one place', () => { expect(availablePlaces(5, 4)).toBe(1); });
  it('never reports negative places after a historical overage', () => { expect(availablePlaces(5, 6)).toBe(0); });
  const catalogue = [5, 10, 15, 20, 25, 30, 50, 100].map((capacity) => ({ capacity, published: true }));
  it.each([[5,10],[10,15],[15,20],[20,25],[25,30],[30,50],[50,100]])('selects the published tier above %i', (current, next) => { expect(nextCapacity(current, catalogue)).toBe(next); });
  it('has no higher tier above 100 screens', () => { expect(nextCapacity(100, catalogue)).toBeNull(); });
  it('ignores unpublished tiers', () => { expect(nextCapacity(30, [...catalogue, { capacity: 35, published: false }])).toBe(50); });
  it('does not invent a tier for an empty catalogue', () => { expect(nextCapacity(5, [])).toBeNull(); });
  it('selects above the allowance including complimentary screens', () => { expect(nextCapacity(35, catalogue)).toBe(50); });
  it('selects the smallest higher tier regardless of catalogue order', () => { expect(nextCapacity(5, [{ capacity: 100, published: true }, { capacity: 10, published: true }])).toBe(10); });
  it('keeps prices nullable before configuration', () => { expect(planInputSchema.parse({ id: null, name: 'Starter', capacity: 5, amount: null, published: true }).amount).toBeNull(); });
  it('computes a configured annual discount once', () => { expect(annualAmount(1000, 10)).toBe(10800); });
  it('respects zero and three digit currencies', () => { expect(minorUnit('JPY')).toBe(1); expect(minorUnit('KWD')).toBe(1000); });
  it('does not expose raw database errors', () => { expect(billingError('secret 123')).not.toContain('secret 123'); });
  it('distinguishes a reversible deactivation from identity revocation', () => { expect(deviceEntitlementSchema.parse({ version: 1, active: false, revision: 2 }).active).toBe(false); });
});
import { trialDaysLeft as _tdl, keepSelectionNeeded as _ksn, annualAmount as _aa } from '@/lib/billing';
describe('modèle commercial', () => {
  it('compte les jours d’essai restants', () => {
    const now = Date.parse('2026-11-01T00:00:00Z');
    expect(_tdl('2026-11-15T00:00:00Z', now)).toBe(14);
    expect(_tdl('2026-10-30T00:00:00Z', now)).toBe(0);
  });
  it('exige une sélection quand les écrans actifs dépassent le forfait inférieur', () => {
    expect(_ksn(12, 10)).toBe(10);
    expect(_ksn(8, 10)).toBe(0);
    expect(_ksn(12, 10, 2)).toBe(0);
  });
  it('2 mois offerts : 10 mensualités par an', () => {
    expect(Math.abs(_aa(29900, 100 * 2 / 12) - 299000)).toBeLessThanOrEqual(1);
  });
});
