import { webpageUrl } from '@/lib/webpage';
import type { DisplayRotation } from '@/lib/display-rotation';

export type WebpageEvent = { session: string; state: 'loaded' | 'error' | 'back'; code?: string };
type Plugin = { open(options: { url: string; session: string; fullscreen: boolean; timeoutMs: number; rotation?: DisplayRotation; muted?:boolean;rectangle?: {x:number;y:number;width:number;height:number} }): Promise<void>; close(options: { session: string }): Promise<void>; reload(options: { session: string }): Promise<void>; addListener(name: 'webpageState', callback: (event: WebpageEvent) => void): Promise<{ remove(): Promise<void> }> };
export async function nativeWebpage() {
  const { Capacitor, registerPlugin } = await import('@capacitor/core');
  if (!Capacitor.isNativePlatform()) return null;
  if (!Capacitor.isPluginAvailable('WebpagePlayer')) throw new Error('plugin_missing');
  const plugin = registerPlugin<Plugin>('WebpagePlayer');
  return { open: (options: Parameters<Plugin['open']>[0]) => plugin.open({ ...options, url: webpageUrl(options.url) }), close: (session: string) => plugin.close({ session }), reload: (session: string) => plugin.reload({ session }), listen: (callback: (event: WebpageEvent) => void) => plugin.addListener('webpageState', callback) };
}