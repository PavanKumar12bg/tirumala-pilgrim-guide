export const TTD_NEWS_URL = "https://news.tirumala.org/";
export type TtdReport = {
  source_url: string;
  report_date: string;
  wait_min_hours: number;
  wait_max_hours: number;
  waiting_compartments: number | null;
};

/** Parse explicit official figures only; queue counts are never converted to a crowd rating. */
export function parseTtdReport(text: string, sourceUrl: string): TtdReport | null {
  const url = new URL(sourceUrl);
  if (url.origin !== "https://news.tirumala.org") return null;
  const normalized = text.replace(/\s+/g, " ");
  const date = normalized.match(/Present Situation on\s+(\d{2})[-.](\d{2})[-.](\d{4})/i);
  const wait = normalized.match(/Approx\.?\s*Darshan Time for Sarva\s*darshanam\s*\(with\s*out SSD Tokens\)[\s.…:–-]*(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*(?:H\b|hours?\b)/i);
  if (!date || !wait) return null;
  const reportDate = `${date[3]}-${date[2]}-${date[1]}`;
  const parsed = new Date(`${reportDate}T00:00:00+05:30`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) !== reportDate) return null;
  const min = Number(wait[1]);
  const max = Number(wait[2] ?? wait[1]);
  if (min < 0 || max < min || max > 168) return null;
  const compartments = normalized.match(/Waiting Compartments[\s.…:–-]*(\d+)\b/i);
  return { source_url: url.href, report_date: reportDate, wait_min_hours: min, wait_max_hours: max, waiting_compartments: compartments ? Number(compartments[1]) : null };
}

export function isCurrentTtdReport(report: TtdReport, now = new Date()) {
  return report.report_date === now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}
/** Rise in the upper official wait estimate between two consecutive daily reports, in hours; null when not comparable. */
export function waitJumpHours(current: TtdReport | null | undefined, previous: TtdReport | null | undefined) {
  if (!current || !previous || previous.report_date >= current.report_date) return null;
  return current.wait_max_hours - previous.wait_max_hours;
}
export const WAIT_JUMP_ALERT_HOURS = 1;
export function shouldAlertWaitJump(current: TtdReport | null | undefined, previous: TtdReport | null | undefined) {
  const jump = waitJumpHours(current, previous);
  return jump != null && jump > WAIT_JUMP_ALERT_HOURS;
}
