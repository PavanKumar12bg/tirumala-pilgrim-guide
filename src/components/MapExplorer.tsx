import L from "leaflet";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Crosshair, Footprints, Loader2, Navigation, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { catIcon, catKey, CATEGORIES, hasVerifiedCoords, placesQuery, type Place } from "@/lib/places";
import { formatDistance, haversineMeters, isInsideTirumala, osmWalkingUrl, TEMPLE_CENTER, TIRUMALA_BOUNDS, walkingMinutes } from "@/lib/geo";
import { pickLocalized, useI18n } from "@/lib/i18n";
import { PlaceImage } from "./PlaceImage";
import { ErrorBox } from "./HomeSections";
import { cn } from "@/lib/utils";

type Gps = { state: "idle" } | { state: "locating" } | { state: "ok"; pos: [number, number] } | { state: "error"; msg: "gpsDenied" | "gpsUnavailable" };

export default function MapExplorer({ initialSlug }: { initialSlug?: string | undefined }) {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useQuery(placesQuery());
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const meRef = useRef<L.Marker | null>(null);
  const [cat, setCat] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | undefined>(initialSlug);
  const [gps, setGps] = useState<Gps>({ state: "idle" });

  const places = useMemo(() => (data ?? []).filter((p) => p.visible), [data]);
  const mapped = places.filter(hasVerifiedCoords);
  const filtered = mapped.filter((p) => cat === "all" || p.category === cat);
  const sel = places.find((p) => p.slug === selected);

  // init map once
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const bounds = L.latLngBounds(TIRUMALA_BOUNDS);
    const map = L.map(elRef.current, { maxBounds: bounds.pad(0.15), maxBoundsViscosity: 1, minZoom: 14, zoomControl: false }).setView(TEMPLE_CENTER, 16);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // markers
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    filtered.forEach((p) => {
      const icon = L.divIcon({
        className: "",
        html: `<div class="tg-marker ${p.slug === selected ? "is-active" : ""}"><span>${catIcon(p.category)}</span></div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
      });
      L.marker([p.lat, p.lng], { icon, title: pickLocalized(p.name, lang), keyboard: true })
        .on("click", () => setSelected(p.slug))
        .addTo(layer);
    });
  }, [filtered, selected, lang]);

  // fly to selection
  useEffect(() => {
    if (sel && hasVerifiedCoords(sel)) mapRef.current?.flyTo([sel.lat, sel.lng], 17, { duration: 0.6 });
    navigate({ to: "/map", search: { place: selected }, replace: true });
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  const locate = () => {
    if (!("geolocation" in navigator)) return setGps({ state: "error", msg: "gpsUnavailable" });
    setGps({ state: "locating" });
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pos: [number, number] = [p.coords.latitude, p.coords.longitude];
        setGps({ state: "ok", pos });
        const map = mapRef.current;
        if (!map) return;
        meRef.current?.remove();
        meRef.current = L.marker(pos, { icon: L.divIcon({ className: "", html: '<div class="tg-me"></div>', iconSize: [18, 18] }) }).addTo(map);
        if (isInsideTirumala(...pos)) map.flyTo(pos, 17);
      },
      (err) => setGps({ state: "error", msg: err.code === err.PERMISSION_DENIED ? "gpsDenied" : "gpsUnavailable" }),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const searchResults = query.trim()
    ? places.filter((p) => Object.values(p.name).some((n) => n?.toLowerCase().includes(query.trim().toLowerCase()))).slice(0, 6)
    : [];
  const pending = places.filter((p) => !hasVerifiedCoords(p));

  return (
    <div className="relative h-full">
      <div ref={elRef} className="absolute inset-0 z-0 bg-secondary" aria-label={t("routeMapTitle")} role="application" />

      {/* search + filters */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] space-y-2 p-3">
        <div className="pointer-events-auto relative mx-auto max-w-xl">
          <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaces")}
            aria-label={t("searchPlaces")}
            className="h-12 w-full rounded-full bg-card pl-12 pr-4 text-base shadow-lift ring-1 ring-border outline-none focus:ring-2 focus:ring-ring"
          />
          {searchResults.length ? (
            <ul className="absolute inset-x-0 top-14 overflow-hidden rounded-2xl bg-card shadow-lift ring-1 ring-border">
              {searchResults.map((p) => (
                <li key={p.id}>
                  <button className="flex min-h-12 w-full items-center gap-3 px-4 text-left hover:bg-muted" onClick={() => { setSelected(p.slug); setQuery(""); }}>
                    <span aria-hidden>{catIcon(p.category)}</span>
                    <span className="flex-1">{pickLocalized(p.name, lang)}</span>
                    {!hasVerifiedCoords(p) ? <span className="text-xs text-muted-foreground">⏳</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="pointer-events-auto -mx-3 flex gap-2 overflow-x-auto px-3 pb-1">
          {[{ id: "all" }, ...CATEGORIES.filter((c) => mapped.some((p) => p.category === c.id))].map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)} aria-pressed={cat === c.id}
              className={cn("min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold shadow-soft ring-1", cat === c.id ? "bg-primary text-primary-foreground ring-primary" : "bg-card ring-border")}>
              {c.id === "all" ? t("all") : `${catIcon(c.id)} ${t(catKey(c.id))}`}
            </button>
          ))}
        </div>
        {isError ? <div className="pointer-events-auto mx-auto max-w-xl"><ErrorBox onRetry={() => refetch()} /></div> : null}
        {isLoading ? <p className="pointer-events-auto mx-auto w-fit rounded-full bg-card px-4 py-2 text-sm shadow-soft">{t("loading")}</p> : null}
      </div>

      {/* GPS */}
      <button onClick={locate} className="absolute right-3 top-48 z-[500] flex min-h-12 items-center gap-2 rounded-full bg-card px-4 text-sm font-semibold shadow-lift ring-1 ring-border">
        {gps.state === "locating" ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Crosshair className="size-5 text-primary" aria-hidden />}
        {gps.state === "locating" ? t("locating") : t("myLocation")}
      </button>

      {/* bottom sheet */}
      <div className="absolute inset-x-0 bottom-0 z-[600] p-3">
        <div className="mx-auto max-w-xl">
          {gps.state === "error" ? <p className="mb-2 rounded-xl bg-card px-4 py-2 text-sm text-destructive shadow-soft" role="status">{t(gps.msg)}</p> : null}
          {sel ? (
            <SelectedCard place={sel} gps={gps} onClose={() => setSelected(undefined)} />
          ) : (
            <div className="rounded-2xl bg-card p-3 shadow-lift ring-1 ring-border">
              <label className="text-xs font-semibold text-muted-foreground" htmlFor="dest">{t("selectDestination")}</label>
              <select id="dest" className="mt-1 h-12 w-full rounded-xl bg-muted px-3 text-base" value="" onChange={(e) => setSelected(e.target.value || undefined)}>
                <option value="">—</option>
                {places.map((p) => (
                  <option key={p.id} value={p.slug}>{pickLocalized(p.name, lang)}{hasVerifiedCoords(p) ? "" : ` (${t("coordsPending")})`}</option>
                ))}
              </select>
              {pending.length ? <p className="mt-2 text-xs text-muted-foreground">⏳ {t("pendingList")}: {pending.length}</p> : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SelectedCard({ place, gps, onClose }: { place: Place; gps: Gps; onClose: () => void }) {
  const { t, lang } = useI18n();
  const name = pickLocalized(place.name, lang);
  const desc = pickLocalized(place.description, lang);
  const verified = hasVerifiedCoords(place);
  const from = gps.state === "ok" && isInsideTirumala(...gps.pos) ? gps.pos : null;
  const dist = verified && from ? haversineMeters(from, [place.lat!, place.lng!]) : null;

  return (
    <div className="animate-rise overflow-hidden rounded-2xl bg-card shadow-lift ring-1 ring-border">
      <div className="flex gap-3 p-3">
        <div className="size-20 shrink-0 overflow-hidden rounded-xl">
          <PlaceImage src={place.imageSrc} category={place.category} alt={name} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gold">{t(catKey(place.category))}</p>
          <h2 className="text-lg leading-snug text-foreground">{name}</h2>
          {desc ? <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{desc}</p> : null}
        </div>
        <button onClick={onClose} aria-label={t("close")} className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-muted"><X className="size-5" /></button>
      </div>
      {verified ? (
        <div className="border-t bg-muted/50 p-3">
          {dist != null ? (
            <div className="flex items-center gap-4">
              <div><p className="text-xs text-muted-foreground">{t("distance")}</p><p className="font-display text-xl text-primary">{formatDistance(dist)}</p></div>
              <div><p className="text-xs text-muted-foreground">{t("walkTime")}</p><p className="font-display text-xl text-primary"><Footprints className="mr-1 inline size-4" aria-hidden />~{walkingMinutes(dist)} {t("min")}</p></div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{gps.state === "ok" ? t("outsideArea") : t("enableGpsHint")}</p>
          )}
          {dist != null ? <p className="mt-1 text-[11px] text-muted-foreground">{t("straightLine")}</p> : null}
          <a href={osmWalkingUrl(from, [place.lat!, place.lng!])} target="_blank" rel="noreferrer"
            className="mt-2 flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            <Navigation className="size-4" aria-hidden /> {t("openDirections")} ↗
          </a>
        </div>
      ) : (
        <p className="border-t bg-muted/50 p-3 text-sm text-muted-foreground">⏳ {t("coordsPending")}</p>
      )}
    </div>
  );
}
