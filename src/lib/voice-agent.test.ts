import { describe, expect, it } from "vitest";
import { findKnowledge, findPlaces, nearestPlaces, parseIntent, localizedWithFlag, type Knowledge } from "./voice-agent";
import type { Place } from "./places";

const place = (slug: string, category: string, name: Record<string, string>, coords: [number, number] | null, extra: Partial<Place> = {}) => ({
  id: slug, slug, category, name, description: {}, lat: coords?.[0] ?? null, lng: coords?.[1] ?? null, coords_verified: !!coords, visible: true, featured: false, sort_order: 1, ...extra,
}) as unknown as Place;

const places = [
  place("hotel-a", "hotel", { en: "Srinivasam Rest House", te: "శ్రీనివాసం" }, [13.68, 79.35]),
  place("hotel-b", "hotel", { en: "Madhavam Rest House" }, [13.6835, 79.3475]),
  place("hotel-hidden", "hotel", { en: "Hidden Rest House" }, [13.683, 79.347], { visible: false }),
  place("temple-x", "temple", { en: "Varaha Swamy Temple" }, null),
];

describe("voice intents", () => {
  it("understands bathroom requests in English, Telugu and Hindi", () => {
    expect(parseIntent("I need a bathroom")).toEqual({ kind: "nearest", category: "toilet" });
    expect(parseIntent("దగ్గరలో టాయిలెట్ ఎక్కడ")).toEqual({ kind: "nearest", category: "toilet" });
    expect(parseIntent("नज़दीकी शौचालय कहाँ है")).toEqual({ kind: "nearest", category: "toilet" });
  });
  it("understands drinking water", () => expect(parseIntent("where can I get drinking water")).toEqual({ kind: "nearest", category: "water" }));
  it("extracts the destination from navigate phrases", () => {
    expect(parseIntent("Take me to Srinivasam")).toEqual({ kind: "navigate", query: "srinivasam" });
    expect(parseIntent("శ్రీనివాసం కి తీసుకెళ్ళు")).toEqual({ kind: "navigate", query: "శ్రీనివాసం" });
  });
  it("maps controls", () => {
    expect(parseIntent("scroll down")).toEqual({ kind: "scrollDown" });
    expect(parseIntent("stop speaking")).toEqual({ kind: "stopSpeaking" });
    expect(parseIntent("stop navigation")).toEqual({ kind: "stopNav" });
    expect(parseIntent("speak slower")).toEqual({ kind: "slower" });
    expect(parseIntent("open the map")).toEqual({ kind: "open", page: "/map" });
    expect(parseIntent("change language to telugu")).toEqual({ kind: "language", language: "te" });
  });
  it("refuses bookings", () => expect(parseIntent("book a darshan ticket")).toEqual({ kind: "outside" }));
});

describe("place retrieval", () => {
  it("finds a place by any localized name", () => expect(findPlaces("శ్రీనివాసం", places).match?.slug).toBe("hotel-a"));
  it("asks to choose when several match equally", () => expect(findPlaces("rest house", places).options.map(p => p.slug)).toEqual(["hotel-a", "hotel-b"]));
  it("never returns hidden places", () => expect(findPlaces("hidden rest house", places).match?.slug).not.toBe("hotel-hidden"));
  it("sorts nearest by real distance and only uses verified coordinates", () => {
    const r = nearestPlaces("hotel", places, [13.6836, 79.3474]);
    expect(r.mapped.map(x => x.place.slug)).toEqual(["hotel-b", "hotel-a"]);
    expect(r.mapped[0]?.meters).toBeLessThan(50);
    expect(nearestPlaces("temple", places, [13.68, 79.35]).mapped).toEqual([]);
  });
  it("reports no distance without a location", () => expect(nearestPlaces("hotel", places, null).mapped[0]?.meters).toBeNull());
});

describe("knowledge", () => {
  const kb: Knowledge[] = [{ id: "1", question: { en: "What is the dress code?" }, answer: { en: "Traditional dress." }, keywords: ["dress", "clothes"], category: "general", source_label: "TTD", source_url: null, ttd_verified: true }];
  it("matches by keywords", () => expect(findKnowledge("what clothes should I wear", kb)?.id).toBe("1"));
  it("ignores unrelated questions", () => expect(findKnowledge("bus fare to tirupati", kb)).toBeNull());
  it("flags language fallback", () => expect(localizedWithFlag(kb[0]!.answer, "te")).toEqual({ text: "Traditional dress.", fallback: true }));
});
