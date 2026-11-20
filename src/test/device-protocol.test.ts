import { describe, expect, it } from "vitest";
import { PAIRING_LIFETIME_SECONDS, effectivePairingStatus, generatePairingCode, generateDeviceToken, hashDeviceToken } from "@/lib/device-protocol";

describe("Device pairing rules", () => {
  it("expires pending codes after exactly ten minutes", () => {
    expect(PAIRING_LIFETIME_SECONDS).toBe(600);
    const expires = "2026-11-20T03:10:00Z";
    expect(effectivePairingStatus("pending", expires, Date.parse("2026-11-20T03:09:59Z"))).toBe("pending");
    expect(effectivePairingStatus("pending", expires, Date.parse(expires))).toBe("expired");
  });
  it("does not reactivate paired or revoked codes on expiry", () => {
    expect(effectivePairingStatus("paired", "2020-01-01", Date.now())).toBe("paired");
    expect(effectivePairingStatus("revoked", "2020-01-01", Date.now())).toBe("revoked");
  });
  it("generates numeric six-digit pairing codes", () => {
    for (let i = 0; i < 30; i++) expect(generatePairingCode()).toMatch(/^\d{6}$/);
  });
  it("stores hashes rather than raw device tokens", async () => {
    const token = generateDeviceToken();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    const hash = await hashDeviceToken(token);
    expect(hash).not.toBe(token);
    expect(await hashDeviceToken(token)).toBe(hash);
  });
});