import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { InfoPage, pageMeta } from "@/components/InfoPage";
import { StatusCards } from "@/components/HomeSections";
import { useI18n } from "@/lib/i18n";
import { officialStatusQuery } from "@/lib/places";
import { TTD_NEWS_URL } from "@/lib/ttd-report";
import { TirumalaInfoLink } from "@/components/TirumalaInfoLink";
export const Route = createFileRoute("/ttd")({ head: () => pageMeta("Official TTD reports", "Links to TTD's official news site and today's full daily darshan report."), component: Page });
function Page() {
  const { t } = useI18n();
  const { data } = useQuery(officialStatusQuery());
  const btn = "flex min-h-12 items-center justify-between gap-2 rounded-lg bg-card px-4 font-semibold text-primary shadow-soft ring-1 ring-border";
  return <InfoPage title={t("ttdPage")}>
    <p>{t("ttdPageBody")}</p>
    {data?.report ? <a className={btn} href={data.report.source_url} target="_blank" rel="noopener noreferrer">{t("readFullReport")}<ExternalLink className="size-4" aria-hidden /></a> : null}
    <a className={btn} href={TTD_NEWS_URL} target="_blank" rel="noopener noreferrer">{t("openTtdSite")}<ExternalLink className="size-4" aria-hidden /></a>
    <StatusCards />
    <TirumalaInfoLink />
    <p className="text-sm text-muted-foreground">{t("notAffiliated")}</p>
  </InfoPage>;
}
