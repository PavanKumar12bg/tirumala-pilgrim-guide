import { describe, expect, it } from "vitest";
import { resolveDarshan } from "./darshan-display";

const ttd = { source_url: "https://news.tirumala.org/x/", report_date: "2026-11-03", wait_min_hours: 6, wait_max_hours: 8, waiting_compartments: 14 };
const manual = { manual_wait_min_hours: 10, manual_wait_max_hours: 12, manual_compartments: 25, manual_updated_at: "2026-11-03T04:00:00Z" };

describe("darshan figures shown to pilgrims", () => {
  it("shows the admin's figures when the admin turned on manual mode", () => {
    const d = resolveDarshan(ttd, { ...manual, manual_mode: "manual" });
    expect(d).toMatchObject({ source: "admin", wait_min_hours: 10, wait_max_hours: 12, waiting_compartments: 25 });
  });
  it("shows the TTD report in automatic mode even if admin figures are saved", () => {
    expect(resolveDarshan(ttd, { ...manual, manual_mode: "auto" })).toMatchObject({ source: "ttd", wait_min_hours: 6, waiting_compartments: 14 });
  });
  it("falls back to admin figures when no TTD report can be read", () => {
    expect(resolveDarshan(null, { ...manual, manual_mode: "auto" })?.source).toBe("admin");
  });
  it("uses the TTD report when manual mode is on but no figures were entered", () => {
    expect(resolveDarshan(ttd, { manual_mode: "manual" })?.source).toBe("ttd");
  });
  it("shows nothing rather than inventing figures", () => {
    expect(resolveDarshan(null, { manual_mode: "manual" })).toBeNull();
  });
});
