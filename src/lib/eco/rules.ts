import { z } from "zod";

export const ECO_CATEGORIES = ["plastic", "cleaning", "dustbins", "plantation", "protection", "other"] as const;
export const ECO_LIMITS = { photos: 8, incomingBytes: 10 * 1024 * 1024, compressedBytes: 2 * 1024 * 1024 } as const;
export const participantSchema = z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(254).transform(value => value.toLowerCase()), consent: z.literal(true), publicConsent: z.boolean() });
export const activitySchema = z.object({ category: z.enum(ECO_CATEGORIES), description: z.string().trim().min(5).max(2000), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value, "Invalid activity date"), location: z.string().trim().min(2).max(200), idempotencyKey: z.string().uuid() });
export const eligibilitySchema = z.object({ minimumActivities: z.number().int().min(1).max(10000), requiredCategories: z.array(z.enum(ECO_CATEGORIES)).max(6), minimumDays: z.number().int().min(0).max(36500), minimumPlasticKg: z.number().min(0).max(1000000), minimumSaplings: z.number().int().min(0).max(1000000) });
export type Eligibility = z.infer<typeof eligibilitySchema>;
export type Contribution = { id: string; category: typeof ECO_CATEGORIES[number]; date: string; status: "pending" | "approved" | "rejected"; plasticKg: number; saplings: number; photoCount: number };
export function summarize(rows: Contribution[]) {
  const approved = rows.filter(row => row.status === "approved");
  const dates = approved.map(row => row.date).sort();
  const start = dates[0] ?? null;
  const end = dates.at(-1) ?? null;
  return { total: rows.length, approved: approved.length, pending: rows.filter(row => row.status === "pending").length, rejected: rows.filter(row => row.status === "rejected").length, cleaning: approved.filter(row => ["plastic", "cleaning", "dustbins"].includes(row.category)).length, plasticKg: approved.reduce((sum, row) => sum + row.plasticKg, 0), saplings: approved.reduce((sum, row) => sum + row.saplings, 0), photos: approved.reduce((sum, row) => sum + row.photoCount, 0), start, end, days: start && end ? Math.round((Date.parse(end) - Date.parse(start)) / 86400000) : 0, categories: [...new Set(approved.map(row => row.category))] };
}
export function eligible(rows: Contribution[], rules: Eligibility) {
  const totals = summarize(rows);
  return totals.approved >= rules.minimumActivities && totals.days >= rules.minimumDays && totals.plasticKg >= rules.minimumPlasticKg && totals.saplings >= rules.minimumSaplings && rules.requiredCategories.every(category => totals.categories.includes(category));
}
export function publicParticipant(consent: boolean, hidden: boolean, approvedCount: number) { return consent && !hidden && approvedCount > 0; }
export function sameSessionParticipant(sessionParticipant: string | null, requestedParticipant: string) { return Boolean(sessionParticipant) && sessionParticipant === requestedParticipant; }
export function validateImage(bytes: Uint8Array, mime: string) {
  if (bytes.length > ECO_LIMITS.compressedBytes || bytes.length < 12) throw new Error("Invalid image size");
  const webp = String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!((mime === "image/webp" && webp) || (mime === "image/png" && png) || (mime === "image/jpeg" && jpeg))) throw new Error("Unsupported image content");
  return true;
}