const KEY = "screenflow-module-recovery";
const RETRY_WINDOW = 60_000;

export function isModuleLoadFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Loading chunk .+ failed/i.test(message);
}

export function recoverModuleLoad(error: unknown, storage: Pick<Storage, "getItem" | "setItem">, reload: () => void, now = Date.now()): boolean {
  if (!isModuleLoadFailure(error)) return false;
  try {
    const previous = Number(storage.getItem(KEY));
    if (previous > 0 && now - previous < RETRY_WINDOW) return false;
    storage.setItem(KEY, String(now));
    reload();
    return true;
  } catch {
    return false;
  }
}