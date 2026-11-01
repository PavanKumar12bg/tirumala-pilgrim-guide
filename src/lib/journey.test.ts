import { describe, expect, it } from "vitest";
import { journeySchema, moveStop, nextDate, type JourneyStop } from "./journey";

const stops: JourneyStop[] = ["temple", "tank"].map((placeId) => ({ id: placeId, placeId, arrival: "", visitedAt: null }));
describe("journey planning", () => {
  it("preserves morning start, arrival times and visited places across serialization", () => {
    const value = [{ id: "day-one", date: "2026-11-01", start: "07:30", stops: [{ ...stops[0], arrival: "08:15", visitedAt: "2026-11-01T02:45:00.000Z" }] }];
    const saved = journeySchema.parse(JSON.parse(JSON.stringify(value)));
    expect(saved[0]?.start).toBe("07:30");
    expect(saved[0]?.stops[0]?.arrival).toBe("08:15");
    expect(saved[0]?.stops[0]?.visitedAt).toBe("2026-11-01T02:45:00.000Z");
  });
  it("moves a stop without changing its place record", () => {
    expect(moveStop(stops, "tank", -1).map((s) => s.placeId)).toEqual(["tank", "temple"]);
    expect(moveStop(stops, "temple", -1)).toEqual(stops);
  });
  it("adds the next calendar day across month and year boundaries", () => {
    expect(nextDate("2026-11-30")).toBe("2026-12-01");
    expect(nextDate("2026-12-31")).toBe("2027-01-01");
  });
  it("rejects corrupt times and empty saved journeys", () => {
    expect(journeySchema.safeParse([{ id: "d", date: "2026-11-01", start: "25:00", stops: [] }]).success).toBe(false);
    expect(journeySchema.safeParse([]).success).toBe(false);
  });
});