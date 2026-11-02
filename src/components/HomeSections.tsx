import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, MapPin, Users, ChevronRight, AlertCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { catKey, CATEGORIES, hasVerifiedCoords, placesQuery, officialStatusQuery } from "@/lib/places";
import { isCurrentTtdReport } from "@/lib/ttd-report";
import { pickLocalized, useI18n } from "@/lib/i18n";
import { PlaceImage } from "./PlaceImage";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import hillsImg from "@/assets/tirumala-hills.jpg";

export function StatusCards() {
  const { t, lang } = useI18n();
  const { data, isLoading, isError, refetch } = useQuery(officialStatusQuery());
  const report = data?.report;

  if (isError) return <ErrorBox onRetry={() => refetch()} />;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="min-w-0 rounded-lg bg-card p-3 shadow-soft ring-1 ring-border">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Clock className="size-4 text-gold" aria-hidden />
          {t("darshanWait")}
        </div>
        {isLoading ? <Skeleton className="mt-3 h-9 w-20" /> : report ? (
          <p className="mt-2 font-display text-3xl text-primary">
            {report.wait_min_hours === report.wait_max_hours ? report.wait_min_hours : `${report.wait_min_hours}–${report.wait_max_hours}`} <span className="text-base font-sans text-muted-foreground">{t("hours")}</span>
          </p>
        ) : (
          <p className="mt-3 text-sm font-medium text-muted-foreground">{t("unavailable")}</p>
        )}
      </div>
      <div className="min-w-0 rounded-lg bg-card p-3 shadow-soft ring-1 ring-border">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Users className="size-4 text-gold" aria-hidden />
          {t("queueCompartments")}
        </div>
        {isLoading ? <Skeleton className="mt-3 h-9 w-24" /> : report?.waiting_compartments != null ? (
            <p className="mt-2 font-display text-3xl text-primary">{report.waiting_compartments}</p>
        ) : (
          <p className="mt-3 text-sm font-medium text-muted-foreground">{t("unavailable")}</p>
        )}
      </div>
      <p className="col-span-2 flex items-start gap-1.5 px-1 text-xs text-muted-foreground">
        <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span className="space-y-1">
          <span className="block">{report ? <a href={report.source_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{t("officialReport")}</a> : t("reportUnavailable")}{report ? ` · ${t("reportDate")}: ${new Date(`${report.report_date}T00:00:00+05:30`).toLocaleDateString(lang, { timeZone: "Asia/Kolkata" })}` : ""}</span>
          <span className="block">{t("reportNotLive")}</span>
          {report && !isCurrentTtdReport(report) ? <span className="block text-warning">{t("reportStale")}</span> : null}
          {data?.unavailable && report ? <span className="block text-warning">{t("reportUnavailable")}</span> : null}
          {data?.checked_at ? <span className="block">{t("checkedAt")}: {new Date(data.checked_at).toLocaleString(lang, { timeZone: "Asia/Kolkata" })}</span> : null}
        </span>
      </p>
    </div>
  );
}

export function RouteMapCard() {
  const { t } = useI18n();
  return (
    <Link to="/map" className="group relative block overflow-hidden rounded-3xl shadow-lift ring-1 ring-border">
      <img src={hillsImg} alt="" width={1600} height={912} loading="lazy" className="h-44 w-full object-cover transition-transform duration-700 group-hover:scale-105 sm:h-56" />
      <div className="absolute inset-0 bg-hero-fade" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 text-primary-foreground">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
            <MapPin className="size-4" aria-hidden /> OpenStreetMap
          </p>
          <h2 className="mt-1 text-2xl">{t("routeMapTitle")}</h2>
          <p className="mt-0.5 text-sm text-primary-foreground/80">{t("routeMapSub")}</p>
        </div>
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground transition-transform group-hover:translate-x-1">
          <ChevronRight className="size-6" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

export function ErrorBox({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-card p-4 ring-1 ring-destructive/30">
      <p className="text-sm text-destructive">{t("errorLoad")}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>{t("retry")}</Button>
    </div>
  );
}

export function PlacesGrid() {
  const { t, lang } = useI18n();
  const { data, isLoading, isError, refetch } = useQuery(placesQuery());
  const [cat, setCat] = useState<string>("all");
  const [showAll, setShowAll] = useState(false);
  const places = useMemo(() => (data ?? []).filter((p) => p.visible), [data]);
  const presentCats = CATEGORIES.filter((c) => places.some((p) => p.category === c.id));
  const matching = cat === "all" ? places : places.filter((p) => p.category === cat);
  const shown = showAll ? matching : matching.slice(0, 8);

  return (
    <section aria-labelledby="places-h">
      <h2 id="places-h" className="text-2xl text-primary">{t("places")}</h2>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-2" role="tablist">
        {[{ id: "all" }, ...presentCats].map((c) => (
          <Button
            key={c.id}
            role="tab"
            aria-selected={cat === c.id}
            onClick={() => setCat(c.id)}
            className={cn(
              "min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold ring-1 transition-colors",
              cat === c.id ? "bg-primary text-primary-foreground ring-primary" : "bg-card text-foreground ring-border",
            )}
          >
            {c.id === "all" ? t("all") : t(catKey(c.id))}
          </Button>
        ))}
      </div>
      {isError ? <ErrorBox onRetry={() => refetch()} /> : null}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[4/5] rounded-2xl" />)
          : shown.map((p, i) => {
              const name = pickLocalized(p.name, lang);
              const onMap = hasVerifiedCoords(p);
              return (
                <Link
                  key={p.id}
                  to="/map"
                  search={{ place: p.slug }}
                  className="animate-rise group flex flex-col overflow-hidden rounded-2xl bg-card shadow-soft ring-1 ring-border"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="aspect-[4/3] overflow-hidden">
                    <PlaceImage src={p.imageSrc} category={p.category} alt={name} className="transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <div className="flex flex-1 flex-col p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gold">{t(catKey(p.category))}</p>
                    <h3 className="mt-0.5 text-base leading-snug text-foreground">{name}</h3>
                    {!onMap ? <p className="mt-auto pt-2 text-[11px] text-muted-foreground">⏳ {t("coordsPending")}</p> : null}
                  </div>
                </Link>
              );
            })}
      </div>
      {!isLoading && !shown.length ? <p className="mt-4 text-sm text-muted-foreground">{t("noPlaces")}</p> : null}
      {matching.length > shown.length ? (
        <Button variant="outline" className="mt-4 min-h-12 w-full" onClick={() => setShowAll(true)}>
          {t("all")} ({matching.length})
        </Button>
      ) : null}
    </section>
  );
}
