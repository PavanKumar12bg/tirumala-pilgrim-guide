import { expect, it, vi } from "vitest";

it("reads official paragraph HTML and retains a last successful report on fetch failure", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-02T02:00:00Z"));
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([{
    link: "https://news.tirumala.org/verified-report/",
    content: { rendered: "<div><p>Present Situation on 02-11-2026:</p><p>Waiting Compartments..06</p><p>Approx. Darshan Time for Sarvadarshanam (without SSD Tokens)&#8230;4-6 H.</p></div>" },
  }])));
  vi.stubGlobal("fetch", fetchMock);
  try {
    const { readOfficialReport } = await import("./ttd-report.server");
    const result = await readOfficialReport();
    expect(result.report?.wait_min_hours).toBe(4);
    expect(result.report?.wait_max_hours).toBe(6);
    expect(result.report?.waiting_compartments).toBe(6);
    await readOfficialReport();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(11 * 60_000);
    fetchMock.mockRejectedValue(new Error("Source offline"));
    const failed = await readOfficialReport();
    expect(failed.unavailable).toBe(true);
    expect(failed.report).toEqual(result.report);
  } finally {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  }
});