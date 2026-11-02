import type { CrowdLevel, Localized } from "./places";
export type StatusEntry = { id: string; entry_date: string; recorded_at: string; darshan_wait_hours: number | null; crowd_level: CrowdLevel | null; darshan_note: Localized };
/** The latest actual save per India-calendar day; missing days remain missing. */
export function dailyStatus(entries: StatusEntry[]) {
  const days = new Map<string, StatusEntry>();
  for (const entry of entries) {
    const previous = days.get(entry.entry_date);
    if (!previous || entry.recorded_at > previous.recorded_at) days.set(entry.entry_date, entry);
  }
  return [...days.values()].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
}
export function waitingChange(entries: StatusEntry[]) {
  const days = dailyStatus(entries);
  const last = days.at(-1), previous = days.at(-2);
  return last?.darshan_wait_hours != null && previous?.darshan_wait_hours != null
    ? Number(last.darshan_wait_hours) - Number(previous.darshan_wait_hours) : null;
}