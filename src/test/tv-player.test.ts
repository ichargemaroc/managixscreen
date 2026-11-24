import { beforeEach, describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";
import { cacheKey, imageDuration, nextItem, type Content, type Item } from "@/player/protocol";
import { cachedMedia, clearMediaCache, commandReceipt, downloadContent, readContent, saveReceipt } from "@/player/cache";

const item: Item = { id: "a67f4500-b2f4-4049-9a31-5433f14aad57", position: 0, display_duration: 17, media: { id: "a67f4500-b2f4-4049-9a31-5433f14aad57", name: "Image", type: "image", size: 4, duration: null, download_url: "https://example.test/image.png" } };
const manifest: Content = { display_rotation: 0, screen_id: item.id, assignment_updated_at: "2026-11-20T00:00:00Z", last_sync_at: "2026-11-20T00:00:00Z", playlist: { id: item.id, name: "TV", updated_at: "2026-11-20T00:00:00Z", items: [item] } };
describe("TV player playback and offline cache", () => {
  beforeEach(async () => { await clearMediaCache(); vi.restoreAllMocks(); });
  it("uses the playlist photo duration and loops in playlist order", () => {
    expect(imageDuration(item)).toBe(17000);
    expect(nextItem(0, 3)).toBe(1); expect(nextItem(2, 3)).toBe(0); expect(nextItem(0, 0)).toBe(0);
  });
  it("retains cached media and manifest when connectivity is lost", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("data"));
    await downloadContent(manifest, () => {});
    fetcher.mockRejectedValue(new Error("Offline"));
    expect(await readContent()).toEqual(manifest);
    expect(await cachedMedia(manifest, item)).toBeDefined();
    await downloadContent(manifest, () => {});
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("does not replace the playable playlist when a new media download fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("data")).mockRejectedValue(new Error("Offline"));
    await downloadContent(manifest, () => {});
    const replacement: Content = { ...manifest, playlist: manifest.playlist ? { ...manifest.playlist, updated_at: "2026-11-20T01:00:00Z", items: [{ ...item, media: { ...item.media, id: 'b67f4500-b2f4-4049-9a31-5433f14aad57' } }] } : null };
    await expect(downloadContent(replacement, () => {})).rejects.toThrow("Offline");
    expect(await readContent()).toEqual(manifest);
    expect(await cachedMedia(manifest, item)).toBeDefined();
  });
  it("clears media without erasing deduplication receipts", async () => {
    await saveReceipt(item.id, { status: "completed" });
    await clearMediaCache();
    expect(await readContent()).toBeNull();
    expect(await commandReceipt(item.id)).toEqual({ status: "completed" });
  });
  it("does not key local media by expiring signed URLs", () => {
    expect(cacheKey(manifest, item)).toBe(cacheKey(manifest, { ...item, media: { ...item.media, download_url: "https://example.test/renewed.png" } }));
  });
  it('retains the rotated display offline without downloading the same media again', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('data'));
    await downloadContent(manifest, () => {});
    fetcher.mockRejectedValue(new Error('Offline'));
    await downloadContent({ ...manifest, display_rotation: 90 }, () => {});
    expect((await readContent())?.display_rotation).toBe(90);
    expect(await cachedMedia(manifest, item)).toBeDefined();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('applies an edited assigned playlist without downloading the same video again', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('data')).mockRejectedValue(new Error('Download unavailable'));
    await downloadContent(manifest, () => {});
    const replacement: Content = { ...manifest, playlist: manifest.playlist ? { ...manifest.playlist, updated_at: '2026-11-21T00:00:00Z', items: [{ ...item, display_duration: 23 }] } : null };
    await downloadContent(replacement, () => {});
    expect((await readContent())?.playlist?.items[0]?.display_duration).toBe(23);
    expect((await readContent())?.playlist?.updated_at).toBe('2026-11-21T00:00:00Z');
    expect(await cachedMedia(replacement, item)).toBeDefined();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('serializes overlapping replacements so an older download cannot overwrite the new playlist', async () => {
    let finish: ((response: Response) => void) | undefined;
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise<Response>(resolve => { finish = resolve; }));
    const first = downloadContent(manifest, () => {});
    await vi.waitFor(() => expect(finish).toBeDefined());
    const replacement: Content = { ...manifest, playlist: manifest.playlist ? { ...manifest.playlist, updated_at: '2026-11-21T00:00:00Z', items: [{ ...item, display_duration: 23 }] } : null };
    const second = downloadContent(replacement, () => {});
    finish?.(new Response('data'));
    await Promise.all([first, second]);
    expect(await readContent()).toEqual(replacement);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('stores webpage instructions without fetching HTML into the media cache', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch');
    const webpage: Item = { ...item, media: { id: item.id, name: 'Site', type: 'webpage', size: 0, duration: 30, webpage_url: 'https://example.com', refresh_minutes: 0, webpage_fullscreen: true } };
    const content: Content = { ...manifest, playlist: manifest.playlist ? { ...manifest.playlist, items: [webpage] } : null };
    await downloadContent(content, () => {});
    expect(fetcher).not.toHaveBeenCalled(); expect(await readContent()).toEqual(content); expect(await cachedMedia(content, webpage)).toBeUndefined();
  });
});