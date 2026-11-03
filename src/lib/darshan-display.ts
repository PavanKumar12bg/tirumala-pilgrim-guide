import type { TtdReport } from "./ttd-report";

export type ManualDarshan = {
  manual_mode?: string | null;
  manual_wait_min_hours?: number | string | null;
  manual_wait_max_hours?: number | string | null;
  manual_compartments?: number | null;
  manual_updated_at?: string | null;
};

export type DarshanDisplay = {
  source: "ttd" | "admin";
  wait_min_hours: number | null;
  wait_max_hours: number | null;
  waiting_compartments: number | null;
  /** TTD report date (YYYY-MM-DD) or admin save time (ISO). */
  as_of: string | null;
  source_url?: string;
};

const num = (v: unknown) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

function manualFigures(m: ManualDarshan | null | undefined): DarshanDisplay | null {
  if (!m) return null;
  let min = num(m.manual_wait_min_hours);
  let max = num(m.manual_wait_max_hours);
  if (min == null) min = max;
  if (max == null) max = min;
  const comp = num(m.manual_compartments);
  if (min == null && comp == null) return null;
  return { source: "admin", wait_min_hours: min, wait_max_hours: max, waiting_compartments: comp, as_of: m.manual_updated_at ?? null };
}

/**
 * Admin figures win when the admin switched to manual mode.
 * Otherwise the official TTD report is shown; admin figures are only a fallback when no TTD report could be read.
 */
export function resolveDarshan(report: TtdReport | null | undefined, manual: ManualDarshan | null | undefined): DarshanDisplay | null {
  const admin = manualFigures(manual);
  if (admin && manual?.manual_mode === "manual") return admin;
  if (report) return { source: "ttd", wait_min_hours: report.wait_min_hours, wait_max_hours: report.wait_max_hours, waiting_compartments: report.waiting_compartments, as_of: report.report_date, source_url: report.source_url };
  return admin;
}

export const formatWait = (d: DarshanDisplay) =>
  d.wait_min_hours == null ? null : d.wait_min_hours === d.wait_max_hours ? String(d.wait_min_hours) : `${d.wait_min_hours}–${d.wait_max_hours}`;
