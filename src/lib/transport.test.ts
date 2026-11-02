import { describe, expect, it } from "vitest";
import { PRIVATE_KEYS, telHref, toPublicOffers, TEMPLATE_DEFS } from "./transport";
import { TRANSPORT_COPY } from "./transport-copy";
import { DICTS, LANGS } from "./i18n";

const provider = { id: "p1", display_name: "Sri Travels", vehicle_type: "Sumo", capacity: 7, public_phone: "+91 90000 00000", service_area: "Tirupati", commission: "10%", private_phone: "999", internal_notes: "secret", status: "approved", active: true };
const offer = (id: string, category_id: string, provider_id = "p1") => ({ id, provider_id, category_id, price_text: "₹2000", included_places: null, duration_text: null, inclusions: null, exclusions: null, extra_charges: null, sort_order: 1, published: true, agreement_notes: "x" });

describe("public transport data", () => {
  it("never passes commission, private phone, notes or status fields to visitors", () => {
    const out = toPublicOffers([offer("o1", "c1")], [provider], "c1");
    const json = JSON.stringify(out);
    for (const k of PRIVATE_KEYS) expect(json).not.toContain(`"${k}"`);
    expect(out[0]?.provider.public_phone).toBe("+91 90000 00000");
  });
  it("shows a provider only inside the category it is linked to", () => {
    expect(toPublicOffers([offer("o1", "packageA")], [provider], "packageB")).toEqual([]);
  });
  it("drops offers whose provider was not returned as public", () => {
    expect(toPublicOffers([offer("o1", "c1", "hidden")], [provider], "c1")).toEqual([]);
  });
  it("builds call links from the public number only", () => {
    expect(telHref("+91 90000-00000")).toBe("tel:+919000000000");
    expect(telHref(null)).toBeNull();
  });
  it("free bus layout shows the no-live-data notice and no providers", () => {
    expect(TEMPLATE_DEFS.bus_routes.noLiveNotice).toBe(true);
    expect(TEMPLATE_DEFS.bus_routes.providers).toBe(false);
  });
  it("has transport wording in all seven languages", () => {
    for (const { code } of LANGS) for (const k of Object.keys(TRANSPORT_COPY.en) as (keyof typeof TRANSPORT_COPY.en)[]) expect(DICTS[code][k].trim().length).toBeGreaterThan(0);
  });
});
