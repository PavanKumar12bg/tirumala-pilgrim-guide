import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Link2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { InfoPage } from "@/components/InfoPage";
import { useI18n, type DictKey } from "@/lib/i18n";
import { blogDate, blogQuery } from "@/lib/blogs";
import { ReliableImage } from "@/components/ReliableImage";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/blogs/$slug")({
  loader: async ({ context, params }) => {
    const blog = await context.queryClient.ensureQueryData(blogQuery(params.slug));
    if (!blog) throw notFound();
    return { title: blog.seo_title || blog.title, description: blog.seo_description || blog.excerpt, image: blog.imageSrc ?? null, keywords: blog.keywords.join(", ") };
  },
  head: ({ params, loaderData }) => {
    const title = `${loaderData?.title ?? "Blog"} — Tirumala Guide`;
    const description = loaderData?.description ?? "";
    const img = loaderData?.image && /^https:\/\//.test(loaderData.image) ? loaderData.image : null;
    return {
      meta: [
        { title }, { name: "description", content: description },
        ...(loaderData?.keywords ? [{ name: "keywords", content: loaderData.keywords }] : []),
        { property: "og:title", content: title }, { property: "og:description", content: description },
        { property: "og:type", content: "article" }, { property: "og:url", content: `/blogs/${params.slug}` },
        { name: "twitter:card", content: img ? "summary_large_image" : "summary" },
        ...(img ? [{ property: "og:image", content: img }, { name: "twitter:image", content: img }] : []),
      ],
      links: [{ rel: "canonical", href: `/blogs/${params.slug}` }],
    };
  },
  notFoundComponent: NotFound,
  errorComponent: NotFound,
  component: Page,
});

function NotFound() {
  const { t } = useI18n();
  return <InfoPage title={t("blogs")}><p className="text-sm">{t("blogsNotFound")}</p><Link to="/blogs" className="mt-3 inline-block text-sm text-primary underline">{t("blogsBack")}</Link></InfoPage>;
}

function Page() {
  const { t, lang } = useI18n();
  const { slug } = Route.useParams();
  const { data: b } = useSuspenseQuery(blogQuery(slug));
  if (!b) return <NotFound />;
  const url = typeof window !== "undefined" ? window.location.href : `/blogs/${slug}`;
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: b.title, text: b.excerpt, url }); } catch { /* cancelled */ } return; }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${b.title} ${url}`)}`, "_blank", "noopener");
  };
  const copy = async () => { try { await navigator.clipboard.writeText(url); toast.success(t("blogsCopied")); } catch { toast.error(url); } };
  return (
    <InfoPage title={b.title} className="max-w-3xl">
      <div lang={b.lang} data-blog-article>
        <p className="text-xs text-muted-foreground"><span className="font-semibold text-gold">{t(`blogCat_${b.category}` as DictKey)}</span> · {blogDate(b.published_at, lang)}</p>
        {b.imageSrc && <ReliableImage src={b.imageSrc} alt="" fetchPriority="high" width={1200} height={675} className="mt-3 aspect-[16/9] w-full rounded-lg object-cover" />}
        <p className="mt-4 text-base font-medium leading-relaxed">{b.excerpt}</p>
        <div className="mt-4 space-y-3 text-base leading-relaxed">
          {b.content.map((c, i) => c.type === "h2" ? <h2 key={i} className="pt-2 font-display text-xl text-primary">{c.text}</h2>
            : c.type === "quote" ? <blockquote key={i} className="border-l-4 border-gold pl-3 italic text-muted-foreground">{c.text}</blockquote>
            : c.type === "li" ? <p key={i} className="pl-4 before:-ml-4 before:mr-2 before:content-['•']">{c.text}</p>
            : <p key={i}>{c.text}</p>)}
        </div>
        {!!b.tags.length && <p className="mt-4 flex flex-wrap gap-2">{b.tags.map(tag => <span key={tag} className="rounded-full bg-secondary px-2 py-0.5 text-xs">#{tag}</span>)}</p>}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => void share()}><Share2 className="size-4" />{t("blogsShare")}</Button>
        <Button variant="outline" onClick={() => void copy()}><Link2 className="size-4" />{t("blogsCopyLink")}</Button>
        <Button variant="ghost" asChild><Link to="/blogs"><ArrowLeft className="size-4" />{t("blogsBack")}</Link></Button>
      </div>
    </InfoPage>
  );
}
