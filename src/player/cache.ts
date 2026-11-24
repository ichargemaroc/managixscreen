import { cacheKey, legacyCacheKey, contentSchema, contentItems, type Content, type Item } from "./protocol";
import { deviceEntitlementSchema } from '@/lib/billing';
import type { z } from 'zod';
import { musicCacheKey } from '@/lib/background-music';

// IndexedDB is shared by the browser route and the bundled Android WebView.
const dbName = "screenflow-player-v1";
async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => { request.result.createObjectStore("media"); request.result.createObjectStore("state"); };
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
}
async function read<T>(store: string, key: string): Promise<T | undefined> {
  const db = await database();
  try { return await new Promise<T | undefined>((resolve, reject) => { const req = db.transaction(store).objectStore(store).get(key); req.onsuccess = () => resolve(req.result as T | undefined); req.onerror = () => reject(req.error); }); } finally { db.close(); }
}
async function write(store: string, key: string, value: unknown) {
  const db = await database();
  try { await new Promise<void>((resolve, reject) => { const tx = db.transaction(store, "readwrite"); tx.objectStore(store).put(value, key); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); }); } finally { db.close(); }
}
export async function readContent(): Promise<Content | null> {
  const value = await read<unknown>("state", "manifest");
  const parsed = contentSchema.safeParse(value);
  if (!parsed.success) return null;
  const entitlement = deviceEntitlementSchema.safeParse(await read<unknown>('state', `entitlement:${parsed.data.screen_id}`));
  return entitlement.success ? { ...parsed.data, entitlement: entitlement.data } : parsed.data;
}
export async function saveEntitlement(screenId: string, value: z.infer<typeof deviceEntitlementSchema>) { await write('state', `entitlement:${screenId}`, deviceEntitlementSchema.parse(value)); }
export async function cachedMusic(content: Content) {
  return content.background_music ? read<Blob>('media', musicCacheKey(content.background_music)) : undefined;
}
export async function cachedMedia(content: Content, item: Item) {
  const stored = await read<Blob>("media", cacheKey(content, item)) ?? await read<Blob>("media", legacyCacheKey(content, item));
  if (stored) return stored;
  const previous = await readContent();
  const previousItem = previous ? contentItems(previous).find(candidate => candidate.media.id === item.media.id && candidate.media.size === item.media.size && candidate.media.type === item.media.type) : undefined;
  return previous && previousItem ? read<Blob>('media', legacyCacheKey(previous, previousItem)) : undefined;
}
// Command polling and scheduled synchronization can overlap; commit/prune replacements in order.
let downloadQueue: Promise<void> = Promise.resolve();
export function downloadContent(content: Content, progress: (done: number, total: number) => void) {
  const pending = downloadQueue.then(() => storeContent(content, progress));
  downloadQueue = pending.catch(() => {});
  return pending;
}
async function storeContent(content: Content, progress: (done: number, total: number) => void) {
  const items = contentItems(content);
  // Download the complete replacement before switching playback; keep the old manifest on failure.
  // Three concurrent downloads speed up updates without exhausting TV memory.
  let done = 0; let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const item = items[next++]; if (!item) continue;
      if (item.media.type !== 'webpage') {
        const stored = await cachedMedia(content, item);
        if (stored) {
          // Migrate a legacy offline blob before pruning its old revision-specific key.
          if (!await read<Blob>("media", cacheKey(content, item))) await write("media", cacheKey(content, item), stored);
        } else {
          if (!item.media.download_url) throw new Error('URL du média manquante.');
          const response = await fetch(item.media.download_url, { signal: AbortSignal.timeout(120000) });
          if (!response.ok) throw new Error("Un média n’a pas pu être téléchargé.");
          const blob = await response.blob();
          if (!blob.size) throw new Error("Média vide.");
          await write("media", cacheKey(content, item), blob);
        }
      }
      progress(++done, items.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(3, items.length) }, worker));
  if (content.background_music && !await cachedMusic(content)) {
    const response = await fetch(content.background_music.download_url, { signal: AbortSignal.timeout(120000) });
    if (!response.ok) throw new Error('La musique n’a pas pu être téléchargée.');
    const blob = await response.blob();
    if (!blob.size) throw new Error('Musique vide.');
    await write('media', musicCacheKey(content.background_music), blob);
  }
  await write("state", "manifest", content);
  // Prune only after the replacement is durably committed.
  const db = await database();
  try { await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("media", "readwrite"); const store = tx.objectStore("media");
    const keep = new Set(items.map((item) => cacheKey(content, item)));
    if (content.background_music) keep.add(musicCacheKey(content.background_music));
    const req = store.openCursor(); req.onsuccess = () => { const cursor = req.result; if (!cursor) return; if (!keep.has(String(cursor.key))) cursor.delete(); cursor.continue(); };
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  }); } finally { db.close(); }
}
export async function clearMediaCache() {
  const db = await database(); try { await new Promise<void>((resolve, reject) => { const tx = db.transaction(["media", "state"], "readwrite"); tx.objectStore("media").clear(); tx.objectStore("state").delete("manifest"); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); } finally { db.close(); }
}
type Receipt = { status: "completed" | "failed"; error?: string; restartPending?: boolean };
export async function commandReceipt(id: string) { return read<Receipt>("state", `command:${id}`); }
export async function saveReceipt(id: string, result: Receipt) { await write("state", `command:${id}`, result); }