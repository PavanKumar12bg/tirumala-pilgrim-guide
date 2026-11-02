import { parseDocument } from "htmlparser2";
import { getText } from "domutils";
import { parseTtdReport, TTD_NEWS_URL, type TtdReport } from "./ttd-report";

type Result = { report: TtdReport | null; checked_at: string; unavailable: boolean };
let cache: { expires: number; value: Result } | undefined;
let pending: Promise<Result> | undefined;

async function readPosts() {
  const response = await fetch(`${TTD_NEWS_URL}wp-json/wp/v2/posts?search=Total%20pilgrims&per_page=3&orderby=date&order=desc`, { signal: AbortSignal.timeout(10_000), headers: { Accept: "application/json" }, redirect: "error" });
  if (!response.ok) throw new Error("Official source unavailable");
  const html = await response.text();
  if (html.length > 2_000_000) throw new Error("Unexpected report size");
  const data: unknown = JSON.parse(html);
  if (!Array.isArray(data)) throw new Error("Unexpected report format");
  return data;
}

async function refresh(): Promise<Result> {
  try {
    const posts = await readPosts();
    const reports: TtdReport[] = [];
    for (const post of posts.slice(0, 3)) {
      if (!post || typeof post !== "object" || typeof post.link !== "string" || typeof post.content?.rendered !== "string") continue;
      const report = parseTtdReport(getText(parseDocument(post.content.rendered)), post.link);
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