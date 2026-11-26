import { parseStorageReport, type StorageReport } from '@/lib/device-storage';

// Failure or an old APK must never delay heartbeat/content synchronization.
export async function readDeviceStorage(): Promise<StorageReport | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      collectStorage(),
      new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), 1500); }),
    ]);
  } catch { return null; }
  finally { clearTimeout(timer); }
}

async function collectStorage(): Promise<StorageReport | null> {
  const { Capacitor, registerPlugin } = await import('@capacitor/core');
  if (Capacitor.isNativePlatform()) {
    if (!Capacitor.isPluginAvailable('DeviceStorage')) return null;
    const plugin = registerPlugin<{ read(): Promise<StorageReport> }>('DeviceStorage');
    return parseStorageReport(await plugin.read());
  }
  // This is an origin quota, NOT physical device capacity.
  const estimate = await navigator.storage?.estimate?.();
  if (estimate?.quota === undefined || estimate.usage === undefined) return null;
  return parseStorageReport({
    storage_total_bytes: Math.floor(estimate.quota),
    storage_available_bytes: Math.max(0, Math.floor(estimate.quota - estimate.usage)),
    storage_source: 'browser',
  });
}