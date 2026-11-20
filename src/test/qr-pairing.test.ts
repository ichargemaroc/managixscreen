import { describe, expect, it } from "vitest";
import { pairingCode, pairingUrl } from "@/lib/qr-pairing";

describe("QR pairing", () => {
  it("encodes only the six digit pairing code", () => {
    expect(pairingUrl("https://managixscreen.lovable.app", "012345")).toBe("https://managixscreen.lovable.app/pair?code=012345");
  });
  it("rejects invalid codes", () => {
    expect(pairingCode("12345")).toBeUndefined();
    expect(pairingCode("1234567")).toBeUndefined();
    expect(() => pairingUrl("https://managixscreen.lovable.app", "abcdef")).toThrow();
  });
  it("normalizes numeric query values while preserving leading zero strings", () => {
    expect(pairingCode(860066)).toBe("860066");
    expect(pairingCode("012345")).toBe("012345");
    expect(pairingCode(12345)).toBeUndefined();
  });
  it("rejects insecure nonlocal destinations", () => {
    expect(() => pairingUrl("http://example.com", "123456")).toThrow();
  });
});