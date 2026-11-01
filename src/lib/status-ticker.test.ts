import { describe, expect, it } from "vitest";
import { statusTickerValues } from "./status-ticker";
import type { SiteStatus } from "./places";

const status: SiteStatus = { darshan_wait_hours: null, crowd_level: null, darshan_note: {}, updated_at: "2026-11-01T08:36:00Z" };
describe("stored status for the announcement ticker", () => {
  it("does not invent waiting time or crowd when unset", () => {
    expect(statusTickerValues(status)).toEqual([]);
    expect(statusTickerValues(null)).toEqual([]);
  });
  it("uses the exact stored waiting time and crowd", () => {
    expect(statusTickerValues({ ...status, darshan_wait_hours: 4.5, crowd_level: "high" })).toEqual([{ kind: "wait", value: 4.5 }, { kind: "crowd", value: "high" }]);
  });
  it("preserves a reported zero-hour wait without requiring a crowd value", () => {
    expect(statusTickerValues({ ...status, darshan_wait_hours: 0 })).toEqual([{ kind: "wait", value: 0 }]);
  });
});