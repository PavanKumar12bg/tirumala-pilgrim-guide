import { Link } from "@tanstack/react-router";
import { ExternalLink, Phone, MapPin, Info } from "lucide-react";
import { pickLocalized, useI18n } from "@/lib/i18n";
import { TEMPLATE_DEFS, telHref, type PublicCategory, type PublicItem, type PublicOffer } from "@/lib/transport";

export function SourcesBlock({ category }: { category: PublicCategory }) {
  const { t } = useI18n();
  if (category.sections?.hide_sources) return null;
  if (!category.sources?.length && !category.last_verified_on) return null;
  return (
    <section className="rounded-xl bg-card p-4 text-sm ring-1 ring-border">
      <h2 className="font-semibold text-primary">{t("sources")}</h2>
      <ul className="mt-2 space-y-1">
        {category.sources?.map((s) => (
          <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 underline-offset-4 hover:underline">{s.label}<ExternalLink className="size-3.5" aria-hidden /></a></li>
        ))}
      </ul>
      {category.last_verified_on ? <p className="mt-1 text-muted-foreground">{t("lastVerified")}: {category.last_verified_on}</p> : null}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === "") return null;
  return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="whitespace-pre-line">{value}</dd></div>;
}

export function ProvidersBlock({ category, offers }: { category: PublicCategory; offers: PublicOffer[] }) {
  const { t, lang } = useI18n();
  if (!TEMPLATE_DEFS[category.template].providers || category.sections?.hide_providers || !offers.length) return null;
  const heading = pickLocalized(category.sections?.providers_heading, lang) || t("offeredBy");
  return (
    <section aria-labelledby="providers-h" className="space-y-3">
      <h2 id="providers-h" className="text-xl text-primary">{heading}</h2>
      <p className="text-xs text-muted-foreground">{t("providerDisclaimer")}</p>
      {offers.map((o) => {
        const tel = telHref(o.provider.public_phone);
        return (
          <article key={o.id} className="rounded-xl bg-card p-4 shadow-soft ring-1 ring-border">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold">{o.provider.display_name}</h3>
                <p className="text-sm text-muted-foreground">{[o.provider.vehicle_type, o.provider.capacity ? `${o.provider.capacity} ${t("capacity")}` : null].filter(Boolean).join(" · ")}</p>
              </div>
              {tel ? <a href={tel} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"><Phone className="size-4" aria-hidden />{t("callProvider")}</a> : null}
            </div>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <Row label={t("price")} value={o.price_text} />
              <Row label={t("duration")} value={o.duration_text} />
              <Row label={t("includedPlaces")} value={o.included_places} />
              <Row label={t("inclusions")} value={o.inclusions} />
              <Row label={t("exclusions")} value={o.exclusions} />
              <Row label={t("extraCharges")} value={o.extra_charges} />
              <Row label={t("serviceArea")} value={o.provider.service_area} />
            </dl>
          </article>
        );
      })}
    </section>
  );
}

function ItemCard({ item, category }: { item: PublicItem; category: PublicCategory }) {
  const { t, lang } = useI18n();
  const d = item.details ?? {};
  const list = (label: string, xs?: string[]) => xs?.length ? <div className="mt-2"><p className="text-xs font-semibold text-muted-foreground">{label}</p><ol className="mt-1 list-decimal space-y-0.5 pl-5 text-sm">{xs.map((x, i) => <li key={i}>{x}</li>)}</ol></div> : null;
  const title = pickLocalized(item.title, lang);
  return (
    <article className="overflow-hidden rounded-xl bg-card shadow-soft ring-1 ring-border">
      {item.photoSrcs?.[0] ? <img src={item.photoSrcs[0]} alt={title} loading="lazy" className="aspect-[16/9] w-full object-cover" /> : null}
      <div className="space-y-1 p-4">
        <h3 className="font-semibold">{title}</h3>
        <p className="whitespace-pre-line text-sm">{pickLocalized(item.body, lang)}</p>
        {list(t("boardingPoints"), d.boarding_points)}
        {list(t("stops"), d.stops)}
        <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          <Row label={t("duration")} value={item.duration_text} />
          <Row label={t("fare")} value={item.fare_text} />
          <Row label={t("notes")} value={pickLocalized(item.notes, lang)} />
        </dl>
        <div className="flex flex-wrap gap-x-4 pt-1 text-sm">
          {category.template === "package" ? <Link to="/transport/$slug/stop/$stopId" params={{ slug: category.slug, stopId: item.id }} className="inline-flex min-h-11 items-center font-semibold text-primary">{t("openDetails")}</Link> : null}
          {item.place_id ? <Link to="/map" search={{ place: item.place_id }} className="inline-flex min-h-11 items-center gap-1 font-semibold text-primary"><MapPin className="size-4" aria-hidden />{t("viewOnMap")}</Link> : null}
          {item.source_url ? <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-muted-foreground underline-offset-4 hover:underline">{t("sources")}<ExternalLink className="size-3.5" aria-hidden /></a> : null}
        </div>
        {item.last_verified_on ? <p className="text-xs text-muted-foreground">{t("lastVerified")}: {item.last_verified_on}</p> : null}
      </div>
    </article>
  );
}

/** Renders the layout chosen by the category's template. */
export function CategoryDetail({ category, items, offers }: { category: PublicCategory; items: PublicItem[]; offers: PublicOffer[] }) {
  const { t, lang } = useI18n();
  const def = TEMPLATE_DEFS[category.template];
  const heading = pickLocalized(category.sections?.heading, lang) || t(def.heading);
  return (
    <div className="space-y-5">
      <p className="whitespace-pre-line">{pickLocalized(category.description, lang)}</p>
      {def.noLiveNotice ? <p role="note" className="flex gap-2 rounded-lg bg-secondary p-3 text-sm"><Info className="mt-0.5 size-4 shrink-0" aria-hidden />{t("noLiveBus")}</p> : null}
      <section className="space-y-3">
        <h2 className="text-xl text-primary">{heading}</h2>
        {items.length ? <div className={category.template === "package" ? "grid gap-3 sm:grid-cols-2" : "space-y-3"}>{items.map((i) => <ItemCard key={i.id} item={i} category={category} />)}</div> : <p className="text-muted-foreground">{t("nothingPublished")}</p>}
      </section>
      <ProvidersBlock category={category} offers={offers} />
      <SourcesBlock category={category} />
    </div>
  );
}
