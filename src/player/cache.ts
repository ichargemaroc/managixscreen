import { cacheKey, contentSchema, type Content, type Item } from "./protocol";

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
  const parsed = contentSchema.safeParse(value); return parsed.success ? parsed.data : null;
}
export async function cachedMedia(content: Content, item: Item) { return read<Blob>("media", cacheKey(content, item)); }
export async function downloadContent(content: Content, progress: (done: number, total: number) => void) {
  const items = content.playlist?.items ?? [];
  // Download the complete replacement before switching playback; keep the old manifest on failure.
  for (let i = 0; i < items.length; i++) {
    const item = items[i]; if (!item) continue;
    if (item.media.type === 'webpage') { progress(i + 1, items.length); continue; }
    if (!await cachedMedia(content, item)) {
      if (!item.media.download_url) throw new Error('URL du média manquante.');
      const response = await fetch(item.media.download_url, { signal: AbortSignal.timeout(120000) });
      if (!response.ok) throw new Error("Un média n’a pas pu être téléchargé.");
      const blob = await response.blob();
      if (!blob.size) throw new Error("Média vide.");
      await write("media", cacheKey(content, item), blob);
    }
    progress(i + 1, items.length);
  }
  await write("state", "manifest", content);
  // Prune only after the replacement is durably committed.
  const db = await database();
  try { await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("media", "readwrite"); const store = tx.objectStore("media");
    const keep = new Set(items.map((item) => cacheKey(content, item)));
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