import { describe, expect, it } from "vitest";
import { scannedPairingCode } from "@/lib/qr-pairing";

describe("QR de jumelage depuis le téléphone", () => {
  it("extrait le code du lien du lecteur sans naviguer vers le site scanné", () => {
    expect(scannedPairingCode("https://managixscreen.lovable.app/pair?code=123456")).toBe("123456");
  });
  it("conserve les zéros initiaux", () => {
    expect(scannedPairingCode("https://managixscreen.lovable.app/pair?code=012345")).toBe("012345");
  });
  it("accepte un code à six chiffres", () => {
    expect(scannedPairingCode("654321")).toBe("654321");
  });
  it("refuse les liens étrangers au jumelage et les protocoles non sûrs", () => {
    for (const value of ["https://example.com/auth?code=123456", "javascript:123456", "http://example.com/pair?code=123456", "https://example.com/pair?code=12345"]) expect(scannedPairingCode(value)).toBeUndefined();
  });
});