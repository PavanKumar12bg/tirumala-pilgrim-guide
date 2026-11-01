import L from "leaflet";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Footprints, Layers, Loader2, LocateFixed, Navigation, RefreshCw, Search, SlidersHorizontal, Square, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { catIcon, catKey, CATEGORIES, hasVerifiedCoords, placesQuery, type Place } from "@/lib/places";
import { formatDistance, haversineMeters, isInsideTirumala, locateOnRoute, NAV_CONFIG, nearbySorted, TEMPLE_CENTER, TIRUMALA_BOUNDS, walkingMinutes, type LatLng } from "@/lib/geo";
import { fetchWalkingRoute, RoutingError, type WalkingRoute } from "@/lib/routing";
import { pickLocalized, useI18n, type DictKey } from "@/lib/i18n";
import { PlaceImage } from "./PlaceImage";
import { ErrorBox } from "./HomeSections";
import { cn } from "@/lib/utils";

type Fix = { pos: LatLng; accuracy: number; at: number };
type GpsState = "idle" | "locating" | "watching" | "denied" | "unavailable" | "timeout";
type Nav =
  | { state: "off" }
  | { state: "routing"; reroute: boolean }
  | { state: "active"; route: WalkingRoute; remaining: number; offCount: number }
  | { state: "arrived" }
  | { state: "error"; msg: DictKey };

type MapData = { roads: { h: string; n?: string; te?: string; c: LatLng[] }[]; buildings: LatLng[][]; water: LatLng[][]; wood: LatLng[][] };

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const FOOT = new Set(["footway", "steps", "pedestrian", "path", "living_street"]);
/** Markers closer than CLUSTER_PX on screen are grouped until this zoom; above it every marker shows. */
const CLUSTER_MAX_ZOOM = 18;
const CLUSTER_PX = 44;
const PRIMARY_CATS: string[] = ["temple", "food", "toilet", "medical", "transport"];

export default function MapExplorer({ initialSlug }: { initialSlug?: string | undefined }) {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useQuery(placesQuery());
  const mapData = useQuery({
    queryKey: ["map-data"],
    queryFn: async () => {
      const r = await fetch("/data/tirumala-map.json");
      if (!r.ok) throw new Error(String(r.status));
      return (await r.json()) as MapData;
    },
    staleTime: Infinity,
  });

  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseRef = useRef<L.LayerGroup | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const meRef = useRef<{ dot: L.Marker; ring: L.Circle } | null>(null);
  const routeRef = useRef<L.Polyline | null>(null);
  const watchRef = useRef<number | null>(null);
  const lastRouteAt = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const [cat, setCat] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | undefined>(initialSlug);
  const [gps, setGps] = useState<GpsState>("idle");
  const [fix, setFix] = useState<Fix | null>(null);
  const [stale, setStale] = useState(false);
  const [nearbyM, setNearbyM] = useState(NAV_CONFIG.defaultNearbyMeters);
  const [nav, setNav] = useState<Nav>({ state: "off" });
  const [panel, setPanel] = useState<"none" | "nearby" | "legend" | "cats">("none");
  const [zoom, setZoom] = useState(16);
  const [searchOpen, setSearchOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);

  const places = useMemo(() => (data ?? []).filter((p) => p.visible), [data]);
  const mapped = useMemo(() => places.filter(hasVerifiedCoords), [places]);
  const filtered = useMemo(() => mapped.filter((p) => cat === "all" || p.category === cat), [mapped, cat]);
  const catCounts = useMemo(() => CATEGORIES.map((c) => ({ ...c, n: mapped.filter((p) => p.category === c.id).length })).filter((c) => c.n > 0), [mapped]);
  const topCats = PRIMARY_CATS.filter((id) => catCounts.some((c) => c.id === id));
  const moreCats = catCounts.filter((c) => !topCats.includes(c.id));
  const sel = places.find((p) => p.slug === selected);
  const here = fix && isInsideTirumala(...fix.pos) ? fix.pos : null;
  const nearby = useMemo(() => (here ? nearbySorted(mapped, here, nearbyM) : []), [here, mapped, nearbyM]);
  const nearbyIds = useMemo(() => new Set(nearby.map((n) => n.item.id)), [nearby]);

  // init map once
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const bounds = L.latLngBounds(TIRUMALA_BOUNDS);
    const map = L.map(elRef.current, { maxBounds: bounds.pad(0.1), maxBoundsViscosity: 1, minZoom: 13, zoomControl: false }).setView(TEMPLE_CENTER, 16);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    if (window.matchMedia("(min-width: 768px)").matches) L.control.zoom({ position: "bottomright" }).addTo(map);
    baseRef.current = L.layerGroup().addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    map.on("zoomend", () => setZoom(map.getZoom()));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // GeoJSON-derived layers (already converted to [lat, lng])
  useEffect(() => {
    const g = baseRef.current;
    if (!g || !mapData.data) return;
    g.clearLayers();
    const water = css("--map-water"), building = css("--map-building"), road = css("--map-road"), foot = css("--map-foot");
    mapData.data.water.forEach((p) => L.polygon(p, { color: water, weight: 1, fillOpacity: 0.35, interactive: false }).addTo(g));
    mapData.data.buildings.forEach((p) => L.polygon(p, { color: building, weight: 0.8, fillOpacity: 0.18, interactive: false }).addTo(g));
    mapData.data.roads.forEach((r) => {
      const isFoot = FOOT.has(r.h);
      const line = L.polyline(r.c, { color: isFoot ? foot : road, weight: isFoot ? 2.5 : 3, opacity: 0.75, dashArray: isFoot ? "4 5" : undefined });
      const label = (lang === "te" && r.te) || r.n;
      if (label) line.bindTooltip(label, { sticky: true });
      line.addTo(g);
    });
  }, [mapData.data, lang]);

  // place markers, coloured by state; nearby markers are grouped into clusters below CLUSTER_MAX_ZOOM
  useEffect(() => {
    const layer = layerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    const single = (p: Place & { lat: number; lng: number }) => {
      const state = p.slug === selected ? "is-active" : nearbyIds.has(p.id) ? "is-nearby" : "";
      const big = state === "is-active";
      const icon = L.divIcon({
        className: "",
        html: `<div class="tg-marker ${state}"><span>${catIcon(p.category)}</span></div>`,
        iconSize: big ? [38, 38] : [24, 24],
        iconAnchor: big ? [19, 38] : [12, 12],
      });
      L.marker([p.lat, p.lng], { icon, title: pickLocalized(p.name, lang), keyboard: true, zIndexOffset: big ? 1000 : state ? 500 : 0 })
        .on("click", () => setSelected(p.slug))
        .addTo(layer);
    };
    const pts = filtered.filter(hasVerifiedCoords);
    if (zoom >= CLUSTER_MAX_ZOOM) return pts.forEach(single);
    const cells = new Map<string, typeof pts>();
    pts.forEach((p) => {
      if (p.slug === selected) return single(p);
      const pt = map.project([p.lat, p.lng], zoom);
      const k = `${Math.floor(pt.x / CLUSTER_PX)}:${Math.floor(pt.y / CLUSTER_PX)}`;
      cells.set(k, [...(cells.get(k) ?? []), p]);
    });
    cells.forEach((group) => {
      if (group.length === 1) return single(group[0]!);
      const lat = group.reduce((s, p) => s + p.lat, 0) / group.length;
      const lng = group.reduce((s, p) => s + p.lng, 0) / group.length;
      const near = group.some((p) => nearbyIds.has(p.id));
      L.marker([lat, lng], {
        icon: L.divIcon({ className: "", html: `<div class="tg-cluster ${near ? "is-nearby" : ""}">${group.length}</div>`, iconSize: [30, 30], iconAnchor: [15, 15] }),
        title: `${group.length}`,
        keyboard: true,
      })
        .on("click", () => map.fitBounds(L.latLngBounds(group.map((p) => [p.lat, p.lng] as LatLng)), { padding: [60, 60], maxZoom: CLUSTER_MAX_ZOOM }))
        .addTo(layer);
    });
  }, [filtered, selected, lang, nearbyIds, zoom]);

  // fly to selection
  useEffect(() => {
    if (sel && hasVerifiedCoords(sel) && nav.state === "off") mapRef.current?.flyTo([sel.lat, sel.lng], 17, { duration: 0.6 });
    navigate({ to: "/map", search: { place: selected }, replace: true });
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  // user marker + accuracy ring
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !fix) return;
    if (!meRef.current) {
      const ring = L.circle(fix.pos, { radius: fix.accuracy, color: css("--map-me"), weight: 1, fillOpacity: 0.12, interactive: false }).addTo(map);
      const dot = L.marker(fix.pos, { icon: L.divIcon({ className: "", html: '<div class="tg-me"></div>', iconSize: [18, 18] }), zIndexOffset: 2000, title: t("you") }).addTo(map);
      meRef.current = { dot, ring };
    } else {
      meRef.current.dot.setLatLng(fix.pos);
      meRef.current.ring.setLatLng(fix.pos).setRadius(fix.accuracy);
    }
  }, [fix, t]);

  // stale GPS detector
  useEffect(() => {
    if (gps !== "watching") return;
    const id = setInterval(() => setStale(!!fix && Date.now() - fix.at > NAV_CONFIG.staleGpsMs), 5000);
    return () => clearInterval(id);
  }, [gps, fix]);

  useEffect(() => () => {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    abortRef.current?.abort();
  }, []);

  const startWatch = useCallback(() => {
    if (!("geolocation" in navigator)) return setGps("unavailable");
    if (watchRef.current != null) {
      if (fix && isInsideTirumala(...fix.pos)) mapRef.current?.flyTo(fix.pos, 17);
      return;
    }
    setGps("locating");
    let first = true;
    watchRef.current = navigator.geolocation.watchPosition(
      (p) => {
        const f: Fix = { pos: [p.coords.latitude, p.coords.longitude], accuracy: p.coords.accuracy, at: Date.now() };
        setFix(f);
        setStale(false);
        setGps("watching");
        if (first && isInsideTirumala(...f.pos)) mapRef.current?.flyTo(f.pos, 17);
        first = false;
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGps("denied");
          if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
          watchRef.current = null;
        } else setGps(err.code === err.TIMEOUT ? "timeout" : "unavailable");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    );
  }, [fix]);

  const drawRoute = (route: WalkingRoute, fit: boolean) => {
    const map = mapRef.current;
    if (!map) return;
    routeRef.current?.remove();
    routeRef.current = L.polyline(route.coords, { color: css("--map-route"), weight: 6, opacity: 0.9, lineCap: "round" }).addTo(map);
    if (fit) map.fitBounds(routeRef.current.getBounds().extend(route.coords[0]!), { padding: [60, 60], maxZoom: 18 });
  };

  const requestRoute = useCallback(async (from: LatLng, to: LatLng, reroute: boolean) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    lastRouteAt.current = Date.now();
    setNav({ state: "routing", reroute });
    try {
      const route = await fetchWalkingRoute(from, to, ctrl.signal);
      drawRoute(route, !reroute);
      setNav({ state: "active", route, remaining: locateOnRoute(from, route.coords).remaining, offCount: 0 });
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      routeRef.current?.remove();
      routeRef.current = null;
      setNav({ state: "error", msg: e instanceof RoutingError && e.kind === "no_route" ? "routeFailed" : "routeFailed" });
    }
  }, []);

  const startNav = () => {
    if (!sel || !hasVerifiedCoords(sel)) return;
    if (!here) {
      startWatch();
      setNav({ state: "error", msg: "needGps" });
      return;
    }
    void requestRoute(here, [sel.lat, sel.lng], false);
  };

  const stopNav = () => {
    abortRef.current?.abort();
    routeRef.current?.remove();
    routeRef.current = null;
    setNav({ state: "off" });
  };

  // live progress, deviation and arrival
  useEffect(() => {
    if (!fix || !sel || !hasVerifiedCoords(sel)) return;
    if (nav.state === "error" && nav.msg === "needGps" && here) {
      void requestRoute(here, [sel.lat, sel.lng], false);
      return;
    }
    if (nav.state !== "active") return;
    const good = fix.accuracy <= NAV_CONFIG.goodAccuracyMeters;
    const toDest = haversineMeters(fix.pos, [sel.lat, sel.lng]);
    if (good && toDest <= NAV_CONFIG.arrivalMeters) {
      routeRef.current?.remove();
      routeRef.current = null;
      setNav({ state: "arrived" });
      return;
    }
    const { offset, remaining } = locateOnRoute(fix.pos, nav.route.coords);
    const off = good && offset > NAV_CONFIG.offRouteMeters ? nav.offCount + 1 : 0;
    if (off >= NAV_CONFIG.offRouteConsecutive && Date.now() - lastRouteAt.current > NAV_CONFIG.rerouteCooldownMs) {
      void requestRoute(fix.pos, [sel.lat, sel.lng], true);
      return;
    }
    setNav({ ...nav, remaining, offCount: off });
  }, [fix]); // eslint-disable-line react-hooks/exhaustive-deps

  const recenter = () => {
    const map = mapRef.current;
    if (!map) return;
    if (routeRef.current && fix) map.fitBounds(routeRef.current.getBounds().extend(fix.pos), { padding: [60, 60], maxZoom: 18 });
    else if (here) map.flyTo(here, 17);
    else map.flyTo(TEMPLE_CENTER, 16);
  };

  const choose = (slug: string | undefined) => {
    if (nav.state !== "off") stopNav();
    setSelected(slug);
  };

  const searchResults = query.trim()
    ? places.filter((p) => Object.values(p.name).some((n) => n?.toLowerCase().includes(query.trim().toLowerCase()))).slice(0, 6)
    : [];
  const gpsMsg: DictKey | null = gps === "denied" ? "gpsDenied" : gps === "unavailable" ? "gpsUnavailable" : gps === "timeout" ? "gpsTimeout" : stale ? "gpsLost" : fix && fix.accuracy > NAV_CONFIG.warnAccuracyMeters ? "lowAccuracy" : fix && !here ? "outsideArea" : null;
  const showNotice = gpsMsg && dismissed !== gpsMsg;
  const chip = (active: boolean) => cn("flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-semibold shadow-soft transition-colors", active ? "bg-primary text-primary-foreground" : "bg-card/95 text-foreground");
  const fab = "grid size-11 place-items-center rounded-full bg-card shadow-lift";

  return (
    <div className="relative h-full overflow-hidden">
      <div ref={elRef} className="absolute inset-0 z-0 bg-secondary" aria-label={t("routeMapTitle")} role="application" />

      {/* compact search + filter chips */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] space-y-2 px-3 pt-2">
        <div className="pointer-events-auto relative mx-auto max-w-md">
          {searchOpen ? (
            <div className="flex h-10 items-center gap-2 rounded-full bg-card pl-3 pr-1 shadow-lift">
              <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchPlaces")} aria-label={t("searchPlaces")}
                onKeyDown={(e) => e.key === "Escape" && (setQuery(""), setSearchOpen(false))}
                className="min-w-0 flex-1 bg-transparent text-base outline-none" />
              <button onClick={() => { setQuery(""); setSearchOpen(false); }} aria-label={t("close")} className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-muted"><X className="size-4" /></button>
            </div>
          ) : (
            <button onClick={() => setSearchOpen(true)} className="flex h-10 w-full items-center gap-2 rounded-full bg-card/95 px-3 text-sm text-muted-foreground shadow-lift">
              <Search className="size-4" aria-hidden /> {t("searchPlaces")}
              {isLoading || mapData.isLoading ? <Loader2 className="ml-auto size-4 animate-spin" aria-label={t("loading")} /> : null}
            </button>
          )}
          {searchOpen && searchResults.length ? (
            <ul className="absolute inset-x-0 top-12 max-h-72 overflow-y-auto rounded-2xl bg-card py-1 shadow-lift">
              {searchResults.map((p) => (
                <li key={p.id}>
                  <button className="flex min-h-11 w-full items-center gap-2.5 px-3 text-left text-sm hover:bg-muted" onClick={() => { choose(p.slug); setQuery(""); setSearchOpen(false); }}>
                    <span aria-hidden>{catIcon(p.category)}</span>
                    <span className="min-w-0 flex-1 truncate">{pickLocalized(p.name, lang)}</span>
                    {!hasVerifiedCoords(p) ? <span className="text-[11px] text-muted-foreground">⏳ {t("coordsPending")}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {!searchOpen ? (
          <div className="pointer-events-auto -mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none]" role="toolbar" aria-label={t("legend")}>
            <button onClick={() => setCat("all")} aria-pressed={cat === "all"} className={chip(cat === "all")}>{t("all")}</button>
            {topCats.map((id) => (
              <button key={id} onClick={() => setCat(id)} aria-pressed={cat === id} className={chip(cat === id)}>
                <span aria-hidden>{catIcon(id)}</span>{t(catKey(id))}
              </button>
            ))}
            {moreCats.some((c) => c.id === cat) ? (
              <button aria-pressed className={chip(true)}><span aria-hidden>{catIcon(cat)}</span>{t(catKey(cat))}</button>
            ) : null}
            {moreCats.length ? (
              <button onClick={() => setPanel(panel === "cats" ? "none" : "cats")} aria-expanded={panel === "cats"} className={chip(false)}>
                <SlidersHorizontal className="size-3.5" aria-hidden />{t("moreCats")}
              </button>
            ) : null}
          </div>
        ) : null}
        {panel === "cats" ? (
          <div className="pointer-events-auto ml-auto w-52 rounded-2xl bg-card p-1.5 shadow-lift">
            {moreCats.map((c) => (
              <button key={c.id} onClick={() => { setCat(c.id); setPanel("none"); }} className={cn("flex min-h-10 w-full items-center gap-2 rounded-xl px-2.5 text-left text-sm", cat === c.id ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                <span aria-hidden>{c.icon}</span><span className="flex-1 truncate">{t(catKey(c.id))}</span><span className="text-xs opacity-70">{c.n}</span>
              </button>
            ))}
          </div>
        ) : null}
        {isError || mapData.isError ? (
          <div className="pointer-events-auto mx-auto flex max-w-md items-center gap-2 rounded-full bg-card py-1 pl-3 pr-1 text-xs shadow-soft" role="alert">
            <AlertTriangle className="size-3.5 shrink-0 text-destructive" aria-hidden />
            <span className="min-w-0 flex-1 truncate">{t("mapDataError")}</span>
            <button className="h-8 rounded-full px-3 font-semibold text-primary" onClick={() => { void refetch(); void mapData.refetch(); }}>{t("retry")}</button>
          </div>
        ) : null}
        {showNotice ? (
          <div className="pointer-events-auto mx-auto flex max-w-md items-center gap-2 rounded-full bg-card py-1 pl-3 pr-1 text-xs shadow-soft" role="status">
            <AlertTriangle className="size-3.5 shrink-0 text-warning" aria-hidden />
            <span className="min-w-0 flex-1 truncate">{t(gpsMsg)}{fix && gpsMsg === "lowAccuracy" ? ` (±${Math.round(fix.accuracy)} m)` : ""}</span>
            {gpsMsg !== "outsideArea" && gpsMsg !== "lowAccuracy" ? <button className="h-8 rounded-full px-2 font-semibold text-primary" onClick={() => { setDismissed(null); startWatch(); }}>{t("retry")}</button> : null}
            <button onClick={() => setDismissed(gpsMsg)} aria-label={t("close")} className="grid size-8 place-items-center rounded-full hover:bg-muted"><X className="size-3.5" /></button>
          </div>
        ) : null}
      </div>

      {/* right-side controls */}
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] right-3 z-[500] flex flex-col items-end gap-2" style={sel ? { bottom: collapsed ? "5.5rem" : "13rem" } : undefined}>
        {here ? (
          <button onClick={() => setPanel(panel === "nearby" ? "none" : "nearby")} aria-expanded={panel === "nearby"} className="flex h-8 items-center rounded-full bg-map-nearby px-3 text-xs font-semibold text-primary-foreground shadow-lift">
            {t("nearby")} · {nearby.length}
          </button>
        ) : null}
        <button onClick={() => setPanel(panel === "legend" ? "none" : "legend")} aria-label={t("legend")} aria-expanded={panel === "legend"} className={fab}><Layers className="size-4" /></button>
        <button onClick={() => (nav.state === "active" ? recenter() : startWatch())} aria-label={nav.state === "active" ? t("recenter") : t("myLocation")} className={fab}>
          {gps === "locating" ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <LocateFixed className={cn("size-5", gps === "watching" ? "text-map-me" : "text-primary")} aria-hidden />}
        </button>
      </div>

      {panel === "legend" ? (
        <div className="absolute bottom-20 right-16 z-[550] w-52 rounded-2xl bg-card p-3 text-xs shadow-lift">
          <ul className="space-y-1.5">
            <li className="flex items-center gap-2"><span className="size-3 rounded-full bg-map-me ring-2 ring-card" /> {t("you")}</li>
            <li className="flex items-center gap-2"><span className="size-3 rounded-full bg-accent ring-2 ring-primary" /> {t("destination")}</li>
            <li className="flex items-center gap-2"><span className="h-1 w-4 rounded-full bg-map-route" /> {t("route")}</li>
            <li className="flex items-center gap-2"><span className="size-3 rounded-full ring-[3px] ring-map-nearby" /> {t("nearby")}</li>
            <li className="flex items-center gap-2"><span className="size-3 rounded-full ring-2 ring-primary" /> {t("otherPlaces")}</li>
          </ul>
          <ul className="mt-2 grid grid-cols-2 gap-1 border-t pt-2 text-[11px]">
            {CATEGORIES.map((c) => <li key={c.id} className="truncate">{c.icon} {t(catKey(c.id))}</li>)}
          </ul>
        </div>
      ) : null}

      {panel === "nearby" && here ? (
        <div className="absolute inset-x-3 bottom-3 z-[650] mx-auto max-h-[55%] max-w-md overflow-y-auto rounded-2xl bg-card p-3 shadow-lift">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">{t("nearby")}</p>
            <button onClick={() => setPanel("none")} aria-label={t("close")} className="grid size-9 place-items-center rounded-full hover:bg-muted"><X className="size-4" /></button>
          </div>
          <div className="mt-1 flex gap-1.5" role="radiogroup" aria-label={t("within")}>
            {NAV_CONFIG.nearbyOptions.map((m) => (
              <button key={m} role="radio" aria-checked={nearbyM === m} onClick={() => setNearbyM(m)}
                className={cn("h-8 flex-1 rounded-full text-xs font-semibold", nearbyM === m ? "bg-map-nearby text-primary-foreground" : "bg-muted")}>
                {formatDistance(m)}
              </button>
            ))}
          </div>
          {nearby.length ? (
            <ul className="mt-2 divide-y">
              {nearby.map(({ item, meters }) => (
                <li key={item.id}>
                  <button className="flex min-h-11 w-full items-center gap-2.5 py-1 text-left text-sm" onClick={() => { choose(item.slug); setPanel("none"); }}>
                    <span aria-hidden>{catIcon(item.category)}</span>
                    <span className="min-w-0 flex-1 truncate">{pickLocalized(item.name, lang)}</span>
                    <span className="shrink-0 text-xs font-semibold text-map-nearby">{formatDistance(meters)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 text-sm text-muted-foreground">{t("noNearby")}</p>}
          <p className="mt-2 text-[11px] text-muted-foreground">{t("straightLineLabel")} · {t("accuracy")} ±{Math.round(fix!.accuracy)} m</p>
        </div>
      ) : null}

      {/* bottom sheet: only when a place is selected */}
      {sel ? (
        <div className="absolute inset-x-0 bottom-0 z-[600] px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          <div className="mx-auto max-w-md">
            <SelectedCard place={sel} fix={here ? fix : null} nav={nav} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)}
              onClose={() => { choose(undefined); setCollapsed(false); }} onStart={startNav} onStop={stopNav}
              onRetry={() => { if (here && hasVerifiedCoords(sel)) void requestRoute(here, [sel.lat, sel.lng], false); else startNav(); }} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SelectedCard({ place, fix, nav, onClose, onStart, onStop, onRetry }: {
  place: Place; fix: Fix | null; nav: Nav; onClose: () => void; onStart: () => void; onStop: () => void; onRetry: () => void;
}) {
  const { t, lang } = useI18n();
  const name = pickLocalized(place.name, lang);
  const desc = pickLocalized(place.description, lang);
  const verified = hasVerifiedCoords(place);
  const straight = verified && fix ? haversineMeters(fix.pos, [place.lat!, place.lng!]) : null;
  const tags = place.osm_tags ?? {};

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

      {nav.state === "off" ? (
        <details className="px-3 pb-2 text-xs text-muted-foreground">
          <summary className="min-h-8 cursor-pointer">{t("coordinates")} · {t("source")}</summary>
          {verified ? <p>{place.lat!.toFixed(6)}, {place.lng!.toFixed(6)}</p> : null}
          <p>{t("source")}: {place.coords_source === "osm" ? `OpenStreetMap (${place.osm_id})` : place.coords_source ?? "—"}</p>
          {tags["opening_hours"] ? <p>{t("openingHours")}: {tags["opening_hours"]}</p> : null}
          {tags["alt_name"] ? <p>{tags["alt_name"]}</p> : null}
          {tags["website"] ? <p>{t("website")}: <a className="underline" href={tags["website"]} target="_blank" rel="noreferrer">{tags["website"]}</a></p> : null}
        </details>
      ) : null}

      {!verified ? (
        <p className="border-t bg-muted/50 p-3 text-sm text-muted-foreground">⏳ {t("coordsPending")}</p>
      ) : nav.state === "active" ? (
        <div className="border-t bg-muted/50 p-3">
          <div className="grid grid-cols-3 gap-2">
            <Stat label={t("remaining")} value={formatDistance(nav.remaining)} />
            <Stat label={t("routeDistance")} value={formatDistance(nav.route.distance)} />
            <Stat label={t("walkTime")} value={`~${walkingMinutes(nav.remaining)} ${t("min")}`} />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{t("routeBy")} · {t("tracking")}{fix ? ` · ${t("accuracy")} ±${Math.round(fix.accuracy)} m` : ""}</p>
          <button onClick={onStop} className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-destructive text-sm font-semibold text-destructive-foreground">
            <Square className="size-4" aria-hidden /> {t("stopNav")}
          </button>
        </div>
      ) : nav.state === "routing" ? (
        <p className="flex items-center gap-2 border-t bg-muted/50 p-3 text-sm"><Loader2 className="size-4 animate-spin" /> {nav.reroute ? t("rerouting") : t("routing")}</p>
      ) : nav.state === "arrived" ? (
        <div className="border-t bg-muted/50 p-3">
          <p className="flex items-center gap-2 font-display text-lg text-success"><CheckCircle2 className="size-5" /> {t("arrived")}</p>
          <button onClick={onStop} className="mt-2 min-h-12 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground">{t("close")}</button>
        </div>
      ) : (
        <div className="border-t bg-muted/50 p-3">
          {nav.state === "error" ? (
            <div className="mb-2 flex items-center justify-between gap-2 text-sm text-destructive" role="alert">
              <span>{t(nav.msg)}</span>
              {nav.msg === "routeFailed" ? <button onClick={onRetry} className="flex min-h-10 items-center gap-1 font-semibold text-primary"><RefreshCw className="size-4" />{t("retry")}</button> : null}
            </div>
          ) : null}
          {straight != null ? (
            <div className="mb-2 flex items-center gap-4">
              <Stat label={`${t("distance")} (${t("straightLineLabel")})`} value={formatDistance(straight)} />
              <Stat label={t("walkTime")} value={<><Footprints className="mr-1 inline size-4" aria-hidden />~{walkingMinutes(straight)} {t("min")}</>} />
            </div>
          ) : (
            <p className="mb-2 text-sm text-muted-foreground">{t("enableGpsHint")}</p>
          )}
          <button onClick={onStart} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            <Navigation className="size-4" aria-hidden /> {t("startNav")}
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[11px] text-muted-foreground">{label}</p>
      <p className="font-display text-lg text-primary">{value}</p>
    </div>
  );
}
