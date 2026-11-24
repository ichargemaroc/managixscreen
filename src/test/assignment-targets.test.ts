import { describe, expect, it } from 'vitest';
import { resolveAssignmentTargets } from '@/lib/assignment-targets';

const screens = [{ id: 'a', groupId: 'g1' }, { id: 'b', groupId: 'g2' }, { id: 'c', groupId: null }];
describe('resolveAssignmentTargets', () => {
  it('ne réaffecte pas une TV déjà incluse par un groupe sélectionné', () => {
    expect(resolveAssignmentTargets(screens, ['a', 'c'], ['g1'])).toEqual({ groupIds: ['g1'], screenIds: ['c'], coveredScreenIds: ['a'] });
  });
  it('garde une TV dont le groupe n’est pas sélectionné', () => {
    expect(resolveAssignmentTargets(screens, ['b'], ['g1']).screenIds).toEqual(['b']);
  });
});
