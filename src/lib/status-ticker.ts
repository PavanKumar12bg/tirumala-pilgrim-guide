import type { SiteStatus } from "./places";

/** Only stored values are eligible for the ticker; null is never a live estimate. */
export function statusTickerValues(status: SiteStatus | null | undefined) {
  if (!status) return [];
  const values: ({ kind: "wait"; value: number } | { kind: "crowd"; value: NonNullable<SiteStatus["crowd_level"]> })[] = [];
  if (status.darshan_wait_hours != null && Number.isFinite(Number(status.darshan_wait_hours)) && Number(status.darshan_wait_hours) >= 0) {
    values.push({ kind: "wait", value: Number(status.darshan_wait_hours) });
  }
  if (status.crowd_level && ["low", "moderate", "high", "very_high"].includes(status.crowd_level)) values.push({ kind: "crowd", value: status.crowd_level });
  return values;
}