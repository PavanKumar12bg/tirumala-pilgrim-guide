import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LANGS } from "@/lib/i18n";
import { compressToWebp } from "@/lib/image-compress";
import {
  adminBlogsQuery, BLOG_BUCKET, BLOG_CATEGORIES, BLOG_IMAGE_MAX_BYTES, BLOG_IMAGE_TYPES, isValidSlug,
  parseBlogContent, serializeBlogContent, slugifyBlog, type Blog,
} from "@/lib/blogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const selectCls = "h-11 w-full rounded-md border border-input bg-card px-3 text-base";
const list = (s: string) => s.split(",").map(x => x.trim()).filter(Boolean).slice(0, 20);

/** Admin-only blogs CMS. RLS restricts all writes and draft reads to admins. */
export function BlogsAdmin() {
  const q = useQuery(adminBlogsQuery());
  const [editing, setEditing] = useState<Blog | "new" | null>(null);
  if (editing) return <BlogForm blog={editing === "new" ? null : editing} onDone={() => setEditing(null)} />;
  const blogs = q.data ?? [];
  return (
    <div className="space-y-4">
      <Button onClick={() => setEditing("new")}><Plus className="size-4" />New blog</Button>
      {q.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {q.error && <p role="alert" className="text-sm text-destructive">{q.error.message}</p>}
      {(["draft", "published"] as const).map(status => (
        <section key={status}>
          <h3 className="mb-2 font-semibold">{status === "draft" ? "Drafts" : "Published"} ({blogs.filter(b => b.status === status).length})</h3>
          <ul className="divide-y rounded-md border">
            {blogs.filter(b => b.status === status).map(b => (
              <li key={b.id}>
                <button type="button" className="flex w-full items-center gap-3 p-3 text-left hover:bg-secondary/50" onClick={() => setEditing(b)}>
                  {b.imageSrc ? <img src={b.imageSrc} alt="" className="size-12 shrink-0 rounded object-cover" /> : <span className="size-12 shrink-0 rounded bg-muted" />}
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium">{b.title || "(untitled)"}</span><span className="block truncate text-xs text-muted-foreground">/blogs/{b.slug} · {b.lang} · {b.category}</span></span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function BlogForm({ blog, onDone }: { blog: Blog | null; onDone: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(blog?.title ?? "");
  const [slug, setSlug] = useState(blog?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!blog);
  const [excerpt, setExcerpt] = useState(blog?.excerpt ?? "");
  const [body, setBody] = useState(blog ? serializeBlogContent(blog.content) : "");
  const [category, setCategory] = useState(blog?.category ?? "general");
  const [lang, setLang] = useState<string>(blog?.lang ?? "te");
  const [tags, setTags] = useState((blog?.tags ?? []).join(", "));
  const [keywords, setKeywords] = useState((blog?.keywords ?? []).join(", "));
  const [seoTitle, setSeoTitle] = useState(blog?.seo_title ?? "");
  const [seoDesc, setSeoDesc] = useState(blog?.seo_description ?? "");
  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const imgSrc = image?.url ?? blog?.imageSrc ?? null;
  const refresh = () => qc.invalidateQueries({ queryKey: ["blogs"] });

  const pick = async (file: File) => {
    if (!BLOG_IMAGE_TYPES.includes(file.type)) { toast.error("Choose a JPG, PNG, WebP or AVIF image"); return; }
    if (file.size > BLOG_IMAGE_MAX_BYTES * 4) { toast.error("Image is larger than 20 MB"); return; }
    try {
      const out = await compressToWebp(file, 1600);
      if (out.blob.size > BLOG_IMAGE_MAX_BYTES) { toast.error("Image is still over 5 MB after compression"); return; }
      if (image) URL.revokeObjectURL(image.url);
      setImage({ blob: out.blob, url: URL.createObjectURL(out.blob) });
    } catch { toast.error("Could not read this image"); }
  };

  const save = async (status: "draft" | "published") => {
    const s = slug.trim();
    if (!title.trim()) { toast.error("Enter a title"); return; }
    if (!isValidSlug(s)) { toast.error("Slug: lowercase letters, numbers and single hyphens only"); return; }
    if (status === "published" && (!excerpt.trim() || (!image && !blog?.featured_image_path))) { toast.error("Publishing needs a short description and a featured image"); return; }
    setBusy(true);
    try {
      const row = {
        title: title.trim(), slug: s, excerpt: excerpt.trim().slice(0, 400), content: parseBlogContent(body), category, lang,
        tags: list(tags), keywords: list(keywords), seo_title: seoTitle.trim() || null, seo_description: seoDesc.trim().slice(0, 300) || null,
      };
      let id = blog?.id;
      if (!id) {
        const { data, error } = await supabase.from("blogs").insert({ ...row, status: "draft" }).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      let imagePath = blog?.featured_image_path ?? null;
      if (image) {
        const path = `${id}/${Date.now()}.webp`;
        const up = await supabase.storage.from(BLOG_BUCKET).upload(path, image.blob, { contentType: "image/webp" });
        if (up.error) throw up.error;
        imagePath = path;
      }
      const { data: saved, error } = await supabase.from("blogs").update({ ...row, featured_image_path: imagePath, status, ...(status === "draft" ? { published_at: null } : {}) }).eq("id", id).select("id");
      if (error) throw error;
      if (!saved?.length) throw new Error("Save was not confirmed");
      if (image && blog?.featured_image_path && blog.featured_image_path !== imagePath) await supabase.storage.from(BLOG_BUCKET).remove([blog.featured_image_path]);
      toast.success(status === "published" ? "Published" : "Saved as draft");
      await refresh();
      onDone();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
      toast.error(/duplicate|unique/i.test(msg) ? "That slug is already used" : msg);
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!blog || !confirm(`Delete "${blog.title}" permanently?`)) return;
    setBusy(true);
    const { error } = await supabase.from("blogs").delete().eq("id", blog.id);
    if (!error && blog.featured_image_path) {
      const { data } = await supabase.storage.from(BLOG_BUCKET).list(blog.id);
      if (data?.length) await supabase.storage.from(BLOG_BUCKET).remove(data.map(f => `${blog.id}/${f.name}`));
    }
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    await refresh();
    onDone();
  };

  if (preview) {
    const blocks = parseBlogContent(body);
    return (
      <div className="space-y-3">
        <Badge variant="secondary">Preview — not public</Badge>
        <div lang={lang} className="space-y-3 rounded-md border p-4">
          <h1 className="font-display text-2xl text-primary">{title}</h1>
          {imgSrc && <img src={imgSrc} alt="" className="aspect-[16/9] w-full rounded object-cover" />}
          <p className="font-medium">{excerpt}</p>
          {blocks.map((b, i) => b.type === "h2" ? <h2 key={i} className="font-display text-xl text-primary">{b.text}</h2> : b.type === "quote" ? <blockquote key={i} className="border-l-4 border-gold pl-3 italic">{b.text}</blockquote> : <p key={i}>{b.type === "li" ? "• " : ""}{b.text}</p>)}
        </div>
        <Button variant="outline" onClick={() => setPreview(false)}>Back to editing</Button>
      </div>
    );
  }

  const field = (id: string, label: string, el: React.ReactNode, hint?: string) => (
    <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label>{el}{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>
  );
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><Button variant="ghost" onClick={onDone}>← Back</Button>{blog && <Badge>{blog.status}</Badge>}</div>
      {field("bt", "Title", <Input id="bt" lang={lang} value={title} onChange={e => { setTitle(e.target.value); if (!slugTouched) setSlug(slugifyBlog(e.target.value)); }} className="h-11 text-base" />)}
      {field("bs", "URL slug", <Input id="bs" value={slug} onChange={e => { setSlugTouched(true); setSlug(e.target.value.toLowerCase()); }} placeholder="annadanam-guide" className="h-11 text-base" />, `Address: /blogs/${slug || "…"} — lowercase English letters, numbers and hyphens.`)}
      <div className="space-y-1.5">
        <Label htmlFor="bi">Featured image (required to publish)</Label>
        {imgSrc && <img src={imgSrc} alt="" className="aspect-[16/9] w-full max-w-md rounded object-cover" />}
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm"><Upload className="size-4" />{imgSrc ? "Replace image" : "Upload image"}
          <input id="bi" type="file" accept={BLOG_IMAGE_TYPES.join(",")} className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) void pick(f); e.target.value = ""; }} />
        </label>
        <p className="text-xs text-muted-foreground">JPG, PNG, WebP or AVIF. Compressed to WebP (max 5 MB).</p>
      </div>
      {field("be", "Short description", <Textarea id="be" lang={lang} value={excerpt} maxLength={400} onChange={e => setExcerpt(e.target.value)} className="text-base" />)}
      {field("bc", "Content", <Textarea id="bc" lang={lang} value={body} onChange={e => setBody(e.target.value)} rows={14} className="text-base" />, "Blank line = new paragraph. Start a line with “## ” for a heading, “- ” for a list item, “> ” for a quote.")}
      <div className="grid gap-4 sm:grid-cols-2">
        {field("bcat", "Category", <select id="bcat" className={selectCls} value={category} onChange={e => setCategory(e.target.value)}>{BLOG_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>)}
        {field("bl", "Language", <select id="bl" className={selectCls} value={lang} onChange={e => setLang(e.target.value)}>{LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}</select>)}
      </div>
      {field("btg", "Tags (comma separated)", <Input id="btg" value={tags} onChange={e => setTags(e.target.value)} className="h-11 text-base" />)}
      {field("bk", "Keywords (comma separated)", <Input id="bk" value={keywords} onChange={e => setKeywords(e.target.value)} className="h-11 text-base" />, "Also used by the voice helper to find this blog.")}
      {field("bst", "SEO title (optional)", <Input id="bst" value={seoTitle} maxLength={70} onChange={e => setSeoTitle(e.target.value)} className="h-11 text-base" />)}
      {field("bsd", "Meta description (optional)", <Textarea id="bsd" value={seoDesc} maxLength={300} onChange={e => setSeoDesc(e.target.value)} className="text-base" />)}
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} variant="outline" onClick={() => void save("draft")}>{busy && <Loader2 className="size-4 animate-spin" />}{blog?.status === "published" ? "Unpublish (save as draft)" : "Save draft"}</Button>
        <Button disabled={busy} variant="outline" onClick={() => setPreview(true)}><Eye className="size-4" />Preview</Button>
        <Button disabled={busy} onClick={() => void save("published")}>{blog?.status === "published" ? "Update published" : "Publish"}</Button>
        {blog && <Button disabled={busy} variant="destructive" onClick={() => void remove()}><Trash2 className="size-4" />Delete</Button>}
      </div>
    </div>
  );
}
