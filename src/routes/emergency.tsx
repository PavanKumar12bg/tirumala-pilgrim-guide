import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { InfoPage, pageMeta } from "@/components/InfoPage";
import { pickLocalized, useI18n } from "@/lib/i18n";
import { hasVerifiedCoords, placesQuery } from "@/lib/places";

export const Route = createFileRoute("/emergency")({
  head: () => pageMeta("Emergency & medical help", "Listed Tirumala medical facilities, with map links where coordinates are verified. Dedicated emergency contacts await verification."),
  loader: ({ context }) => context.queryClient.ensureQueryData(placesQuery()),
  errorComponent: EmergencyError,
  component: EmergencyPage,
});

function EmergencyError() {
  const { t } = useI18n();
  return <InfoPage title={t("emergencyTitle")}><p role="alert">{t("errorLoad")}</p><Link to="/map" search={{ category: "medical" }} className="inline-flex min-h-11 items-center font-semibold text-primary">{t("viewOnMap")}</Link></InfoPage>;
}

function EmergencyPage() {
  const { t, lang } = useI18n();
  const { data } = useSuspenseQuery(placesQuery());
  const facilities = data.filter(place => place.visible && place.category === "medical");
  return <InfoPage title={t("emergencyTitle")} className="emergency-page max-w-4xl sm:px-6 sm:py-10">
    <p role="note" className="border-l-2 border-gold py-2 pl-4 text-sm text-muted-foreground">{t("emergencyPending")}</p>
    <section aria-labelledby="medical-heading" className="pt-4">
      <h2 id="medical-heading" className="mb-3 text-xl text-primary">{t("medicalLocations")}</h2>
      {facilities.length ? <ul className="divide-y border-y">
        {facilities.map(place => <li key={place.id} className="py-5">
          <h3 className="text-lg">{pickLocalized(place.name, lang)}</h3>
          {pickLocalized(place.description, lang) ? <p className="mt-1 text-sm text-muted-foreground">{pickLocalized(place.description, lang)}</p> : null}
          {hasVerifiedCoords(place) ? <Link to="/map" search={{ place: place.slug }} className="mt-2 inline-flex min-h-11 items-center gap-2 font-semibold text-primary">{t("viewOnMap")}<ArrowUpRight className="size-4" aria-hidden /></Link> : <p className="mt-2 text-sm text-muted-foreground">{t("coordsPending")}</p>}
          <p className="mt-1 text-xs text-muted-foreground">{t("source")}: {place.coords_source === "osm" ? `OpenStreetMap · ${place.osm_id ?? ""}` : place.coords_source ?? t("unavailable")}</p>
        </li>)}
      </ul> : <p className="border-y py-6 text-muted-foreground">{t("noPlaces")}</p>}
    </section>
  </InfoPage>;
}