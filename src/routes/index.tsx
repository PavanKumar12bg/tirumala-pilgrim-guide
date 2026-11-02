import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin, Mic, Hospital, Utensils, Building2, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PlacesGrid, StatusCards } from "@/components/HomeSections";
import { useI18n } from "@/lib/i18n";
import heroAsset from "@/assets/venkateswara-idol.jpg.asset.json";
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
        <h1 className="text-xl leading-tight text-primary">{t("heroTitle")}</h1>
        <StatusCards />
        <Link to="/darshan" className="flex min-h-8 items-center justify-between text-sm font-semibold text-primary">{t("details")} · {t("darshanWait")}<ChevronRight className="size-4" /></Link>
        <section aria-label={t("quickActions")} className="grid grid-cols-3 gap-2">
          <Button asChild className="h-auto min-h-16 flex-col gap-1 whitespace-normal px-2 text-xs"><Link to="/map"><MapPin className="size-5" />{t("map")}</Link></Button>
          <Button variant="secondary" className="h-auto min-h-16 flex-col gap-1 whitespace-normal px-2 text-xs" onClick={() => setVoice(true)}><Mic className="size-5" />{t("voiceAssistant")}</Button>
          {[{ category: "medical", icon: Hospital, label: "cat_medical" }, { category: "food", icon: Utensils, label: "cat_food" }, { category: "amenity", icon: Building2, label: "cat_amenity" }].map(action => <Button key={action.category} asChild variant="outline" className="h-auto min-h-14 flex-col gap-1 whitespace-normal px-2 text-xs"><Link to="/map" search={{ category: action.category }}><action.icon className="size-5" />{t(action.label as "cat_medical" | "cat_food" | "cat_amenity")}</Link></Button>)}
        </section>
        <div className="flex items-center gap-3 border-y py-4"><img src={heroAsset.url} width={72} height={96} alt="Lord Sri Venkateswara Swamy" loading="lazy" className="h-24 w-18 shrink-0 rounded-md object-cover object-top" /><p className="text-sm text-muted-foreground">{t("heroSub")}</p></div>
        <PlacesGrid />
      </div>
      <VoiceAssistant open={voice} onOpenChange={setVoice} onAction={action => {
        if (action.kind === "language") { setLang(action.language); return; }
        navigate({ to: "/map", search: { command: action.kind === "search" ? action.text : undefined, category: action.kind === "category" ? action.category : undefined, action: action.kind !== "search" && action.kind !== "category" ? action.kind : undefined } });
      }} />
    </AppShell>
  );
}
