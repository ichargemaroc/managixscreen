import { describe, expect, it } from 'vitest';
import { screenHealth, screenGroupCounts } from '@/lib/screen-health';

describe('screen health', () => {
  it('calculates connectivity without treating pending TVs as online', () => {
    expect(screenHealth([{ status: 'online', groupId: 'g' }, { status: 'offline', groupId: 'g' }, { status: 'pending', groupId: null }, { status: 'online', groupId: null }])).toEqual({ total: 4, online: 2, offline: 1, pending: 1, percentage: 50 });
  });
  it('returns zero for an empty fleet', () => {
    expect(screenHealth([])).toEqual({ total: 0, online: 0, offline: 0, pending: 0, percentage: 0 });
  });
  it('counts every TV once including TVs without a group', () => {
    expect(screenGroupCounts([{ status: 'online', groupId: 'g' }, { status: 'offline', groupId: null }], [{ id: 'g', name: 'Salle' }])).toEqual([{ id: 'g', name: 'Salle', count: 1 }, { id: '__none', name: 'Sans groupe', count: 1 }]);
  });
});