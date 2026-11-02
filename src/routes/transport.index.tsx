import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { InfoPage, pageMeta } from "@/components/InfoPage";
import { pickLocalized, useI18n } from "@/lib/i18n";
import { transportListQuery } from "@/lib/transport";

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
    <InfoPage title={t("transportTitle")}>
      <p className="text-muted-foreground">{t("transportIntro")}</p>
      {data.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.map((c) => (
            <li key={c.id}>
              <Link to="/transport/$slug" params={{ slug: c.slug }} className="flex min-h-24 items-center gap-4 overflow-hidden rounded-xl bg-card p-3 shadow-soft ring-1 ring-border transition-transform active:scale-[0.99]">
                {c.imageSrc ? <img src={c.imageSrc} alt="" className="size-16 shrink-0 rounded-lg object-cover" /> : <span aria-hidden className="grid size-16 shrink-0 place-items-center rounded-lg bg-secondary text-3xl">{c.icon}</span>}
                <span className="min-w-0">
                  <span className="block font-semibold text-primary">{pickLocalized(c.title, lang)}</span>
                  <span className="line-clamp-2 text-sm text-muted-foreground">{pickLocalized(c.description, lang)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : <p>{t("nothingPublished")}</p>}
    </InfoPage>
  );
}
