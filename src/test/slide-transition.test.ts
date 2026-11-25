import { describe, expect, it } from 'vitest';
import { resolveSlideTransition, slideTransitionSchema } from '@/lib/slide-transition';
import { contentSchema, playerPlaylistSchema } from '@/player/protocol';
import { manifestSchema } from '@/lib/player-protocol';

describe('slide transitions', () => {
  it('preserves the playlist animation through server and player manifests', () => {
    const playlist = { id: '00000000-0000-4000-8000-000000000000', name: 'Playlist', updated_at: 'v1', slide_transition: 'zoom', items: [] };
    const server = manifestSchema.parse({ screen_id: playlist.id, assignment_updated_at: 'x', slide_transition: 'zoom', playlist });
    expect(server.playlist?.slide_transition).toBe('zoom');
    const player = contentSchema.parse({ ...server, last_sync_at: 'x' });
    expect(player.playlist?.slide_transition).toBe('zoom');
    expect(player.slide_transition).toBe('zoom');
  });
  it('keeps independent animations on zone playlists', () => {
    const base = { id: '00000000-0000-4000-8000-000000000000', name: 'Zone', updated_at: 'v1', items: [] };
    expect(playerPlaylistSchema.parse({ ...base, slide_transition: 'fade' }).slide_transition).toBe('fade');
    expect(playerPlaylistSchema.parse({ ...base, slide_transition: 'spin' }).slide_transition).toBe('spin');
  });
  it('falls back to default for unknown or missing values', () => {
    expect(slideTransitionSchema.catch('default').parse('nope')).toBe('default');
    expect(contentSchema.parse({ screen_id: '00000000-0000-4000-8000-000000000000', assignment_updated_at: 'x', last_sync_at: 'x', playlist: null }).slide_transition).toBe('default');
  });
  it('random resolves to a concrete animation, never random or default', () => {
    for (const k of ['a', 'b', '1:x', '2:y']) expect(['random', 'default']).not.toContain(resolveSlideTransition('random', k));
    expect(resolveSlideTransition('zoom', 'a')).toBe('zoom');
  });
});
