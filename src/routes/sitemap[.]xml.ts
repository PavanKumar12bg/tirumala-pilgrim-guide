import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const STATIC = ["/", "/map", "/transport", "/journey", "/darshan", "/emergency", "/blogs", "/ttd", "/about", "/privacy", "/terms", "/contact"];
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

/** Public sitemap: static pages plus published blogs only (anon RLS hides drafts). */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const url = process.env["SUPABASE_URL"] ?? import.meta.env.VITE_SUPABASE_URL;
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        let blogs: { slug: string; updated_at: string }[] = [];
        if (url && key) {
          const client = createClient(url, key, {
            auth: { persistSession: false },
            global: { fetch: (input, init) => { const h = new Headers(init?.headers); if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization"); h.set("apikey", key); return fetch(input, { ...init, headers: h }); } },
          });
          const { data } = await client.from("blogs").select("slug, updated_at").eq("status", "published").limit(1000);
          blogs = data ?? [];
        }
        const rows = [...STATIC.map(p => `<url><loc>${esc(origin + p)}</loc></url>`), ...blogs.map(b => `<url><loc>${esc(`${origin}/blogs/${b.slug}`)}</loc><lastmod>${b.updated_at.slice(0, 10)}</lastmod></url>`)];
        return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${rows.join("")}</urlset>`, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
      },
    },
  },
});
