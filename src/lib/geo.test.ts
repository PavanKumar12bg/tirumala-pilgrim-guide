import { describe, expect, it } from "vitest";
import { haversineMeters, isInsideTirumala, walkingMinutes } from "./geo";

describe("geo", () => {
  it("1 km takes 15 minutes at 4 km/h", () => {
    expect(walkingMinutes(1000)).toBe(15);
  });
  it("distance of 0.01° latitude is about 1.11 km", () => {
    const d = haversineMeters([13.68, 79.34], [13.69, 79.34]);
    expect(Math.round(d)).toBeGreaterThan(1100);
    expect(Math.round(d)).toBeLessThan(1120);
  });
  it("Tirupati town is outside the Tirumala boundary", () => {
    expect(isInsideTirumala(13.6288, 79.4192)).toBe(false);
    expect(isInsideTirumala(13.68306, 79.34694)).toBe(true);
  });
});
