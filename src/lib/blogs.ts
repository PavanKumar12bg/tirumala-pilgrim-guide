import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Lang } from "./i18n";

export const BLOG_BUCKET = "blog-images";
export const BLOG_CATEGORIES = ["general", "temples", "darshan", "annadanam", "travel", "festivals", "history", "tips"] as const;
export const BLOG_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const BLOG_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/** Safe structured content: rendered as plain text nodes, never as HTML. */
export type BlogBlock = { type: "h2" | "p" | "quote" | "li"; text: string };
export type Blog = {
  id: string; slug: string; lang: Lang; title: string; excerpt: string; content: BlogBlock[];
  category: string; tags: string[]; keywords: string[]; seo_title: string | null; seo_description: string | null;
  featured_image_path: string | null; status: "draft" | "published"; published_at: string | null; updated_at: string;
  imageSrc?: string | null;
};

const PUBLIC_COLS = "id, slug, lang, title, excerpt, content, category, tags, keywords, seo_title, seo_description, featured_image_path, status, published_at, updated_at";

/** Lightweight editor syntax: "## " heading, "- " list item, "> " quote, blank line separates paragraphs. */
export function parseBlogContent(src: string): BlogBlock[] {
  const out: BlogBlock[] = [];
  let para: string[] = [];
  const flush = () => { if (para.length) { out.push({ type: "p", text: para.join(" ").trim() }); para = []; } };
  for (const raw of src.replace(/\r/g, "").split("\n")) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    const m = line.match(/^(##|-|\*|>)\s+(.*)$/);
    if (m) { flush(); out.push({ type: m[1] === "##" ? "h2" : m[1] === ">" ? "quote" : "li", text: m[2]!.trim() }); }
    else para.push(line);
  }
  flush();
  return out.filter(b => b.text).slice(0, 400).map(b => ({ ...b, text: b.text.slice(0, 5000) }));
}
export const serializeBlogContent = (blocks: BlogBlock[]) =>
  blocks.map(b => (b.type === "h2" ? `## ${b.text}` : b.type === "li" ? `- ${b.text}` : b.type === "quote" ? `> ${b.text}` : b.text)).join("\n\n");

export const slugifyBlog = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
export const isValidSlug = (s: string) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s) && s.length <= 80;
export const blogPlainText = (b: Pick<Blog, "title" | "excerpt" | "content">) => [b.title, b.excerpt, ...b.content.map(x => x.text)].join(". ");

const norm = (s: string) => s.normalize("NFC").replace(/[\u200b-\u200d\ufeff]/gu, "").toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, " ").trim();
/** Rank published blogs for a text query (title > tags/keywords/category > excerpt > body). */
export function searchBlogs(query: string, blogs: Blog[]) {
  const words = norm(query).split(" ").filter(w => w.length > 1);
  if (!words.length) return blogs;
  return blogs.map(b => {
    const title = norm(b.title), meta = norm([...b.tags, ...b.keywords, b.category].join(" ")), ex = norm(b.excerpt), body = norm(b.content.map(c => c.text).join(" "));
    const score = words.reduce((s, w) => s + (title.includes(w) ? 3 : 0) + (meta.includes(w) ? 2 : 0) + (ex.includes(w) ? 1 : 0) + (body.includes(w) ? 0.5 : 0), 0) / words.length;
    return { b, score };
  }).filter(x => x.score >= 0.5).sort((a, b) => b.score - a.score).map(x => x.b);
}

async function attach(list: Blog[]) {
  const paths = list.map(b => b.featured_image_path).filter((x): x is string => !!x);
  if (!paths.length) return list;
  const { data } = await supabase.storage.from(BLOG_BUCKET).createSignedUrls(paths, 60 * 60 * 24 * 7);
  const map = new Map((data ?? []).map(d => [d.path, d.signedUrl]));
  return list.map(b => ({ ...b, imageSrc: b.featured_image_path ? map.get(b.featured_image_path) ?? null : null }));
}

/** Published only (RLS also hides drafts). Refetched so admin edits appear without code changes. */
export const blogsQuery = () => queryOptions({
  queryKey: ["blogs", "public"],
  queryFn: async () => {
    const { data, error } = await supabase.from("blogs").select(PUBLIC_COLS).eq("status", "published").order("published_at", { ascending: false }).limit(200);
    if (error) throw error;
    return attach((data ?? []) as unknown as Blog[]);
  },
  staleTime: 60_000,
});
export const blogQuery = (slug: string) => queryOptions({
  queryKey: ["blogs", "public", slug],
  queryFn: async () => {
    const { data, error } = await supabase.from("blogs").select(PUBLIC_COLS).eq("slug", slug).eq("status", "published").maybeSingle();
    if (error) throw error;
    return data ? (await attach([data as unknown as Blog]))[0]! : null;
  },
  staleTime: 60_000,
});
export const adminBlogsQuery = () => queryOptions({
  queryKey: ["blogs", "admin"],
  queryFn: async () => {
    const { data, error } = await supabase.from("blogs").select(PUBLIC_COLS).order("updated_at", { ascending: false });
    if (error) throw error;
    return attach((data ?? []) as unknown as Blog[]);
  },
});
