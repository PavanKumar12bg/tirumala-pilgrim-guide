export type LatLng = [number, number];

/** Main temple: centroid of OSM way/362777815 from the uploaded GeoJSON. */
export const TEMPLE_CENTER: LatLng = [13.683243, 79.347352];
/** Extent of the uploaded GeoJSON (hill town + ghat roads), slightly padded. */
export const TIRUMALA_BOUNDS: [LatLng, LatLng] = [
  [13.605, 79.31],
  [13.75, 79.47],
];

/** Tunable navigation thresholds (metres / ms). */
export const NAV_CONFIG = {
  nearbyOptions: [150, 300, 600, 1000],
  defaultNearbyMeters: 300,
  arrivalMeters: 25,
  offRouteMeters: 40,
  /** Readings worse than this are not trusted for re-routing or arrival. */
  goodAccuracyMeters: 35,
  /** Readings worse than this trigger a "low accuracy" warning. */
  warnAccuracyMeters: 60,
  offRouteConsecutive: 2,
  rerouteCooldownMs: 20000,
  staleGpsMs: 30000,
};

/** GeoJSON positions are [longitude, latitude]; Leaflet wants [latitude, longitude]. */
export function geoJsonToLatLng(pos: readonly number[]): LatLng {
  const [lon, lat] = pos as [number, number];
  return [lat, lon];
}

export function isValidLatLng([lat, lng]: LatLng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

export function isInsideTirumala(lat: number, lng: number) {
  const [[s, w], [n, e]] = TIRUMALA_BOUNDS;
  return lat >= s && lat <= n && lng >= w && lng <= e;
}

/** Great-circle distance in metres. */
export function haversineMeters(a: LatLng, b: LatLng) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Walking minutes at an average pilgrim pace of 4 km/h. */
export const WALK_SPEED_KMH = 4;
export function walkingMinutes(meters: number) {
  return Math.max(1, Math.round((meters / 1000 / WALK_SPEED_KMH) * 60));
}

export function formatDistance(m: number) {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
}

/** Project point onto segment in a local equirectangular plane. Returns distance (m) and fraction t along segment. */
function projectOnSegment(p: LatLng, a: LatLng, b: LatLng) {
  const k = Math.cos((p[0] * Math.PI) / 180);
  const ax = a[1] * k, ay = a[0], bx = b[1] * k, by = b[0], px = p[1] * k, py = p[0];
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  const q: LatLng = [ay + t * dy, (ax + t * dx) / k];
  return { dist: haversineMeters(p, q), t, point: q };
}

/** Closest position on a polyline: distance to it, and metres remaining from there to the end. */
export function locateOnRoute(p: LatLng, route: LatLng[]) {
  if (route.length < 2) return { offset: Infinity, remaining: Infinity };
  let best = { offset: Infinity, index: 0, point: route[0]! };
  for (let i = 0; i < route.length - 1; i++) {
    const r = projectOnSegment(p, route[i]!, route[i + 1]!);
    if (r.dist < best.offset) best = { offset: r.dist, index: i, point: r.point };
  }
  let remaining = haversineMeters(best.point, route[best.index + 1]!);
  for (let i = best.index + 1; i < route.length - 1; i++) remaining += haversineMeters(route[i]!, route[i + 1]!);
  return { offset: best.offset, remaining };
}

export function polylineLength(route: LatLng[]) {
  let d = 0;
  for (let i = 0; i < route.length - 1; i++) d += haversineMeters(route[i]!, route[i + 1]!);
  return d;
}

/** Sort items by straight-line distance from `from`, keeping those within `maxMeters`. */
export function nearbySorted<T extends { lat: number; lng: number }>(items: T[], from: LatLng, maxMeters: number) {
  return items
    .map((item) => ({ item, meters: haversineMeters(from, [item.lat, item.lng]) }))
    .filter((x) => x.meters <= maxMeters)
    .sort((a, b) => a.meters - b.meters);
}
