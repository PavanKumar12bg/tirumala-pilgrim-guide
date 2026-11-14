import { geoJsonToLatLng, type LatLng } from "./geo";

/**
 * Pedestrian routing via the FOSSGIS OSRM "foot" profile (routing.openstreetmap.de),
 * the same free, keyless service openstreetmap.org uses for walking directions.
 * It routes over OpenStreetMap footways, steps and pedestrian streets.
 * Fair-use: callers must rate-limit (see NAV_CONFIG.rerouteCooldownMs).
 */
export const ROUTING_PROVIDER = "OSRM foot profile · routing.openstreetmap.de (FOSSGIS)";
const BASE = "https://routing.openstreetmap.de/routed-foot/route/v1/foot";

export type WalkingRoute = { coords: LatLng[]; distance: number; duration: number };

export class RoutingError extends Error {
  constructor(public kind: "network" | "no_route" | "bad_response", message: string) {
    super(message);
  }
}

export async function fetchWalkingRoute(from: LatLng, to: LatLng, signal?: AbortSignal): Promise<WalkingRoute> {
  const url = `${BASE}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&alternatives=false&steps=false`;
  let res: Response;
  try {
    res = await fetch(url, signal ? { signal } : {});
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new RoutingError("network", "Routing service unreachable");
  }
  if (!res.ok) throw new RoutingError(res.status === 400 ? "no_route" : "network", `Routing HTTP ${res.status}`);
  const json = (await res.json()) as { code?: string; routes?: { distance: number; duration: number; geometry: { coordinates: number[][] } }[] };
  if (json.code !== "Ok" || !json.routes?.length) throw new RoutingError("no_route", json.code ?? "NoRoute");
  const r = json.routes[0]!;
  const coords = r.geometry.coordinates.map(geoJsonToLatLng);
  if (coords.length < 2) throw new RoutingError("bad_response", "Empty geometry");
  return { coords, distance: r.distance, duration: r.duration };
}
