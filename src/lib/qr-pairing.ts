export function pairingCode(value: unknown): string | undefined {
  // TanStack's search parser decodes six-digit query values as JSON numbers.
  if (typeof value === "number" && Number.isInteger(value) && value >= 100000 && value <= 999999) return String(value);
  return typeof value === "string" && /^\d{6}$/.test(value) ? value : undefined;
}

export function pairingUrl(origin: string, code: string) {
  if (!pairingCode(code)) throw new Error("Code de jumelage invalide");
  const url = new URL("/pair", origin);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) throw new Error("Une adresse HTTPS est requise.");
  url.searchParams.set("code", code);
  return url.toString();
}

export function scannedPairingCode(value: string): string | undefined {
  const direct = pairingCode(value.trim());
  if (direct) return direct;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) return undefined;
    if (url.pathname !== "/pair") return undefined;
    return pairingCode(url.searchParams.get("code"));
  } catch {
    return undefined;
  }
}