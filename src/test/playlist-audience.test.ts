import { describe, expect, it } from 'vitest';
import { resolvePlaylistAudience } from '@/lib/assignment-targets';

const groups = [
  { id: 'g1', playlistId: 'p1', screenIds: ['a', 'b'] },
  { id: 'g2', playlistId: null, screenIds: ['c'] },
];
const screens = [
  { id: 'a', playlistId: 'p1' },
  { id: 'b', playlistId: 'p1' },
  { id: 'c', playlistId: 'p1' },
  { id: 'd', playlistId: null },
];

describe('resolvePlaylistAudience', () => {
  it('affiche les groupes et les TV enregistrés sur la playlist', () => {
    const audience = resolvePlaylistAudience(groups, screens, 'p1');
    expect(audience.groups.map((g) => g.id)).toEqual(['g1']);
    expect(audience.inheritedScreens.map((s) => s.id)).toEqual(['a', 'b']);
    expect(audience.directScreens.map((s) => s.id)).toEqual(['c']);
  });
  it('ne liste rien pour une playlist sans affectation', () => {
    const audience = resolvePlaylistAudience(groups, screens, 'p9');
    expect(audience.groups).toEqual([]);
    expect(audience.inheritedScreens).toEqual([]);
    expect(audience.directScreens).toEqual([]);
  });
});
