import { describe, expect, it } from 'vitest';
import { resolveSlideTransition, slideTransitionSchema } from '@/lib/slide-transition';
import { contentSchema } from '@/player/protocol';

describe('slide transitions', () => {
  it('falls back to default for unknown or missing values', () => {
    expect(slideTransitionSchema.catch('default').parse('nope')).toBe('default');
    expect(contentSchema.parse({ screen_id: '00000000-0000-4000-8000-000000000000', assignment_updated_at: 'x', last_sync_at: 'x', playlist: null }).slide_transition).toBe('default');
  });
  it('random resolves to a concrete animation, never random or default', () => {
    for (const k of ['a', 'b', '1:x', '2:y']) expect(['random', 'default']).not.toContain(resolveSlideTransition('random', k));
    expect(resolveSlideTransition('zoom', 'a')).toBe('zoom');
  });
});
