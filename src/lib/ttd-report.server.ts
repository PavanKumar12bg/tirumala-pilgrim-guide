import { parseDocument } from "htmlparser2";
import { getElementsByTagName, getText, getElementsByClassName } from "domutils";
import { parseTtdReport, TTD_NEWS_URL, type TtdReport } from "./ttd-report";

type Result = { report: TtdReport | null; checked_at: string; unavailable: boolean };
let cache: { expires: number; value: Result } | undefined;
let pending: Promise<Result> | undefined;

async function readHtml(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000), headers: { Accept: "text/html" }, redirect: "error" });
  if (!response.ok) throw new Error("Official source unavailable");
  const html = await response.text();
  if (html.length > 2_000_000) throw new Error("Unexpected report size");
  return parseDocument(html);
}

async function refresh(): Promise<Result> {
  try {
    const document = await readHtml(TTD_NEWS_URL);
    const candidates = getElementsByTagName("a", document.children, true)
      .filter(a => /Total pilgrims who had darshan on/i.test(getText(a)))
      .map(a => a.attribs["href"])
      .filter((href): href is string => Boolean(href) && href?.startsWith(TTD_NEWS_URL) === true);
    const reports: TtdReport[] = [];
    for (const url of [...new Set(candidates)].slice(0, 3)) {
      const article = await readHtml(url);
      const content = getElementsByClassName("entry-content", article.children, true)[0];
      if (!content) continue;
      const report = parseTtdReport(getText(content), url);
      if (report && report.report_date <= new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })) reports.push(report);
    }
    const report = reports.sort((a, b) => b.report_date.localeCompare(a.report_date))[0];
    if (!report) throw new Error("No readable official report");
    const value = { report, checked_at: new Date().toISOString(), unavailable: false };
    cache = { value, expires: Date.now() + 10 * 60_000 };
    return value;
  } catch {
    const value = { report: cache?.value.report ?? null, checked_at: new Date().toISOString(), unavailable: true };
    cache = { value, expires: Date.now() + 60_000 };
    return value;
  }
}

export async function readOfficialReport() {
  if (cache && cache.expires > Date.now()) return cache.value;
  if (pending) return pending;
  pending = refresh();
  try { return await pending; } finally { pending = undefined; }
}