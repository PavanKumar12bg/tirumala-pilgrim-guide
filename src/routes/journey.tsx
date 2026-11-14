import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, CalendarDays, Check, MapPin, Plus, Sunrise, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlaceImage } from "@/components/PlaceImage";
import { pickLocalized, useI18n } from "@/lib/i18n";
import { placesQuery } from "@/lib/places";
import { JOURNEY_STORAGE_KEY, journeySchema, moveStop, newDay, nextDate, type JourneyDay } from "@/lib/journey";

export const Route = createFileRoute("/journey")({
  loader: ({ context }) => context.queryClient.ensureQueryData(placesQuery()),
  head: () => ({ meta: [
    { title: "My journey — Tirumala Guide" },
    { name: "description", content: "Plan each day in Tirumala with morning starts, place visits and personal arrival times." },
    { property: "og:title", content: "My journey — Tirumala Guide" },
    { property: "og:description", content: "Build a personal day-by-day Tirumala itinerary." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: JourneyPage,
});

function JourneyPage() {
  const { t, lang } = useI18n();
  const { data } = useSuspenseQuery(placesQuery());
  const places = data.filter((p) => p.visible);
  const [days, setDays] = useState<JourneyDay[]>([]);
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [placeId, setPlaceId] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(JOURNEY_STORAGE_KEY);
      setDays(saved ? journeySchema.parse(JSON.parse(saved)) : [newDay()]);
    } catch { setDays([newDay()]); setLoadError(true); }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify(days)); setSaveError(false); }
    catch { setSaveError(true); }
  }, [days, ready]);
  const day = days[active];
  const update = (fn: (d: JourneyDay) => JourneyDay) => setDays((ds) => ds.map((d, i) => i === active ? fn(d) : d));
  const options = places.filter((p) => pickLocalized(p.name, lang).toLowerCase().includes(query.toLowerCase()));
  const visited = days.reduce((n, d) => n + d.stops.filter((s) => s.visitedAt).length, 0);

  return <AppShell>
    <div className="mx-auto max-w-3xl px-4 py-7">
      <div className="flex items-start justify-between gap-3">
        <div><p className="flex items-center gap-2 text-sm font-semibold text-gold"><CalendarDays className="size-4" />{t("journey")}</p>
          <h1 className="mt-2 text-3xl leading-tight">{t("journeyTitle")}</h1></div>
        <Button variant="outline" size="icon" className="size-11 shrink-0" title={t("addDay")} aria-label={t("addDay")} disabled={!ready} onClick={() => {
          const last = days[days.length - 1];
          setDays([...days, newDay(last ? nextDate(last.date) : undefined)]); setActive(days.length); setPlaceId("");
        }}><Plus /></Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground" role="status">{saveError ? t("storageError") : ready ? t("savedDevice") : t("loading")} · {t("visitedTotal")}: {visited}</p>
      {loadError ? <p role="alert" className="mt-2 text-sm text-destructive">{t("plannerLoadError")}</p> : null}
      <div className="mt-6 flex gap-2 overflow-x-auto border-b pb-3" role="tablist" aria-label={t("journey")}>
        {days.map((d, i) => <Button key={d.id} role="tab" aria-selected={i === active} variant={i === active ? "default" : "ghost"} className="min-h-11 shrink-0" onClick={() => { setActive(i); setPlaceId(""); }}>{t("day")} {i + 1}</Button>)}
      </div>
      {day ? <div role="tabpanel">
        <div className="grid grid-cols-2 gap-3 py-5">
          <div className="min-w-0 space-y-2"><Label htmlFor="journey-date">{t("date")}</Label><Input className="h-12 w-full min-w-0" id="journey-date" type="date" value={day.date} onChange={(e) => { if (e.target.value) update((d) => ({ ...d, date: e.target.value })); }} /></div>
          <div className="min-w-0 space-y-2"><Label className="flex items-center gap-1" htmlFor="journey-start"><Sunrise className="size-4 shrink-0" />{t("morningStart")}</Label><Input id="journey-start" className="h-12 w-full min-w-0" type="time" value={day.start} onChange={(e) => { if (e.target.value) update((d) => ({ ...d, start: e.target.value })); }} /></div>
        </div>
        <ol className="space-y-4">
          {day.stops.map((stop, index) => {
            const p = places.find((p) => p.id === stop.placeId);
            return <li key={stop.id} className="rounded-lg border bg-card p-3">
              <div className="flex items-center gap-3">
                <div className="size-12 shrink-0 overflow-hidden rounded-md">{p ? <PlaceImage src={p.imageSrc} category={p.category} alt={pickLocalized(p.name, lang)} /> : <MapPin className="size-6" />}</div>
                <div className="min-w-0 flex-1"><p className="text-xs text-gold">{index + 1}</p><h2 className="break-words text-lg leading-snug">{p ? pickLocalized(p.name, lang) : t("coordsPending")}</h2></div>
                <Button variant="ghost" size="icon" className="size-11 shrink-0" title={t("removeStop")} aria-label={t("removeStop")} onClick={() => update((d) => ({ ...d, stops: d.stops.filter((s) => s.id !== stop.id) }))}><Trash2 className="text-destructive" /></Button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="min-w-0 space-y-1"><Label htmlFor={`arrival-${stop.id}`}>{t("plannedArrival")}</Label><Input id={`arrival-${stop.id}`} className="h-11 min-w-0" type="time" min={day.start} value={stop.arrival} onChange={(e) => update((d) => ({ ...d, stops: d.stops.map((s) => s.id === stop.id ? { ...s, arrival: e.target.value } : s) }))} /></div>
                <div className="space-y-1 text-sm"><p className="text-muted-foreground">{t("actualArrival")}</p><p>{stop.visitedAt ? new Date(stop.visitedAt).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" }) : "—"}</p></div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1">
                <Button variant={stop.visitedAt ? "secondary" : "outline"} aria-pressed={!!stop.visitedAt} className="min-h-11 max-w-full whitespace-normal text-left" onClick={() => update((d) => ({ ...d, stops: d.stops.map((s) => s.id === stop.id ? { ...s, visitedAt: s.visitedAt ? null : new Date().toISOString() } : s) }))}><Check />{stop.visitedAt ? t("visited") : t("markVisited")}</Button>
                <Button variant="ghost" size="icon" className="size-11" aria-label={t("moveUp")} title={t("moveUp")} disabled={index === 0} onClick={() => update((d) => ({ ...d, stops: moveStop(d.stops, stop.id, -1) }))}><ArrowUp /></Button>
                <Button variant="ghost" size="icon" className="size-11" aria-label={t("moveDown")} title={t("moveDown")} disabled={index === day.stops.length - 1} onClick={() => update((d) => ({ ...d, stops: moveStop(d.stops, stop.id, 1) }))}><ArrowDown /></Button>
                {p ? <Button variant="ghost" size="icon" className="size-11" asChild><Link to="/map" search={{ place: p.slug }} aria-label={t("viewOnMap")} title={t("viewOnMap")}><MapPin /></Link></Button> : null}
              </div>
            </li>;
          })}
        </ol>
        {!day.stops.length ? <p className="border-y py-8 text-center text-muted-foreground">{t("emptyDay")}</p> : null}
        <form className="mt-6 space-y-3 border-t pt-5" onSubmit={(e) => {
          e.preventDefault(); if (!places.some((p) => p.id === placeId)) return;
          update((d) => ({ ...d, stops: [...d.stops, { id: crypto.randomUUID(), placeId, arrival: "", visitedAt: null }] })); setPlaceId("");
        }}>
          <Input className="h-11" placeholder={t("searchPlaces")} aria-label={t("searchPlaces")} value={query} onChange={(e) => { setQuery(e.target.value); setPlaceId(""); }} />
          <Label htmlFor="journey-place">{t("selectDestination")}</Label>
          <select id="journey-place" className="h-12 w-full min-w-0 rounded-md border border-input bg-card px-2 text-base" value={placeId} onChange={(e) => setPlaceId(e.target.value)}>
            <option value="">{t("selectDestination")}</option>{options.map((p) => <option key={p.id} value={p.id}>{pickLocalized(p.name, lang)}</option>)}
          </select>
          <Button className="min-h-12 w-full" disabled={!placeId} type="submit"><Plus />{t("addStop")}</Button>
        </form>
        {days.length > 1 ? <Button variant="ghost" className="mt-5 min-h-11 text-destructive" onClick={() => {
          if (!confirm(t("removeDayConfirm"))) return;
          setDays(days.filter((_, i) => i !== active)); setActive(Math.max(0, active - 1));
        }}><Trash2 />{t("removeDay")}</Button> : null}
      </div> : null}
    </div>
  </AppShell>;
}