import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { InfoPage } from "@/components/InfoPage";
import { useI18n, type DictKey } from "@/lib/i18n";
import { BLOG_CATEGORIES, blogsQuery, searchBlogs } from "@/lib/blogs";
import { ReliableImage } from "@/components/ReliableImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const TITLE = "Blogs — Tirumala Guide";
const DESC = "Articles for Tirumala pilgrims: temples, darshan, annadanam, travel and festivals.";

export const Route = createFileRoute("/blogs/")({
  head: () => ({
    meta: [
      { title: TITLE }, { name: "description", content: DESC },
      { property: "og:title", content: TITLE }, { property: "og:description", content: DESC },
      { property: "og:type", content: "website" }, { property: "og:url", content: "/blogs" }, { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/blogs" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(blogsQuery()),
  pendingComponent: () => <InfoPage title="…"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map(i => <div key={i} className="h-64 animate-pulse rounded-lg bg-muted" />)}</div></InfoPage>,
  errorComponent: ErrorView,
  component: Page,
});

function ErrorView() {
  const { t } = useI18n();
  const router = useRouter();
  return <InfoPage title={t("blogs")}><div className="flex items-center gap-3"><p role="alert" className="text-sm">{t("errorLoad")}</p><Button variant="outline" onClick={() => void router.invalidate()}>{t("retry")}</Button></div></InfoPage>;
}

export const blogDate = (iso: string | null, lang: string) => iso ? new Date(iso).toLocaleDateString(`${lang}-IN`, { day: "numeric", month: "short", year: "numeric" }) : "";

function Page() {
  const { t, lang } = useI18n();
  const { data } = useSuspenseQuery(blogsQuery());
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");
  const [mine, setMine] = useState(false);
  const cats = BLOG_CATEGORIES.filter(c => data.some(b => b.category === c));
  const list = useMemo(() => searchBlogs(q, data.filter(b => (!cat || b.category === cat) && (!mine || b.lang === lang))), [q, cat, mine, data, lang]);
  const chip = (on: boolean) => cn("min-h-9 shrink-0 rounded-full border px-3 text-sm", on ? "border-primary bg-primary text-primary-foreground" : "bg-card");
  return (
    <InfoPage title={t("blogs")} className="max-w-5xl">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={t("blogsSearch")} aria-label={t("blogsSearch")} className="h-11 pl-9 text-base" />
      </div>
      <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label={t("blogsAllCats")}>
        <button type="button" className={chip(!cat)} aria-pressed={!cat} onClick={() => setCat("")}>{t("blogsAllCats")}</button>
        {cats.map(c => <button key={c} type="button" className={chip(cat === c)} aria-pressed={cat === c} onClick={() => setCat(c)}>{t(`blogCat_${c}` as DictKey)}</button>)}
        <button type="button" className={chip(mine)} aria-pressed={mine} onClick={() => setMine(!mine)}>{t("blogsThisLang")}</button>
      </div>
      {!data.length ? <p className="mt-6 text-sm text-muted-foreground">{t("blogsEmpty")}</p>
        : !list.length ? <p className="mt-6 text-sm text-muted-foreground">{t("blogsNoMatch")}</p>
        : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map(b => (
              <li key={b.id}>
                <Link to="/blogs/$slug" params={{ slug: b.slug }} className="group block h-full overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md">
                  <div className="aspect-[16/9] bg-muted">
                    {b.imageSrc && <ReliableImage src={b.imageSrc} alt="" loading="lazy" decoding="async" width={640} height={360} className="size-full object-cover" />}
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-muted-foreground"><span className="font-semibold text-gold">{t(`blogCat_${b.category}` as DictKey)}</span> · {blogDate(b.published_at, lang)}</p>
                    <h2 lang={b.lang} className="mt-1 font-display text-lg leading-snug text-primary">{b.title}</h2>
                    <p lang={b.lang} className="mt-1 line-clamp-3 text-sm text-muted-foreground">{b.excerpt}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
    </InfoPage>
  );
}
