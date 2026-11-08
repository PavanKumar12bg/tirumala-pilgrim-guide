import { z } from "zod";
import { normalize, nameScore, type AgentIntent } from "./voice-agent";

export const TRAINING_COLUMNS = ["Intent_ID", "Category", "Canonical_Name", "Primary_Query", "Alternative_Queries", "Telugu_Queries", "English_Queries", "Hindi_Queries", "Tamil_Queries", "Kannada_Queries", "Malayalam_Queries", "Odia_Queries", "Destination_Type", "Destination_ID", "Destination_Route", "Action_Type", "Response_Text", "Keywords", "Status", "Updated_At"];
const pages = ["/", "/map", "/transport", "/blogs", "/darshan", "/emergency", "/journey", "/ttd", "/about"] as const;
const categories = ["temple", "food", "water", "toilet", "medical", "hotel", "transport", "parking", "office", "enquiry", "amenity", "landmark", "other"];
export const trainingSchema = z.object({
  intentId: z.string().min(1).max(100), category: z.string().max(60), canonical: z.string().min(1).max(200),
  queries: z.array(z.string().min(1).max(500)).min(1).max(100),
  destinationType: z.enum(["Listing", "Category", "Page", "General Answer"]), destinationId: z.string().max(100),
  route: z.string().max(100), action: z.enum(["Search", "Open Page", "Show Map", "Navigate", "Answer"]),
  responses: z.record(z.string().max(2000)), active: z.boolean(),
});
export type Training = z.infer<typeof trainingSchema>;
export function importTraining(values: string[][], visibleIds: Set<string>): Training[] {
  const headers = values[0] ?? [];
  if (TRAINING_COLUMNS.some(h => !headers.includes(h))) throw new Error("Missing required template columns");
  const ids = new Set<string>();
  return values.slice(1).filter(row => row.some(v => v.trim())).map((row, index) => {
    const get = (key: string) => (row[headers.indexOf(key)] ?? "").trim();
    const split = (s: string) => s.split(/[|;\n]/u).map(normalize).filter(Boolean);
    const status = get("Status");
    if (!["Active", "Inactive"].includes(status)) throw new Error(`Row ${index + 2}: invalid Status`);
    let responses: Record<string, string> = {};
    if (get("Response_Text")) {
      try { responses = z.record(z.enum(["te", "en", "hi", "ta", "kn", "ml", "or"]), z.string().max(2000)).parse(JSON.parse(get("Response_Text"))); }
      catch { throw new Error(`Row ${index + 2}: Response_Text must be a seven-language JSON object`); }
    }
    const result = trainingSchema.parse({ intentId: get("Intent_ID"), category: get("Category"), canonical: get("Canonical_Name"), queries: [...new Set(["Primary_Query", "Alternative_Queries", "Telugu_Queries", "English_Queries", "Hindi_Queries", "Tamil_Queries", "Kannada_Queries", "Malayalam_Queries", "Odia_Queries", "Keywords"].flatMap(k => split(get(k))))], destinationType: get("Destination_Type"), destinationId: get("Destination_ID"), route: get("Destination_Route"), action: get("Action_Type"), responses, active: status === "Active" });
    if (ids.has(result.intentId)) throw new Error(`Duplicate Intent_ID: ${result.intentId}`);
    ids.add(result.intentId);
    if (result.destinationType === "Listing" && !visibleIds.has(result.destinationId)) throw new Error(`Row ${index + 2}: destination is not a published listing`);
    if (result.route && !pages.some(p => p === result.route)) throw new Error(`Row ${index + 2}: unknown route`);
    if (result.destinationType === "Category" && !categories.includes(result.category.toLowerCase())) throw new Error(`Row ${index + 2}: unknown category`);
    if (result.destinationType === "Page" && (!pages.some(p => p === result.route) || result.action !== "Open Page")) throw new Error(`Row ${index + 2}: invalid page action`);
    if (result.destinationType === "Listing" && !["Navigate", "Show Map", "Search"].includes(result.action)) throw new Error(`Row ${index + 2}: invalid listing action`);
    if (result.destinationType === "Category" && result.action !== "Search") throw new Error(`Row ${index + 2}: invalid category action`);
    if (result.destinationType === "General Answer" && (result.action !== "Answer" || ["te", "en", "hi", "ta", "kn", "ml", "or"].some(l => !responses[l]?.trim()))) throw new Error(`Row ${index + 2}: all seven answers are required`);
    return result;
  });
}
export function matchTraining(text: string, rows: Training[]) {
  const q = normalize(text);
  const scored = rows.filter(r => r.active).map(row => ({ row, score: Math.max(0, ...row.queries.map(example => normalize(example) === q ? 1 : nameScore(q, [example]))) })).filter(r => r.score >= 0.8).sort((a, b) => b.score - a.score);
  if (!scored[0]) return { match: null, ambiguous: false };
  if (scored[1] && scored[0].score - scored[1].score < 0.05) return { match: null, ambiguous: true };
  return { match: scored[0].row, ambiguous: false };
}
export function trainingIntent(row: Training): AgentIntent | null {
  if (row.destinationType === "Page" && pages.some(p => p === row.route)) return { kind: "open", page: row.route as typeof pages[number] };
  if (row.destinationType === "Category") return row.category.toLowerCase() === "food" ? { kind: "freeFood" } : { kind: "nearest", category: row.category.toLowerCase() };
  return null;
}