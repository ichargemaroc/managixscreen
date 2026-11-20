const KEY = "screenflow-module-recovery";
const RETRY_WINDOW = 60_000;

// Runs before the module entry: React effects cannot recover a failure that prevents React itself from starting.
export const moduleRecoveryBootstrap = `(() => {
  const matches = value => /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Loading chunk .+ failed/i.test(value && value.message || String(value || ""));
  let failed = false;
  const show = () => {
    if (!document.body || document.getElementById("module-startup-recovery")) return;
    const box = document.createElement("div");
    box.id = "module-startup-recovery";
    box.setAttribute("role", "alert");
    const title = document.createElement("h1"); title.textContent = "Le chargement a été interrompu";
    const text = document.createElement("p"); text.textContent = "Vérifiez votre connexion puis réessayez.";
    const retry = document.createElement("button"); retry.textContent = "Réessayer"; retry.onclick = () => location.reload();
    box.append(title, text, retry); document.body.append(box);
  };
  const recover = () => {
    failed = true;
    try {
      const now = Date.now(), previous = Number(sessionStorage.getItem("screenflow-module-recovery"));
      if (navigator.onLine && !(previous > 0 && now - previous < 60000)) {
        sessionStorage.setItem("screenflow-module-recovery", String(now)); location.reload(); return;
      }
    } catch (_) {}
    show();
  };
  window.addEventListener("unhandledrejection", e => { if (matches(e.reason)) recover(); });
  window.addEventListener("vite:preloadError", e => { if (matches(e.payload)) recover(); });
  window.addEventListener("error", e => {
    const script = e.target;
    if (matches(e.error || e.message) || script instanceof HTMLScriptElement && script.type === "module") recover();
  }, true);
  document.addEventListener("DOMContentLoaded", () => { if (failed) show(); });
})();`;

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