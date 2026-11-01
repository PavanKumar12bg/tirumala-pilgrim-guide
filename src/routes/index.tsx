import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PlacesGrid, RouteMapCard, StatusCards, Ticker } from "@/components/HomeSections";
import { useI18n } from "@/lib/i18n";
import heroAsset from "@/assets/venkateswara-idol.jpg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tirumala Guide — Darshan, map & pilgrim amenities" },
      { name: "description", content: "Telugu & English pilgrim guide to Tirumala: darshan waiting time, crowd status, temple route map, annaprasadam, offices and amenities." },
      { property: "og:title", content: "Tirumala Guide — తిరుమల గైడ్" },
      { property: "og:description", content: "Darshan status, route map and every useful place on the Tirumala hills." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: heroAsset.url },
      { name: "twitter:image", content: heroAsset.url },
    ],
  }),
  component: Index,
});

function Index() {
  const { t } = useI18n();
  return (
    <AppShell>
      <section className="relative overflow-hidden bg-aubergine-deep text-primary-foreground">
        <img src={heroAsset.url} alt="Lord Sri Venkateswara Swamy" width={686} height={1536} fetchPriority="high" className="absolute inset-0 h-full w-full object-cover object-[50%_18%] opacity-90" />
        <div className="absolute inset-0 bg-hero-fade" />
        <div className="relative mx-auto flex min-h-[78svh] max-w-5xl flex-col justify-end px-5 pb-10 pt-40 sm:min-h-[70vh]">
          <p className="animate-rise text-sm font-semibold tracking-wide text-accent">{t("tagline")}</p>
          <h1 className="animate-rise mt-2 text-4xl leading-tight sm:text-6xl" style={{ animationDelay: "80ms" }}>{t("heroTitle")}</h1>
          <p className="animate-rise mt-3 max-w-md text-base text-primary-foreground/85" style={{ animationDelay: "160ms" }}>{t("heroSub")}</p>
        </div>
      </section>
      <Ticker />
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-6">
        <StatusCards />
        <RouteMapCard />
        <PlacesGrid />
      </div>
    </AppShell>
  );
}
