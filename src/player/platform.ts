import { credentialsSchema, type Credentials } from "./protocol";
import { vaultError } from "./vault-errors";

const credentialKey = "screenflow-player-identity";
type NativeCredentialVault = { ping(): Promise<void>; read(): Promise<{ value?: string }>; write(options: { value: string }): Promise<void>; clear(): Promise<void> };
async function vault() {
  const { Capacitor, registerPlugin } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) return null;
  if (!Capacitor.isPluginAvailable("DeviceVault")) throw vaultError("VAULT_PLUGIN_MISSING");
  const plugin = registerPlugin<NativeCredentialVault>("DeviceVault");
  // Capacitor proxies synthesize `then`, so returning the proxy from an async
  // function makes Promise resolution call a nonexistent native method forever.
  // Return an ordinary adapter instead; only actual operations cross the bridge.
  return {
    ping: () => plugin.ping(),
    read: () => plugin.read(),
    write: (options: { value: string }) => plugin.write(options),
    clear: () => plugin.clear(),
  } satisfies NativeCredentialVault;
}
// Native credentials must never fall back to plaintext WebView storage.
// Slow TV boxes may need several seconds for Keystore work; the bridge itself must answer fast.
async function limit<T>(task: Promise<T>, ms = 15000, code = "VAULT_TIMEOUT") {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([task, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(vaultError(code)), ms); })]); }
  finally { clearTimeout(timer); }
}
export async function readCredentials(): Promise<Credentials | null> {
  const native = await vault();
  let value: string | null | undefined = null;
  if (native) {
    await limit(native.ping(), 3000, "VAULT_BRIDGE_TIMEOUT");
    value = (await limit(native.read())).value;
    // Migrate older fallback credentials only after a successful encrypted write.
    if (!value) {
      const legacy = localStorage.getItem(credentialKey);
      if (legacy) {
        const parsed = credentialsSchema.parse(JSON.parse(legacy));
        await limit(native.write({ value: JSON.stringify(parsed) }));
        value = JSON.stringify(parsed);
      }
    }
    localStorage.removeItem(credentialKey);
  } else value = localStorage.getItem(credentialKey);
  if (!value) return null;
  try { return credentialsSchema.parse(JSON.parse(value)); } catch { throw vaultError("VAULT_INVALID_IDENTITY"); }
}
export async function saveCredentials(value: Credentials | null) {
  const native = await vault();
  if (native) {
    if (value) await limit(native.write({ value: JSON.stringify(value) })); else await limit(native.clear());
    localStorage.removeItem(credentialKey); return;
  }
  if (value) localStorage.setItem(credentialKey, JSON.stringify(value)); else localStorage.removeItem(credentialKey);
}
export async function subscribeNetwork(callback: (online: boolean) => void) {
  const { Capacitor } = await import("@capacitor/core");
  if (Capacitor.isNativePlatform()) {
    const { Network } = await import("@capacitor/network");
    const listener = await Network.addListener("networkStatusChange", (s) => callback(s.connected));
    callback((await Network.getStatus()).connected);
    return () => { void listener.remove(); };
  }
  const notify = () => callback(navigator.onLine);
  window.addEventListener("online", notify); window.addEventListener("offline", notify); notify();
  return () => { window.removeEventListener("online", notify); window.removeEventListener("offline", notify); };
}
export async function enterPlayerMode() {
  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform() && !document.fullscreenElement) await document.documentElement.requestFullscreen?.().catch(() => {});
  const orientation = screen.orientation as ScreenOrientation & { lock?: (value: string) => Promise<void> };
  await orientation.lock?.("landscape").catch(() => {});
}
export async function keepAwake() {
  let lock: WakeLockSentinel | null = null;
  const acquire = async () => { if (document.visibilityState === "visible" && 'wakeLock' in navigator) { try { lock = await navigator.wakeLock.request("screen"); } catch { /* Unsupported or denied: native window flag is the fallback. */ } } };
  await acquire(); document.addEventListener("visibilitychange", acquire);
  return () => { document.removeEventListener("visibilitychange", acquire); void lock?.release(); };
}