export const PAIRING_LIFETIME_SECONDS = 600;

export function generatePairingCode() {
  const numbers = new Uint32Array(1);
  do { crypto.getRandomValues(numbers); } while ((numbers[0] ?? 0) >= 4_294_000_000);
  return String((numbers[0] ?? 0) % 1_000_000).padStart(6, "0");
}

export function generateDeviceToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) => n.toString(16).padStart(2, "0")).join("");
}

export async function hashDeviceToken(token: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes), (n) => n.toString(16).padStart(2, "0")).join("");
}

export function effectivePairingStatus(status: string, expiresAt: string, now = Date.now()) {
  return status === "pending" && Date.parse(expiresAt) <= now ? "expired" : status;
}