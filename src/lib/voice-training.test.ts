import { describe, expect, it } from "vitest";
import { importTraining, matchTraining, TRAINING_COLUMNS, trainingIntent } from "./voice-training";
import { findPlaces, parseIntent } from "./voice-agent";
import type { Place } from "./places";
const destination = "00000000-0000-4000-8000-000000000001";
const entry = (fields: Record<string, string> = {}) => TRAINING_COLUMNS.map(h => ({ Intent_ID: "temple", Category: "Temple", Canonical_Name: "Srivari Temple", Primary_Query: "Take me to Srivari Temple", Telugu_Queries: "శ్రీవారి ఆలయానికి తీసుకెళ్లు", Destination_Type: "Listing", Destination_ID: destination, Action_Type: "Navigate", Status: "Active", ...fields } as Record<string, string>)[h] ?? "");
describe("secure dynamic query training", () => {
  it("imports all language columns and resolves actual destination id", () => {
    const rows = importTraining([TRAINING_COLUMNS, entry({ Hindi_Queries: "बालाजी मंदिर", Tamil_Queries: "கோவில்", Kannada_Queries: "ದೇವಾಲಯ", Malayalam_Queries: "ക്ഷേത്രം", Odia_Queries: "ମନ୍ଦିର" })], new Set([destination]));
    expect(matchTraining("శ్రీవారి ఆలయానికి తీసుకెళ్లు", rows).match?.destinationId).toBe(destination);
    expect(rows[0]?.queries).toHaveLength(7);
  });
  it("new synced patterns match without retraining", () => {
    const rows = importTraining([TRAINING_COLUMNS, entry({ Alternative_Queries: "show the big shrine" })], new Set([destination]));
    expect(matchTraining("show the big shrine", rows).match?.intentId).toBe("temple");
  });
  it("rejects invalid or unpublished ids", () => expect(() => importTraining([TRAINING_COLUMNS, entry()], new Set())).toThrow("published listing"));
  it("rejects arbitrary actions", () => expect(() => importTraining([TRAINING_COLUMNS, entry({ Action_Type: "eval" })], new Set([destination]))).toThrow());
  it("rejects arbitrary routes", () => expect(() => importTraining([TRAINING_COLUMNS, entry({ Destination_Route: "https://evil.test" })], new Set([destination]))).toThrow("route"));
  it("inactive entries never match", () => expect(matchTraining("take me to srivari temple", importTraining([TRAINING_COLUMNS, entry({ Status: "Inactive" })], new Set([destination]))).match).toBeNull());
  it("asks for clarification for equal mappings", () => {
    const rows = importTraining([TRAINING_COLUMNS, entry(), entry({ Intent_ID: "other" })], new Set([destination]));
    expect(matchTraining("Take me to Srivari Temple", rows).ambiguous).toBe(true);
  });
  it("allows only existing page actions", () => {
    const rows = importTraining([TRAINING_COLUMNS, entry({ Destination_Type: "Page", Destination_ID: "", Destination_Route: "/transport", Action_Type: "Open Page" })], new Set());
    expect(rows[0] && trainingIntent(rows[0])).toEqual({ kind: "open", page: "/transport" });
  });
});
describe("natural destination commands", () => {
  const temple = { id: destination, slug: "real-temple", visible: true, category: "temple", name: { en: "Sri Venkateswara Swamy Temple" }, description: {} } as Place;
  it.each(["శ్రీవారి ఆలయానికి తీసుకెళ్లు", "వెంకటేశ్వర స్వామి గుడికి దారి చూపించు", "శ్రీవారి గుడి ఎక్కడ ఉంది?", "బాలాజీ టెంపుల్ దగ్గరకు వెళ్ళాలి", "వెంకటేశ్వర ఆలయం చూపించు", "శ్రీవారి ఆలయం ముందుకు తీసుకెళ్లు", "గుడికి ఎలా వెళ్లాలి?", "Take me to Srivari Temple", "Show the way to Lord Venkateswara Temple", "Where is Balaji Temple", "Navigate to the main temple", "I want to visit the temple"])("%s resolves real temple", text => {
    const intent = parseIntent(text); expect(intent?.kind).toBe("navigate");
    expect(intent?.kind === "navigate" && findPlaces(intent.query, [temple]).match?.id).toBe(destination);
  });
  it.each(["భోజనం ఎక్కడ దొరుకుతుంది?", "ఉచిత అన్నం ఎక్కడ?", "ఫ్రీ ఫుడ్ ఎక్కడ ఉంది?"])("%s finds food", text => expect(parseIntent(text)?.kind).toBe("freeFood"));
  it("specific absent Vengamamba never substitutes an unrelated food place", () => {
    const food = { ...temple, category: "food", name: { en: "Annaprasadam Bhavan" } };
    expect(findPlaces("Vengamamba Annasatram", [food]).match).toBeNull();
  });
});