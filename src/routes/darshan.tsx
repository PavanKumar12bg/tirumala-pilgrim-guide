import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StatusCards } from "@/components/HomeSections";
import { TirumalaInfoLink } from "@/components/TirumalaInfoLink";
import { useI18n } from "@/lib/i18n";
export const Route = createFileRoute("/darshan")({ head: () => ({ meta: [
 { title: "Darshan information — Tirumala Guide" }, { name: "description", content: "Official TTD daily Sarvadarshanam wait ranges and occupied queue compartments, with report dates." },
 { property: "og:title", content: "Darshan information — Tirumala Guide" }, { property: "og:description", content: "Latest official TTD daily waiting-time and queue reports, not a live feed." },
 { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
] }), component: DarshanPage });
function DarshanPage() {
  const { t } = useI18n();
  return <AppShell>
    <article className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-10">
      <header className="border-b border-gold/50 pb-5">
        <h1 className="text-3xl text-primary">{t("darshanTitle")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("officialNote")}</p>
      </header>
      <div className="grid gap-8 pt-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section aria-labelledby="report-heading">
          <h2 id="report-heading" className="mb-4 text-xl text-primary">{t("reportHeading")}</h2>
          <StatusCards compact />
        </section>
        <section aria-labelledby="darshan-links" className="border-t pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <h2 id="darshan-links" className="mb-3 text-xl text-primary">{t("informationLinks")}</h2>
          <Link to="/ttd" className="flex min-h-12 items-center justify-between gap-3 border-b py-3 font-semibold text-primary">{t("ttdPage")}<ArrowUpRight className="size-4 shrink-0" aria-hidden /></Link>
          <div className="darshan-external mt-4"><TirumalaInfoLink /></div>
        </section>
      </div>
    </article>
  </AppShell>;
}
