import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { InfoPage } from "@/components/InfoPage";
import { CategoryDetail } from "@/components/transport/TransportViews";
import { pickLocalized, useI18n } from "@/lib/i18n";
import { transportCategoryQuery } from "@/lib/transport";

export const Route = createFileRoute("/transport/$slug")({
  loader: async ({ context, params }) => {
    const res = await context.queryClient.ensureQueryData(transportCategoryQuery(params.slug));
    if (!res) throw notFound();
    return { title: pickLocalized(res.category.title, "en"), description: pickLocalized(res.category.description, "en") };
  },
  head: ({ loaderData }) => {
    const title = loaderData?.title ? `${loaderData.title} — Tirumala Guide` : "Trip & Transport — Tirumala Guide";
    const desc = loaderData?.description || "Travel information for Tirupati and Tirumala.";
    return { meta: [{ title }, { name: "description", content: desc }, { property: "og:title", content: title }, { property: "og:description", content: desc }, { property: "og:type", content: "article" }, { name: "twitter:card", content: "summary" }, ...(loaderData ? [] : [{ name: "robots", content: "noindex" }])] };
  },
  notFoundComponent: () => <Missing />,
  errorComponent: () => <Missing error />,
  component: Page,
});

function Missing({ error }: { error?: boolean }) {
  const { t } = useI18n();
  return <InfoPage title={t("transportTitle")}><p role="alert">{error ? t("errorLoad") : t("transportNotFound")}</p><Link to="/transport" className="font-semibold text-primary">{t("back")}</Link></InfoPage>;
}

function Page() {
  const { slug } = Route.useParams();
  const { lang, t } = useI18n();
  const { data } = useSuspenseQuery(transportCategoryQuery(slug));
  if (!data) return <Missing />;
  return (
    <InfoPage title={pickLocalized(data.category.title, lang)} className="transport-page max-w-4xl sm:px-6 sm:py-10">
      <Link to="/transport" className="-mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary"><ArrowLeft className="size-4" aria-hidden />{t("transportTitle")}</Link>
      <CategoryDetail category={data.category} items={data.items} offers={data.offers} />
    </InfoPage>
  );
}
