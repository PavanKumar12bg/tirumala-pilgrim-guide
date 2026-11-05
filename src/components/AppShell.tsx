import { Link } from "@tanstack/react-router";
import { Home, Map as MapIcon, CalendarDays, Bus } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { AnnouncementTicker } from "./AnnouncementTicker";
import { CookieNotice } from "./CookieNotice";
import logo from "@/assets/tirumala-logo.jpg";
import { ReliableImage } from "./ReliableImage";

export function TopBar() {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-[1100] shrink-0 border-b border-gold/50 bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-1 sm:flex sm:justify-between">
        <Link to="/" className="flex min-h-11 min-w-0 items-center gap-2">
          <ReliableImage src={logo} alt="" width={36} height={36} className="size-9 shrink-0 rounded-md object-cover object-center ring-1 ring-accent/50" />
          <span className="min-w-0 truncate font-display text-lg leading-tight">{t("appName")}</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/transport" className="hidden min-h-11 items-center gap-2 text-sm md:flex"><Bus className="size-4" />{t("transportTitle")}</Link>
          <Link to="/journey" className="hidden min-h-11 items-center gap-2 text-sm md:flex"><CalendarDays className="size-4" />{t("journey")}</Link>
          <LanguageSwitcher />
        </div>
      </div>
      <AnnouncementTicker />
    </header>
  );
}

export function BottomNav() {
  const { t } = useI18n();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = ref.current;
    if (!nav) return;
    const update = () => document.documentElement.style.setProperty("--bottom-nav-height", `${nav.getBoundingClientRect().height}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(nav);
    return () => { observer.disconnect(); document.documentElement.style.removeProperty("--bottom-nav-height"); };
  }, []);
  const item = "flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 border-t-2 border-transparent px-1 py-1 text-center text-xs leading-snug font-semibold text-muted-foreground transition-colors";
  return (
    <nav ref={ref} aria-label={t("appName")} className="fixed inset-x-0 bottom-0 z-[1100] border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="mx-auto flex max-w-md">
        <Link to="/" className={item} activeOptions={{ exact: true }} activeProps={{ className: "border-primary text-primary" }}>
          <Home className="size-5" aria-hidden />
          {t("home")}
        </Link>
        <Link to="/map" className={item} activeProps={{ className: "border-primary text-primary" }}>
          <MapIcon className="size-5" aria-hidden />
          {t("map")}
        </Link>
        <Link to="/transport" className={item} activeProps={{ className: "border-primary text-primary" }}>
          <Bus className="size-5" aria-hidden />
          {t("transportNav")}
        </Link>
        <Link to="/journey" className={item} activeProps={{ className: "border-primary text-primary" }}>
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
    <div className="min-h-screen pb-[calc(var(--bottom-nav-height)+0.75rem)] md:pb-0">
      <TopBar />
      <main>{children}</main>
      <footer className="mx-auto mt-4 max-w-5xl border-t px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        <p>{t("notAffiliated")}</p>
        <nav aria-label={t("about")} className="mt-2 flex flex-wrap gap-x-4 gap-y-0">
          {([["/emergency","emergencyTitle"],["/about","about"],["/ttd","ttdPage"],["/privacy","privacy"],["/terms","terms"],["/contact","contact"],["/admin","admin"]] as const).map(([to,k]) => (
            <Link key={to} to={to} className="inline-flex min-h-8 max-w-full items-center py-1 underline-offset-4 hover:underline">{t(k)}</Link>
          ))}
        </nav>
      </footer>
      <CookieNotice />
      <BottomNav />
    </div>
  );
}
