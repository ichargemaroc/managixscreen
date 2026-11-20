import { credentialsSchema, type Credentials } from "./protocol";

const credentialKey = "screenflow-player-identity";
type NativeCredentialVault = { read(): Promise<{ value?: string }>; write(options: { value: string }): Promise<void>; clear(): Promise<void> };
async function vault() {
  const { Capacitor, registerPlugin } = await import("@capacitor/core");
  return Capacitor.isNativePlatform() ? registerPlugin<NativeCredentialVault>("DeviceVault") : null;
}
// A failing or hung native vault falls back to WebView storage so pairing can still proceed.
function limit<T>(task: Promise<T>) { return Promise.race([task, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("vault timeout")), 4000))]); }
export async function readCredentials(): Promise<Credentials | null> {
  const native = await vault().catch(() => null);
  let value: string | null | undefined = null;
  if (native) { try { value = (await limit(native.read())).value; } catch { value = null; } }
  value ||= localStorage.getItem(credentialKey);
  if (!value) return null;
  try { return credentialsSchema.parse(JSON.parse(value)); } catch { return null; }
}
export async function saveCredentials(value: Credentials | null) {
  const native = await vault().catch(() => null);
  if (native) {
    try { if (value) await limit(native.write({ value: JSON.stringify(value) })); else await limit(native.clear()); localStorage.removeItem(credentialKey); return; } catch { /* fall back below */ }
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