import { describe, expect, it } from 'vitest';
import { resolveAssignmentTargets, sameAssignmentSelection } from '@/lib/assignment-targets';

const screens = [{ id: 'a', groupId: 'g1' }, { id: 'b', groupId: 'g2' }, { id: 'c', groupId: null }];
describe('resolveAssignmentTargets', () => {
  it('ne réaffecte pas une TV déjà incluse par un groupe sélectionné', () => {
    expect(resolveAssignmentTargets(screens, ['a', 'c'], ['g1'])).toEqual({ groupIds: ['g1'], screenIds: ['c'], coveredScreenIds: ['a'] });
  });
  it('garde une TV dont le groupe n’est pas sélectionné', () => {
    expect(resolveAssignmentTargets(screens, ['b'], ['g1']).screenIds).toEqual(['b']);
  });
  it('retire la couverture d’une TV lorsque son groupe est décoché', () => {
    expect(resolveAssignmentTargets(screens, [], []).coveredScreenIds).toEqual([]);
    expect(resolveAssignmentTargets(screens, [], ['g1']).coveredScreenIds).toEqual(['a']);
  });
  it('compte une seule fois les TV présentes dans plusieurs groupes', () => {
    const result = resolveAssignmentTargets(screens, ['a'], ['g1','g2'], [{id:'g1',screenIds:['a']},{id:'g2',screenIds:['a','b']}]);
    expect(result.screenIds).toEqual([]);
    expect(result.coveredScreenIds).toEqual(['a','b']);
  });
  it('détecte les retraits même si la sélection devient vide', () => {
    expect(sameAssignmentSelection([], ['a'])).toBe(false);
    expect(sameAssignmentSelection(['a','b'], ['b','a'])).toBe(true);
  });
});
