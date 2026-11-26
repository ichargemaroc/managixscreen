type HealthScreen = { status: 'online' | 'offline' | 'pending'; groupId: string | null };

export function screenHealth(screens: readonly HealthScreen[]) {
  const online = screens.filter((screen) => screen.status === 'online').length;
  const pending = screens.filter((screen) => screen.status === 'pending').length;
  return { total: screens.length, online, pending, offline: screens.length - online - pending,
    percentage: screens.length ? Math.round(online / screens.length * 100) : 0 };
}

export function screenGroupCounts(screens: readonly HealthScreen[], groups: readonly { id: string; name: string }[]) {
  return [...groups.map((group) => ({ id: group.id, name: group.name, count: screens.filter((s) => s.groupId === group.id).length })),
    { id: '__none', name: 'Sans groupe', count: screens.filter((s) => !s.groupId || !groups.some((g) => g.id === s.groupId)).length }];
}