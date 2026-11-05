import type { DictKey } from "./i18n";
import type { Localized } from "./places";

export const TEMPLATES = ["package", "route_guide", "bus_routes", "pickup", "help_info"] as const;
export type TemplateId = (typeof TEMPLATES)[number];
export const ITEM_KINDS = ["destination", "route_option", "bus_route", "pickup_point", "help_note"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

/** Each template: which item kind it lists, its heading, and whether linked providers are shown. */
export const TEMPLATE_DEFS: Record<TemplateId, { label: string; itemKind: ItemKind; heading: DictKey; providers: boolean; noLiveNotice?: boolean }> = {
  package: { label: "Package (destinations + providers)", itemKind: "destination", heading: "destinations", providers: true },
  route_guide: { label: "Route guide (road / bus / footpath)", itemKind: "route_option", heading: "routeOptions", providers: true },
  bus_routes: { label: "Bus routes (stops, no live data)", itemKind: "bus_route", heading: "routeOptions", providers: true, noLiveNotice: true },
  pickup: { label: "Pickup providers", itemKind: "pickup_point", heading: "pickupPoints", providers: true },
  help_info: { label: "Help & information", itemKind: "help_note", heading: "helpNotes", providers: false },
};
export const isTemplate = (v: unknown): v is TemplateId => typeof v === "string" && (TEMPLATES as readonly string[]).includes(v);

export type Source = { label: string; url: string };
export type Sections = { hide_providers?: boolean; hide_sources?: boolean; heading?: Localized; providers_heading?: Localized };
export type ItemDetails = { mode?: string; boarding_points?: string[]; stops?: string[]; access?: string; link?: string };

/** Only these columns are ever sent to public visitors. */
export const PUBLIC_CATEGORY_COLS = "id, slug, template, title, description, icon, image_path, sort_order, sections, sources, last_verified_on";
export const PUBLIC_ITEM_COLS = "id, category_id, kind, title, body, photo_paths, place_id, duration_text, notes, fare_text, details, source_url, last_verified_on, sort_order";
export const PUBLIC_OFFER_COLS = "id, provider_id, category_id, price_text, included_places, duration_text, inclusions, exclusions, extra_charges, sort_order";
export const PUBLIC_PROVIDER_COLS = "id, display_name, vehicle_type, capacity, public_phone, service_area";
export const PRIVATE_KEYS = ["commission", "agreement_notes", "private_phone", "internal_notes", "status", "active", "published"] as const;

export type PublicCategory = { id: string; slug: string; template: TemplateId; title: Localized; description: Localized; icon: string; image_path: string | null; sort_order: number; sections: Sections; sources: Source[]; last_verified_on: string | null; imageSrc?: string | null };
export type PublicItem = { id: string; category_id: string; kind: ItemKind; title: Localized; body: Localized; photo_paths: string[]; place_id: string | null; duration_text: string | null; notes: Localized; fare_text: string | null; details: ItemDetails; source_url: string | null; last_verified_on: string | null; sort_order: number; photoSrcs?: string[] };
export type PublicProvider = { id: string; display_name: string; vehicle_type: string | null; capacity: number | null; public_phone: string | null; service_area: string | null };
export type PublicOffer = { id: string; provider_id: string; category_id: string; price_text: string | null; included_places: string | null; duration_text: string | null; inclusions: string | null; exclusions: string | null; extra_charges: string | null; sort_order: number; provider: PublicProvider };

const pick = <T extends object>(row: Record<string, unknown>, cols: string): T =>
  Object.fromEntries(cols.split(",").map((c) => c.trim()).map((c) => [c, row[c] ?? null])) as T;

/** Defensive allow-list copy so no private field can leak even if a query changes. */
export function toPublicOffers(offers: Record<string, unknown>[], providers: Record<string, unknown>[], categoryId: string): PublicOffer[] {
  const byId = new Map(providers.map((p) => [p["id"], pick<PublicProvider>(p, PUBLIC_PROVIDER_COLS)]));
  return offers
    .filter((o) => o["category_id"] === categoryId && byId.has(o["provider_id"]))
    .map((o) => ({ ...pick<Omit<PublicOffer, "provider">>(o, PUBLIC_OFFER_COLS), provider: byId.get(o["provider_id"]) as PublicProvider }))
    .sort((a, b) => a.sort_order - b.sort_order);
}

/** tel: link built only from the public number (digits and leading +). */
export const telHref = (phone: string | null) => {
  const clean = (phone ?? "").replace(/[^\d+]/g, "");
  return clean.replace("+", "").length >= 3 ? `tel:${clean}` : null;
};

