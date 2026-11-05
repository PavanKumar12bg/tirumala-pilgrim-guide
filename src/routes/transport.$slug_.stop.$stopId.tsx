import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, MapPin } from "lucide-react";
import { InfoPage, pageMeta } from "@/components/InfoPage";
import { pickLocalized, useI18n } from "@/lib/i18n";
import { transportCategoryQuery } from "@/lib/transport";

export const Route = createFileRoute("/transport/$slug_/stop/$stopId")({
  head: () => pageMeta("Destination", "Destination details from a Tirumala Guide temple package."),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(transportCategoryQuery(params.slug)),
  errorComponent: () => <Missing />,
  component: Page,
});

function Missing() {
  const { t } = useI18n();
  return <InfoPage title={t("transportTitle")}><p role="alert">{t("transportNotFound")}</p><Link to="/transport" className="font-semibold text-primary">{t("back")}</Link></InfoPage>;
}

function Page() {
  const { slug, stopId } = Route.useParams();
  const { lang, t } = useI18n();
  const { data } = useSuspenseQuery(transportCategoryQuery(slug));
  const item = data?.items.find((i) => i.id === stopId);
  if (!data || !item) return <Missing />;
  const title = pickLocalized(item.title, lang);
  return (
    <InfoPage title={title} className="transport-page sm:px-6 sm:py-10">
      <Link to="/transport/$slug" params={{ slug }} className="-mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary"><ArrowLeft className="size-4" aria-hidden />{pickLocalized(data.category.title, lang)}</Link>
      {item.photoSrcs?.length ? <div className="flex snap-x gap-2 overflow-x-auto">{item.photoSrcs.map((s, i) => <img key={s} src={s} alt={`${title} ${i + 1}`} loading="lazy" className="aspect-[4/3] w-[85%] shrink-0 snap-center rounded-md object-cover sm:w-80" />)}</div> : null}
      <p className="whitespace-pre-line">{pickLocalized(item.body, lang)}</p>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {item.duration_text ? <div><dt className="text-xs text-muted-foreground">{t("duration")}</dt><dd>{item.duration_text}</dd></div> : null}
        {pickLocalized(item.notes, lang) ? <div><dt className="text-xs text-muted-foreground">{t("notes")}</dt><dd className="whitespace-pre-line">{pickLocalized(item.notes, lang)}</dd></div> : null}
        {item.details?.access ? <div><dt className="text-xs text-muted-foreground">{t("helpNotes")}</dt><dd>{item.details.access}</dd></div> : null}
      </dl>
      <div className="flex flex-wrap gap-4">
        {item.place_id ? <Link to="/map" search={{ place: item.place_id }} className="inline-flex min-h-11 items-center gap-1 font-semibold text-primary"><MapPin className="size-4" aria-hidden />{t("viewOnMap")}</Link> : null}
        {item.source_url ? <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-muted-foreground">{t("sources")}<ExternalLink className="size-3.5" aria-hidden /></a> : null}
      </div>
      {item.last_verified_on ? <p className="text-xs text-muted-foreground">{t("lastVerified")}: {item.last_verified_on}</p> : null}
    </InfoPage>
  );
}
