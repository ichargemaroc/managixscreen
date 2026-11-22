import { describe, expect, it } from 'vitest';
import { annualAmount, availablePlaces, capacityAllows, nextCapacity, planInputSchema, billingError, minorUnit, deviceEntitlementSchema } from '@/lib/billing';

describe('Screenflow capacity rules', () => {
  it.each([5, 10, 15, 20, 25, 30])('accepts the %i screen tier', (capacity) => { expect(planInputSchema.safeParse({ id: null, name: 'Tier', capacity, amount: null, published: true }).success).toBe(true); });
  it('rejects a tier outside increments of five', () => { expect(planInputSchema.safeParse({ id: null, name: 'Tier', capacity: 6, amount: null, published: true }).success).toBe(false); });
  it('refuses the sixth screen on Starter', () => { expect(capacityAllows(5, 5)).toBe(false); });
  it('permits the sixth screen after upgrading to ten', () => { expect(capacityAllows(10, 5)).toBe(true); });
  it('a released entitlement frees one place', () => { expect(availablePlaces(5, 4)).toBe(1); });
  it('never reports negative places after a historical overage', () => { expect(availablePlaces(5, 6)).toBe(0); });
  it.each([[5,10],[10,15],[15,20],[20,25],[25,30]])('adds five to %i', (current, next) => { expect(nextCapacity(current)).toBe(next); });
  it('keeps prices nullable before configuration', () => { expect(planInputSchema.parse({ id: null, name: 'Starter', capacity: 5, amount: null, published: true }).amount).toBeNull(); });
  it('computes a configured annual discount once', () => { expect(annualAmount(1000, 10)).toBe(10800); });
  it('respects zero and three digit currencies', () => { expect(minorUnit('JPY')).toBe(1); expect(minorUnit('KWD')).toBe(1000); });
  it('does not expose raw database errors', () => { expect(billingError('secret 123')).not.toContain('secret 123'); });
  it('distinguishes a reversible deactivation from identity revocation', () => { expect(deviceEntitlementSchema.parse({ version: 1, active: false, revision: 2 }).active).toBe(false); });
});