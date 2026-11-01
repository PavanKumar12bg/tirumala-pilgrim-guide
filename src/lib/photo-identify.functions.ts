import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Result = { ok: true; depicted: string; place_id: string | null; confidence: string; reason: string } | { ok: false; error: string };

export const suggestPlaceForPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { image: string }) => {
    if (typeof d?.image !== "string" || !/^data:image\/(webp|jpeg|png);base64,/.test(d.image)) throw new Error("Invalid image");
    if (d.image.length > 1_500_000) throw new Error("Image too large");
    return d;
  })
  .handler(async ({ data, context }): Promise<Result> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) return { ok: false, error: "Only administrators can use photo identification." };
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { ok: false, error: "AI is not configured for this app." };
    const { data: rows, error } = await context.supabase.from("places").select("id, name, category");
    if (error) return { ok: false, error: "Could not load places." };
    const candidates = (rows ?? []).map((r) => {
      const n = (r.name ?? {}) as Record<string, string | undefined>;
      return { id: r.id, name: [n["en"], n["te"]].filter(Boolean).join(" / ") || "(unnamed)", category: r.category };
    });
    try {
      const { identifyPlacePhoto } = await import("./photo-identify.server");
      const s = await identifyPlacePhoto(key, data.image, candidates);
      return { ok: true, ...s };
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      console.error("photo identify failed", e);
      if (status === 402) return { ok: false, error: "AI credits are used up. Add credits in Settings → Plans & credits." };
      if (status === 429) return { ok: false, error: "AI is busy right now. Please try again in a minute." };
      if (status === 403) return { ok: false, error: "AI access is blocked for this workspace." };
      return { ok: false, error: e instanceof Error && !status ? e.message : "AI photo identification failed." };
    }
  });
