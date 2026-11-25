import { describe, expect, it } from "vitest";
import { annualTotal, displayMonthly } from "./public-pricing";

describe("tarifs publics", () => {
  it("affiche 299 MAD/mois pour 5 écrans en mensuel", () => { expect(displayMonthly(29900, "monthly", 16.666667)).toBe(299); });
  it("annuel = 2 mois offerts (10 mensualités)", () => { expect(annualTotal(29900, 16.666667)).toBe(2990); });
});
