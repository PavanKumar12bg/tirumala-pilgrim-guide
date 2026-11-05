import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { InfoPage, pageMeta } from "@/components/InfoPage";
import { pickLocalized, useI18n } from "@/lib/i18n";
import { transportListQuery } from "@/lib/transport";
import { ArrowUpRight } from "lucide-react";
import { ReliableImage } from "@/components/ReliableImage";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/transport/")({
  head: () => pageMeta("Trip & Transport", "Tirupati to Tirumala travel options, TTD free buses, temple packages and pickup help, with official sources."),
  loader: ({ context }) => context.queryClient.ensureQueryData(transportListQuery()),
  errorComponent: () => <ErrorView />,
  notFoundComponent: () => <ErrorView />,
  component: Page,
});

function ErrorView() {
  const { t } = useI18n();
  const router = useRouter();
  return <InfoPage title={t("transportTitle")}><div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><p role="alert" className="min-w-0 text-sm">{t("errorLoad")}</p><Button variant="outline" onClick={() => void router.invalidate()}>{t("retry")}</Button></div></InfoPage>;
}

function Page() {
  const { t, lang } = useI18n();
  const { data } = useSuspenseQuery(transportListQuery());
  return (
    <InfoPage title={t("transportTitle")} className="transport-page max-w-5xl sm:px-6 sm:py-10">
      {data.length ? (
        <ul className="grid border-t border-gold/50 md:grid-cols-2">
          {data.map((c, index) => (
            <li key={c.id}>
              <Link to="/transport/$slug" params={{ slug: c.slug }} className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 border-b px-1 py-4 transition-colors hover:bg-secondary/50 sm:gap-4 md:pr-6">
                {c.imageSrc ? <ReliableImage src={c.imageSrc} alt="" loading="lazy" width={80} height={80} className="size-14 shrink-0 rounded-md object-cover sm:size-20" /> : <span aria-hidden className="pt-1 font-display text-lg text-gold">{String(index + 1).padStart(2, "0")}</span>}
                <span className="min-w-0 break-words">
                  <span className="block font-display text-lg leading-snug text-primary">{pickLocalized(c.title, lang)}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{pickLocalized(c.description, lang)}</span>
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
