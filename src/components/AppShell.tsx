import { Link } from "@tanstack/react-router";
import { Home, Map as MapIcon, CalendarDays } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function TopBar() {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-[1100] bg-aubergine-grad text-primary-foreground shadow-soft">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5">
        <Link to="/" className="flex min-h-11 items-center gap-2.5">
          <span aria-hidden className="grid size-9 place-items-center rounded-full bg-gold-grad font-display text-lg text-accent-foreground">
            ॐ
          </span>
          <span className="font-display text-lg leading-tight">{t("appName")}</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/journey" className="hidden min-h-11 items-center gap-2 text-sm md:flex"><CalendarDays className="size-4" />{t("journey")}</Link>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const { t } = useI18n();
  const item = "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-semibold text-muted-foreground transition-colors";
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-[1100] border-t bg-card/95 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-md">
        <Link to="/" className={item} activeOptions={{ exact: true }} activeProps={{ className: "text-primary" }}>
          <Home className="size-5" aria-hidden />
          {t("home")}
        </Link>
        <Link to="/map" className={item} activeProps={{ className: "text-primary" }}>
          <MapIcon className="size-5" aria-hidden />
          {t("map")}
        </Link>
        <Link to="/journey" className={item} activeProps={{ className: "text-primary" }}>
          <CalendarDays className="size-5" aria-hidden />
          {t("journey")}
        </Link>
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <TopBar />
      <main>{children}</main>
      <footer className="mx-auto max-w-5xl px-4 py-10 text-center text-sm text-muted-foreground">
        <p>{t("officialNote")}</p>
        <p className="mt-3">
          <Link to="/admin" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">
            {t("admin")}
          </Link>
        </p>
      </footer>
      <BottomNav />
    </div>
  );
}
