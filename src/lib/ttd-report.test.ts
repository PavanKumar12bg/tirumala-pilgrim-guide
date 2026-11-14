import { describe, expect, it } from "vitest";
import { isCurrentTtdReport, parseTtdReport } from "./ttd-report";

const url = "https://news.tirumala.org/total-pilgrims-who-had-darshan-on-01-11-2026-77010/";
const text = "Total pilgrims who had darshan on 01.11.2026: 77,010 Present Situation on 02-11-2026: Waiting Compartments..06 Approx. Darshan Time for Sarvadarshanam (without SSD Tokens)…4-6 H.";
describe("official TTD reports", () => {
  it("preserves the official 4–6 hour range and six compartments, not yesterday's attendance", () => {
    expect(parseTtdReport(text, url)).toEqual({ source_url: url, report_date: "2026-11-02", wait_min_hours: 4, wait_max_hours: 6, waiting_compartments: 6 });
  });
  it("never invents a missing wait or queue figure", () => {
    expect(parseTtdReport("Present Situation on 02-11-2026", url)).toBeNull();
    expect(parseTtdReport(text.replace("Waiting Compartments..06", ""), url)?.waiting_compartments).toBeNull();
  });
  it("rejects an unrelated source", () => {
    expect(parseTtdReport(text, "https://example.com/")).toBeNull();
  });
  it("marks yesterday's report as stale using the India calendar day", () => {
    const report = parseTtdReport(text, url);
    if (!report) throw new Error("Expected valid fixture");
    expect(isCurrentTtdReport(report, new Date("2026-11-01T19:00:00Z"))).toBe(true);
    expect(isCurrentTtdReport(report, new Date("2026-11-02T19:00:00Z"))).toBe(false);
  });
});
import { shouldAlertWaitJump, waitJumpHours } from "./ttd-report";
describe("wait jump alert", () => {
  const r = (d: string, max: number) => ({ source_url: url, report_date: d, wait_min_hours: max - 2, wait_max_hours: max, waiting_compartments: 1 });
  it("alerts only when the wait rises by more than one hour", () => {
    expect(shouldAlertWaitJump(r("2026-11-02", 8), r("2026-11-01", 6))).toBe(true);
    expect(shouldAlertWaitJump(r("2026-11-02", 7), r("2026-11-01", 6))).toBe(false);
    expect(shouldAlertWaitJump(r("2026-11-02", 6), r("2026-11-01", 8))).toBe(false);
  });
  it("never compares without a genuine earlier report", () => {
    expect(waitJumpHours(r("2026-11-02", 8), null)).toBeNull();
    expect(waitJumpHours(r("2026-11-02", 8), r("2026-11-02", 2))).toBeNull();
  });
});
