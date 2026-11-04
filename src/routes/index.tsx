import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin, Mic, Hospital, Utensils, Building2, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PlacesGrid, StatusCards } from "@/components/HomeSections";
import { useI18n } from "@/lib/i18n";
import heroAsset from "@/assets/venkateswara-swamy-hero.jpg.asset.json";
import { DarshanVoiceCard } from "@/components/DarshanVoiceCard";
import { VoiceAssistant } from "@/components/VoiceAssistant";
import { Button } from "@/components/ui/button";

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
  const { t, setLang } = useI18n();
  const [voice, setVoice] = useState(false);
  const navigate = useNavigate();
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-3 px-3 py-3 sm:px-4">
        <section
          aria-label={t("heroTitle")}
          className="relative overflow-hidden rounded-3xl shadow-lift ring-1 ring-border"
        >
          <img
            src={heroAsset.url}
            alt="Lord Sri Venkateswara Swamy"
            className="absolute inset-0 h-full w-full object-cover object-[50%_15%]"
          />
          <div
            className="absolute inset-0"
            aria-hidden
            style={{ backgroundImage: "linear-gradient(180deg, color-mix(in oklab, var(--aubergine-deep) 12%, transparent) 0%, color-mix(in oklab, var(--aubergine-deep) 22%, transparent) 50%, color-mix(in oklab, var(--aubergine-deep) 80%, transparent) 88%)" }}
          />
          <div className="relative flex min-h-64 flex-col justify-end gap-2 p-5 sm:min-h-[30rem] sm:p-7">
            <h1 className="text-2xl leading-tight text-primary-foreground drop-shadow-sm sm:text-4xl">
              {t("heroTitle")}
            </h1>
            <p className="max-w-md text-sm text-primary-foreground/90 sm:text-base">{t("heroSub")}</p>
          </div>
        </section>
        <StatusCards />
        <DarshanVoiceCard />
        <Link to="/darshan" className="flex min-h-8 items-center justify-between text-sm font-semibold text-primary">{t("details")} · {t("darshanWait")}<ChevronRight className="size-4" /></Link>
        <section aria-label={t("quickActions")} className="grid grid-cols-3 gap-2">
          <Button asChild className="h-auto min-h-16 flex-col gap-1 whitespace-normal px-2 text-xs"><Link to="/map"><MapPin className="size-5" />{t("map")}</Link></Button>
          <Button variant="secondary" className="h-auto min-h-16 flex-col gap-1 whitespace-normal px-2 text-xs" onClick={() => setVoice(true)}><Mic className="size-5" />{t("voiceAssistant")}</Button>
          {[{ category: "medical", icon: Hospital, label: "cat_medical" }, { category: "food", icon: Utensils, label: "cat_food" }, { category: "amenity", icon: Building2, label: "cat_amenity" }].map(action => <Button key={action.category} asChild variant="outline" className="h-auto min-h-14 flex-col gap-1 whitespace-normal px-2 text-xs"><Link to="/map" search={{ category: action.category }}><action.icon className="size-5" />{t(action.label as "cat_medical" | "cat_food" | "cat_amenity")}</Link></Button>)}
        </section>
        <PlacesGrid />
      </div>
      <VoiceAssistant open={voice} onOpenChange={setVoice} onAction={action => {
        if (action.kind === "language") { setLang(action.language); return; }
        navigate({ to: "/map", search: { command: action.kind === "search" ? action.text : undefined, category: action.kind === "category" ? action.category : undefined, action: action.kind !== "search" && action.kind !== "category" ? action.kind : undefined } });
      }} />
    </AppShell>
  );
}
