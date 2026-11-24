/** Splits a multi-selection so TVs already covered by a selected group are counted once. */
export function resolveAssignmentTargets(screens: { id: string; groupId: string | null }[], screenIds: string[], groupIds: string[]) {
  const groups = new Set(groupIds);
  const covered = new Set(screens.filter((s) => s.groupId && groups.has(s.groupId)).map((s) => s.id));
  const direct = [...new Set(screenIds)].filter((id) => !covered.has(id));
  return { groupIds: [...groups], screenIds: direct, coveredScreenIds: [...covered] };
}
