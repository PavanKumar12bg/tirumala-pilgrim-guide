import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  isTemplate, PUBLIC_CATEGORY_COLS, PUBLIC_ITEM_COLS, PUBLIC_OFFER_COLS, PUBLIC_PROVIDER_COLS, toPublicOffers,
  type PublicCategory, type PublicItem, type PublicOffer,
} from "./transport";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/** Published categories only (RLS also enforces this for anonymous readers). */
export const listPublicTransportCategories = createServerFn({ method: "GET" }).handler(async (): Promise<PublicCategory[]> => {
  const { data, error } = await publicClient().from("transport_categories").select(PUBLIC_CATEGORY_COLS).eq("status", "published").order("sort_order");
  if (error) { console.error("transport list", error.message); throw new Error("Could not load transport information"); }
  return ((data ?? []) as unknown as PublicCategory[]).filter((c) => isTemplate(c.template));
});

export const getPublicTransportCategory = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => ({ slug: String(d.slug).slice(0, 80) }))
  .handler(async ({ data }): Promise<{ category: PublicCategory; items: PublicItem[]; offers: PublicOffer[] } | null> => {
    const sb = publicClient();
    const { data: cat, error } = await sb.from("transport_categories").select(PUBLIC_CATEGORY_COLS).eq("slug", data.slug).eq("status", "published").maybeSingle();
    if (error) { console.error("transport category", error.message); throw new Error("Could not load transport information"); }
    if (!cat) return null;
    const category = cat as unknown as PublicCategory;
    const [items, offers] = await Promise.all([
      sb.from("transport_items").select(PUBLIC_ITEM_COLS).eq("category_id", category.id).eq("published", true).order("sort_order"),
      sb.from("transport_offers").select(PUBLIC_OFFER_COLS).eq("category_id", category.id).eq("published", true),
    ]);
    const offerRows = (offers.data ?? []) as unknown as Record<string, unknown>[];
    const ids = [...new Set(offerRows.map((o) => String(o["provider_id"])))];
    const providers = ids.length ? (await sb.from("transport_providers").select(PUBLIC_PROVIDER_COLS).in("id", ids)).data ?? [] : [];
    return {
      category,
      items: (items.data ?? []) as unknown as PublicItem[],
      offers: toPublicOffers(offerRows, providers as unknown as Record<string, unknown>[], category.id),
    };
  });
