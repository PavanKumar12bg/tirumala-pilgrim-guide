import { z } from "zod";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const stopSchema = z.object({ id: z.string(), placeId: z.string(), arrival: time.or(z.literal("")), visitedAt: z.string().datetime().nullable() });
const daySchema = z.object({ id: z.string(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), start: time, stops: z.array(stopSchema) });
export const journeySchema = z.array(daySchema).min(1);
export type JourneyDay = z.infer<typeof daySchema>;
export type JourneyStop = z.infer<typeof stopSchema>;
export const JOURNEY_STORAGE_KEY = "tirumala-journey-v1";

export function localDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function nextDate(date: string) {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return localDate(d);
}

export function newDay(date = localDate()): JourneyDay {
  return { id: crypto.randomUUID(), date, start: "06:00", stops: [] };
}

export function moveStop(stops: JourneyStop[], id: string, delta: -1 | 1) {
  const from = stops.findIndex((s) => s.id === id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= stops.length) return stops;
  const result = [...stops];
  const item = result.splice(from, 1)[0];
  if (!item) return stops;
  result.splice(to, 0, item);
  return result;
}