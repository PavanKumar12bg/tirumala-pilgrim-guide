import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { InfoPage, pageMeta } from "@/components/InfoPage";
import { pickLocalized, useI18n } from "@/lib/i18n";
import { transportListQuery } from "@/lib/transport";
import { ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/transport/")({
  head: () => pageMeta("Trip & Transport", "Tirupati to Tirumala travel options, TTD free buses, temple packages and pickup help, with official sources."),
  loader: ({ context }) => context.queryClient.ensureQueryData(transportListQuery()),
  errorComponent: () => <ErrorView />,
  component: Page,
});

function ErrorView() {
  const { t } = useI18n();
  return <InfoPage title={t("transportTitle")}><p role="alert">{t("errorLoad")}</p></InfoPage>;
}

function Page() {
  const { t, lang } = useI18n();
  const { data } = useSuspenseQuery(transportListQuery());
  return (
    <InfoPage title={t("transportTitle")} className="transport-page max-w-5xl sm:px-6 sm:py-10">
      <p className="text-muted-foreground">{t("transportIntro")}</p>
      {data.length ? (
        <ul className="grid border-t border-gold/50 md:grid-cols-2">
          {data.map((c, index) => (
            <li key={c.id}>
              <Link to="/transport/$slug" params={{ slug: c.slug }} className="group flex min-h-32 items-start gap-4 border-b px-1 py-5 transition-colors hover:bg-secondary/50 md:pr-6">
                {c.imageSrc ? <img src={c.imageSrc} alt="" loading="lazy" width={80} height={80} className="size-20 shrink-0 rounded-md object-cover" /> : <span aria-hidden className="pt-1 font-display text-xl text-gold">{String(index + 1).padStart(2, "0")}</span>}
                <span className="min-w-0">
                  <span className="block font-display text-xl text-primary">{pickLocalized(c.title, lang)}</span>
                  <span className="mt-2 block text-sm text-muted-foreground">{pickLocalized(c.description, lang)}</span>
                </span>
                <ArrowUpRight className="ml-auto mt-1 size-4 shrink-0 text-primary" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : <p>{t("nothingPublished")}</p>}
    </InfoPage>
  );
}
