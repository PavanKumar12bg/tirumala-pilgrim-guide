/** Tirumala hill town framing. Temple coordinates from published sources. */
export const TEMPLE_CENTER: [number, number] = [13.68306, 79.34694];
export const TIRUMALA_BOUNDS: [[number, number], [number, number]] = [
  [13.655, 79.315],
  [13.715, 79.38],
];

export function isInsideTirumala(lat: number, lng: number) {
  const [[s, w], [n, e]] = TIRUMALA_BOUNDS;
  return lat >= s && lat <= n && lng >= w && lng <= e;
}

/** Great-circle distance in metres. */
export function haversineMeters(a: [number, number], b: [number, number]) {
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

export function osmWalkingUrl(from: [number, number] | null, to: [number, number]) {
  const route = from ? `${from[0]},${from[1]};${to[0]},${to[1]}` : `;${to[0]},${to[1]}`;
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${encodeURIComponent(route)}`;
}
