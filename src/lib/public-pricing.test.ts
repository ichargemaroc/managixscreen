import { describe, expect, it } from "vitest";
import { annualTotal, displayMonthly, annualSavings, founderMonthly, founderOfferActive, publicPricingSchema, enterpriseQuoteUrl } from "./public-pricing";

describe("tarifs publics", () => {
  it("affiche 299 MAD/mois pour 5 écrans en mensuel", () => { expect(displayMonthly(29900, "monthly", 16.666667)).toBe(299); });
  it("annuel = 2 mois offerts (10 mensualités)", () => { expect(annualTotal(29900, 16.666667)).toBe(2990); });
});

describe('nouvelle grille marocaine', () => {
  const discount = 100 * 2 / 12;
  it.each([[19900,149.25],[34900,261.75],[79900,599.25]])('offre Fondateurs sur %i centimes', (amount, expected) => {
    expect(founderMonthly(amount, 25)).toBe(expected);
  });
  it.each([[19900,1990,165.83,398],[34900,3490,290.83,698],[79900,7990,665.83,1598]])('annuel sur %i centimes', (amount, annual, monthly, saving) => {
    expect(annualTotal(amount, discount)).toBe(annual);
    expect(displayMonthly(amount, 'annual', discount)).toBe(monthly);
    expect(annualSavings(amount, discount)).toBe(saving);
  });
  it('limite les Fondateurs aux vingt comptes éligibles', () => {
    expect(founderOfferActive(1, null)).toBe(true);
    expect(founderOfferActive(20, null)).toBe(true);
    expect(founderOfferActive(21, null)).toBe(false);
    expect(founderOfferActive(null, null)).toBe(false);
  });
  it('cesse la remise à la fin des six mois', () => {
    const end = '2027-05-26T00:00:00Z';
    expect(founderOfferActive(1, end, Date.parse(end)-1)).toBe(true);
    expect(founderOfferActive(1, end, Date.parse(end))).toBe(false);
  });
  it('conserve le mensuel exact et reçoit les paramètres de l’essai', () => {
    expect(displayMonthly(19900, 'monthly', discount)).toBe(199);
    const data = publicPricingSchema.parse({ currency:'MAD', annual_discount_percent:discount, trial_days:14, trial_capacity:2, plans:[] });
    expect(data.trial_days).toBe(14);
    expect(data.trial_capacity).toBe(2);
  });
  it('adresse les demandes de devis à la destination confirmée', () => {
    expect(enterpriseQuoteUrl.split('?')[0]).toBe('mailto:karim.gharbi@me.com');
  });
});
