import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { IMAGE_BUCKET } from "./places";
import { getPublicTransportCategory, listPublicTransportCategories } from "./transport.functions";
export * from "./transport-data";

async function sign(paths: string[]) {
  if (!paths.length) return new Map<string, string>();
  const { data } = await supabase.storage.from(IMAGE_BUCKET).createSignedUrls(paths, 60 * 60 * 24);
  return new Map((data ?? []).filter((d) => d.signedUrl).map((d) => [d.path ?? "", d.signedUrl]));
}

export const transportListQuery = () =>
  queryOptions({
    queryKey: ["transport", "list"],
    queryFn: async () => {
      const cats = await listPublicTransportCategories();
      const urls = await sign(cats.map((c) => c.image_path).filter((p): p is string => !!p));
      return cats.map((c) => ({ ...c, imageSrc: c.image_path ? urls.get(c.image_path) ?? null : null }));
    },
  });

export const transportCategoryQuery = (slug: string) =>
  queryOptions({
    queryKey: ["transport", "category", slug],
    queryFn: async () => {
      const res = await getPublicTransportCategory({ data: { slug } });
      if (!res) return null;
      const urls = await sign(res.items.flatMap((i) => i.photo_paths));
      return { ...res, items: res.items.map((i) => ({ ...i, photoSrcs: i.photo_paths.map((p) => urls.get(p)).filter((x): x is string => !!x) })) };
    },
  });
