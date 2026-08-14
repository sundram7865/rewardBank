export function buildSessionDedupeKey(
  childId: string,
  appId: string,
  startedAt: number,
  endedAt: number
): string {
  return `${childId}:${appId}:${startedAt}:${endedAt}`;
}