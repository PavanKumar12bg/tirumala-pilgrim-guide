import { describe, expect, it } from "vitest";
import { geoJsonToLatLng, haversineMeters, isInsideTirumala, locateOnRoute, nearbySorted, NAV_CONFIG, walkingMinutes } from "./geo";

describe("geo", () => {
  it("GeoJSON [lon, lat] becomes Leaflet [lat, lng]", () => {
    expect(geoJsonToLatLng([79.347352, 13.683243])).toEqual([13.683243, 79.347352]);
  });
  it("1 km takes 15 minutes at 4 km/h", () => {
    expect(walkingMinutes(1000)).toBe(15);
  });
  it("distance of 0.01° latitude is about 1.11 km", () => {
    const d = haversineMeters([13.68, 79.34], [13.69, 79.34]);
    expect(d).toBeGreaterThan(1100);
    expect(d).toBeLessThan(1120);
  });
  it("temple is inside the map area, Chennai is not", () => {
    expect(isInsideTirumala(13.683243, 79.347352)).toBe(true);
    expect(isInsideTirumala(13.0827, 80.2707)).toBe(false);
  });
  it("remaining distance along a route shrinks as the walker advances", () => {
    const route: [number, number][] = [[13.68, 79.34], [13.681, 79.34], [13.682, 79.34]];
    const start = locateOnRoute([13.68, 79.34], route);
    const mid = locateOnRoute([13.681, 79.34], route);
    expect(start.remaining).toBeGreaterThan(220);
    expect(mid.remaining).toBeGreaterThan(105);
    expect(mid.remaining).toBeLessThan(115);
    expect(mid.offset).toBeLessThan(1);
  });
  it("a point 60 m beside the route is off-route by the 40 m threshold", () => {
    const route: [number, number][] = [[13.68, 79.34], [13.682, 79.34]];
    const { offset } = locateOnRoute([13.681, 79.34055], route);
    expect(offset).toBeGreaterThan(NAV_CONFIG.offRouteMeters);
  });
  it("nearby places are sorted nearest first and limited by threshold", () => {
    const places = [
      { id: "far", lat: 13.69, lng: 79.34 },
      { id: "near", lat: 13.6801, lng: 79.34 },
      { id: "mid", lat: 13.681, lng: 79.34 },
    ];
    const r = nearbySorted(places, [13.68, 79.34], 300);
    expect(r.map((x) => x.item.id)).toEqual(["near", "mid"]);
  });
});
