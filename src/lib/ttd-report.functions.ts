import { createServerFn } from "@tanstack/react-start";

export const getOfficialTtdReport = createServerFn({ method: "GET" }).handler(async () => {
  const { readOfficialReport } = await import("./ttd-report.server");
  return readOfficialReport();
});