import { describe, expect, it } from "vitest";
import { interpretCommand } from "./voice-commands";
describe("controlled Telugu commands", () => {
 const cases = [
  ["దగ్గరలో హాస్పిటల్ ఎక్కడ ఉంది?", { kind: "category", category: "medical" }],
  ["దగ్గరలో టాయిలెట్లు చూపించు", { kind: "category", category: "toilet" }],
  ["అన్నప్రసాద కేంద్రాలు ఎక్కడ ఉన్నాయి?", { kind: "category", category: "food" }],
  ["స్వామివారి ఆలయం ఎక్కడ ఉంది?", { kind: "temple" }],
  ["నా ప్రస్తుత స్థానం చూపించు", { kind: "location" }],
  ["దగ్గరలో ఉన్న ప్రదేశాలు చూపించు", { kind: "nearby" }],
  ["నావిగేషన్ ఆపు", { kind: "stop" }],
  ["ఇంగ్లీష్‌లో మార్చు", { kind: "language", language: "en" }],
  ["తెలుగులో మార్చు", { kind: "language", language: "te" }],
  ["మ్యాప్ ఓపెన్ చేయి", { kind: "map" }],
 ] as const;
 for (const [text, action] of cases) it(text, () => expect(interpretCommand(text)).toEqual(action));
 it("does not interpret an unknown phrase as navigation", () => expect(interpretCommand("delete everything")).toEqual({ kind: "search", text: "delete everything" }));
 it("recognizes hospital terms in all seven languages", () => {
  for (const text of ["hospital", "ఆసుపత్రి", "மருத்துவமனை", "ಆಸ್ಪತ್ರೆ", "ആശുപത്രി", "अस्पताल", "ଡାକ୍ତରଖାନା"]) expect(interpretCommand(text)).toEqual({ kind: "category", category: "medical" });
 });
});