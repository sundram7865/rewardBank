export function msToMinutes(ms: number): number {
  return Math.ceil(ms / 60000);
}

export function minutesToMs(minutes: number): number {
  return minutes * 60000;
}