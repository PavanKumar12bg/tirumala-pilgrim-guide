import { describe, expect, it } from "vitest";
import { dailyStatus, waitingChange, type StatusEntry } from "./status-history";
const row = (day: string, time: string, wait: number | null): StatusEntry => ({ id: time, entry_date: day, recorded_at: time, darshan_wait_hours: wait, crowd_level: null, darshan_note: {} });
describe("daily admin history", () => {
 it("uses the latest saved entry per day without inventing missing days", () => {
  const rows = [row("2026-11-01", "2026-11-01T07:00:00Z", 4), row("2026-11-01", "2026-11-01T09:00:00Z", 6), row("2026-11-03", "2026-11-03T09:00:00Z", 2)];
  expect(dailyStatus(rows).map(r => [r.entry_date, r.darshan_wait_hours])).toEqual([["2026-11-01", 6], ["2026-11-03", 2]]);
 });
 it("compares recorded waits and never converts unavailable data to zero", () => {
  expect(waitingChange([row("2026-11-01", "a", 6), row("2026-11-02", "b", 2)])).toBe(-4);
  expect(waitingChange([row("2026-11-01", "a", 6), row("2026-11-02", "b", null)])).toBeNull();
 });
});