import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Mic, Hospital, Utensils, Building2, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PlacesGrid, StatusCards } from "@/components/HomeSections";
import { useI18n } from "@/lib/i18n";
import heroImage from "@/assets/venkateswara-swamy-hero.jpg";
import { ReliableImage } from "@/components/ReliableImage";
import { Button } from "@/components/ui/button";
import { EcoPromo } from '@/components/eco/EcoShared';

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tirumala Guide — Darshan, map & pilgrim amenities" },
      { name: "description", content: "Telugu & English pilgrim guide to Tirumala: darshan waiting time, crowd status, temple route map, annaprasadam, offices and amenities." },
      { property: "og:title", content: "Tirumala Guide — తిరుమల గైడ్" },
      { property: "og:description", content: "Darshan status, route map and every useful place on the Tirumala hills." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { t } = useI18n();
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-3 px-3 py-3 sm:px-4">
        <section
          aria-label={t("appName")}
          className="relative overflow-hidden rounded-3xl shadow-lift ring-1 ring-border"
        >
          <ReliableImage
            src={heroImage}
            fetchPriority="high"
            alt="Lord Sri Venkateswara Swamy"
            className="absolute inset-0 h-full w-full object-cover object-[50%_15%]"
          />
          <div
            className="absolute inset-0"
            aria-hidden
            style={{ backgroundImage: "linear-gradient(180deg, color-mix(in oklab, var(--aubergine-deep) 12%, transparent) 0%, color-mix(in oklab, var(--aubergine-deep) 22%, transparent) 50%, color-mix(in oklab, var(--aubergine-deep) 80%, transparent) 88%)" }}
          />
          <div className="relative flex min-h-64 flex-col justify-end gap-2 p-5 sm:min-h-[30rem] sm:p-7">
            <h1 className="text-xl font-semibold leading-snug text-primary-foreground sm:text-2xl">
              {t("appName")}
            </h1>
          </div>
        </section>
        <StatusCards />
        <Link to="/darshan" className="flex min-h-11 items-center justify-between text-sm font-semibold text-primary">{t("darshanTitle")}<ChevronRight className="size-4" /></Link>
        <section aria-label={t("quickActions")} className="grid grid-cols-3 gap-2">
          <Button asChild className="h-auto min-h-16 flex-col gap-1 whitespace-normal px-2 text-xs"><Link to="/map"><MapPin className="size-5" />{t("map")}</Link></Button>
          <Button variant="secondary" className="h-auto min-h-16 flex-col gap-1 whitespace-normal px-2 text-xs" onClick={() => window.dispatchEvent(new CustomEvent("tg-agent-open"))}><Mic className="size-5" />{t("voiceAssistant")}</Button>
          {[{ category: "medical", icon: Hospital, label: "cat_medical" }, { category: "food", icon: Utensils, label: "cat_food" }, { category: "amenity", icon: Building2, label: "cat_amenity" }].map(action => <Button key={action.category} asChild variant="outline" className="h-auto min-h-14 flex-col gap-1 whitespace-normal px-2 text-xs"><Link to="/map" search={{ category: action.category }}><action.icon className="size-5" />{t(action.label as "cat_medical" | "cat_food" | "cat_amenity")}</Link></Button>)}
        </section>
        <EcoPromo />
        <PlacesGrid />
      </div>
    </AppShell>
  );
}
