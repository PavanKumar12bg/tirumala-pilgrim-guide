import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DictKey, Lang } from "./i18n";

export const CATEGORIES = [
  { id: "temple", icon: "🛕" },
  { id: "food", icon: "🍛" },
  { id: "office", icon: "🏛️" },
  { id: "enquiry", icon: "ℹ️" },
  { id: "transport", icon: "🚌" },
  { id: "parking", icon: "🅿️" },
  { id: "amenity", icon: "🙏" },
  { id: "toilet", icon: "🚻" },
  { id: "medical", icon: "⚕️" },
  { id: "hotel", icon: "🏨" },
  { id: "landmark", icon: "📍" },
  { id: "other", icon: "✦" },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]["id"];
export const catKey = (id: string) => `cat_${id}` as DictKey;
export const catIcon = (id: string) => CATEGORIES.find((c) => c.id === id)?.icon ?? "✦";

export type Localized = { [K in Lang]?: string | undefined };
export type Place = {
  id: string;
  slug: string;
  category: string;
  name: Localized;
  description: Localized;
  lat: number | null;
  lng: number | null;
  coords_verified: boolean;
  visible: boolean;
  featured: boolean;
  sort_order: number;
  image_path: string | null;
  image_width: number | null;
  image_height: number | null;
  image_bytes: number | null;
  updated_at: string;
  imageSrc?: string | null;
};

export const IMAGE_BUCKET = "place-images";

/** Only places with verified coordinates are shown as markers. */
export const hasVerifiedCoords = (p: Place): p is Place & { lat: number; lng: number } =>
  p.coords_verified && p.lat != null && p.lng != null;

async function attachImages(list: Place[]) {
  const paths = list.map((p) => p.image_path).filter((x): x is string => !!x);
  if (!paths.length) return list;
  const { data } = await supabase.storage.from(IMAGE_BUCKET).createSignedUrls(paths, 60 * 60 * 24);
  const map = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return list.map((p) => ({ ...p, imageSrc: p.image_path ? map.get(p.image_path) ?? null : null }));
}

export const placesQuery = (opts: { admin?: boolean } = {}) =>
  queryOptions({
    queryKey: ["places", opts.admin ? "admin" : "public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("places")
        .select("*")
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return attachImages((data ?? []) as unknown as Place[]);
    },
  });

export type Announcement = { id: string; text: Localized; active: boolean; sort_order: number };
export const announcementsQuery = () =>
  queryOptions({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase.from("announcements").select("*").order("sort_order").order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as Announcement[];
    },
  });

export type CrowdLevel = "low" | "moderate" | "high" | "very_high";
export type SiteStatus = {
  darshan_wait_hours: number | null;
  darshan_note: Localized;
  crowd_level: CrowdLevel | null;
  updated_at: string;
};
export const statusQuery = () =>
  queryOptions({
    queryKey: ["site_status"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_status").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data as unknown as SiteStatus | null;
    },
  });
