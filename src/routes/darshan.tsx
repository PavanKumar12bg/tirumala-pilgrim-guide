import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { StatusCards } from "@/components/HomeSections";
import { useI18n } from "@/lib/i18n";
export const Route = createFileRoute("/darshan")({ head: () => ({ meta: [
 { title: "Darshan information — Tirumala Guide" }, { name: "description", content: "Official TTD daily Sarvadarshanam wait ranges and occupied queue compartments, with report dates." },
 { property: "og:title", content: "Darshan information — Tirumala Guide" }, { property: "og:description", content: "Latest official TTD daily waiting-time and queue reports, not a live feed." },
 { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
] }), component: DarshanPage });
function DarshanPage() { const { t } = useI18n(); return <AppShell><div className="mx-auto max-w-3xl space-y-5 px-4 py-6"><h1 className="text-2xl text-primary">{t("darshanWait")}</h1><StatusCards /><p className="text-sm text-muted-foreground">{t("officialNote")}</p></div></AppShell>; }