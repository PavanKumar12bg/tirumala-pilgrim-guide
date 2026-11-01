import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { TopBar, BottomNav } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";

const MapExplorer = lazy(() => import("@/components/MapExplorer"));

export const Route = createFileRoute("/map")({
  validateSearch: (s: Record<string, unknown>): { place?: string } => ({
    place: typeof s.place === "string" ? s.place : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Tirumala Route Map — Tirumala Guide" },
      { name: "description", content: "Interactive OpenStreetMap of Tirumala with temples, offices, bus stands, toilets, medical and pilgrim amenities." },
      { property: "og:title", content: "Tirumala Route Map" },
      { property: "og:description", content: "Find temples and pilgrim amenities on the Tirumala hills." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MapPage,
});

function MapFallback() {
  const { t } = useI18n();
  return <div className="grid h-full place-items-center bg-secondary text-muted-foreground">{t("loading")}</div>;
}

function MapPage() {
  const { place } = Route.useSearch();
  return (
    <div className="flex h-[100svh] flex-col">
      <TopBar />
      <div className="relative min-h-0 flex-1 pb-14 md:pb-0">
        <ClientOnly fallback={<MapFallback />}>
          <Suspense fallback={<MapFallback />}>
            <MapExplorer initialSlug={place} />
          </Suspense>
        </ClientOnly>
      </div>
      <BottomNav />
    </div>
  );
}
