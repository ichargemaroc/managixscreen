import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { cachedMedia, clearMediaCache, commandReceipt, downloadContent, readContent, saveEntitlement, saveReceipt } from '@/player/cache';
import { contentSchema } from '@/player/protocol';

describe('Reversible player entitlement', () => {
  it('retains media and receipts while persisting deactivation across restart', async () => {
    await clearMediaCache();
    const content = contentSchema.parse({ screen_id: '11111111-1111-4111-8111-111111111111', assignment_updated_at: '2026-11-22T09:00:00Z', last_sync_at: '2026-11-22T09:00:00Z', playlist: { id: '22222222-2222-4222-8222-222222222222', name: 'Existing', updated_at: '1', items: [{ id: '33333333-3333-4333-8333-333333333333', position: 0, display_duration: 10, media: { id: '44444444-4444-4444-8444-444444444444', name: 'Image', type: 'image', size: 4, duration: null, download_url: 'https://example.test/image' } }] } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['test']) }));
    try {
      await downloadContent(content, () => {});
      await saveReceipt('entitlement-test', { status: 'completed' });
      await saveEntitlement(content.screen_id, { version: 1, active: false, revision: 2 });
      expect((await readContent())?.entitlement?.active).toBe(false);
      expect((await readContent())?.playlist?.items.length).toBe(1);
      const item = content.playlist?.items[0];
      if (!item) throw new Error('Missing test item');
      expect(await cachedMedia(content, item)).toBeDefined();
      expect((await commandReceipt('entitlement-test'))?.status).toBe('completed');
      await saveEntitlement(content.screen_id, { version: 1, active: true, revision: 3 });
      expect((await readContent())?.entitlement?.active).toBe(true);
    } finally { vi.unstubAllGlobals(); await clearMediaCache(); }
  });
  it('accepts old manifests without forcing deactivation', () => {
    const old = contentSchema.parse({ screen_id: '11111111-1111-4111-8111-111111111111', assignment_updated_at: 'now', last_sync_at: 'now', playlist: null });
    expect(old.entitlement).toBeUndefined();
  });
});