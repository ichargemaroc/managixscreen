/** Splits a multi-selection so TVs already covered by a selected group are counted once. */
export function resolveAssignmentTargets(screens: { id: string; groupId: string | null }[], screenIds: string[], groupIds: string[], memberships: { id: string; screenIds: string[] }[] = []) {
  const groups = new Set(groupIds);
  const covered = new Set(screens.filter((s) => s.groupId && groups.has(s.groupId)).map((s) => s.id));
  const knownScreens = new Set(screens.map(s => s.id));
  for (const group of memberships) if (groups.has(group.id)) for (const id of group.screenIds) if (knownScreens.has(id)) covered.add(id);
  const direct = [...new Set(screenIds)].filter((id) => !covered.has(id));
  return { groupIds: [...groups], screenIds: direct, coveredScreenIds: [...covered] };
}

export function sameAssignmentSelection(left: string[], right: string[]) {
  const a = new Set(left), b = new Set(right);
  return a.size === b.size && [...a].every(id => b.has(id));
}

export type PlaylistAudience<TGroup, TScreen> = {
  /** Groups whose stored playlist is this one. */
  groups: TGroup[];
  /** TVs assigned to this playlist on their own card. */
  directScreens: TScreen[];
  /** TVs that receive the playlist through one of the groups above. */
  inheritedScreens: TScreen[];
};

/** Lists every TV and group currently registered on a playlist. */
export function resolvePlaylistAudience<
  TGroup extends { id: string; playlistId: string | null; screenIds: string[] },
  TScreen extends { id: string; playlistId: string | null },
>(groups: TGroup[], screens: TScreen[], playlistId: string): PlaylistAudience<TGroup, TScreen> {
  const assigned = groups.filter((g) => g.playlistId === playlistId);
  const memberIds = new Set(assigned.flatMap((g) => g.screenIds));
  return {
    groups: assigned,
    inheritedScreens: screens.filter((s) => memberIds.has(s.id)),
    directScreens: screens.filter((s) => s.playlistId === playlistId && !memberIds.has(s.id)),
  };
}
