import { describe, expect, it } from "vitest";
import { isValidPairingCode } from "@/lib/store";

describe("pairing code", () => {
  it("accepts exactly 6 digits", () => expect(isValidPairingCode("482913")).toBe(true));
  it("rejects 5 digits", () => expect(isValidPairingCode("48291")).toBe(false));
  it("rejects letters", () => expect(isValidPairingCode("48a913")).toBe(false));
});
