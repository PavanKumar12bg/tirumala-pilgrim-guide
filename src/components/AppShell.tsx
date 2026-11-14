import { Link } from "@tanstack/react-router";
import { Home, Map as MapIcon, CalendarDays, Bus, BookOpen, Menu, Leaf } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { AnnouncementTicker } from "./AnnouncementTicker";
import { CookieNotice } from "./CookieNotice";
import logo from "@/assets/tirumala-logo.jpg";
import { ReliableImage } from "./ReliableImage";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "./ui/dropdown-menu";

export function TopBar() {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-[1100] shrink-0 border-b border-gold/50 bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 sm:px-4">
        <Link to="/" className="flex min-h-11 min-w-0 items-center gap-2">
          <ReliableImage src={logo} alt="" width={36} height={36} className="size-9 shrink-0 rounded-md object-cover object-center ring-1 ring-accent/50" />
          <span className="min-w-0 font-display text-base leading-normal">{t("appName")}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <LanguageSwitcher />
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-11 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground md:hidden" aria-label={t("moreCats")} title={t("moreCats")}><Menu className="size-5" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[1300] w-64 max-w-[calc(100vw-2rem)]">
              {([{to:"/",key:"home",icon:Home},{to:"/map",key:"map",icon:MapIcon},{to:"/transport",key:"transportNav",icon:Bus},{to:"/journey",key:"journey",icon:CalendarDays},{to:"/blogs",key:"blogs",icon:BookOpen},{to:"/clean-eco-tirumala",key:"ecoTitle",icon:Leaf}] as const).map(item=><DropdownMenuItem key={item.to} asChild className="min-h-11 whitespace-normal leading-relaxed"><Link to={item.to}><item.icon />{t(item.key)}</Link></DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <nav aria-label={t("places")} className="mx-auto hidden max-w-5xl flex-wrap items-center gap-x-6 border-t border-primary-foreground/15 px-4 md:flex">
        {([{to:"/",key:"home",icon:Home},{to:"/map",key:"map",icon:MapIcon},{to:"/transport",key:"transportNav",icon:Bus},{to:"/journey",key:"journey",icon:CalendarDays},{to:"/blogs",key:"blogs",icon:BookOpen},{to:"/clean-eco-tirumala",key:"ecoTitle",icon:Leaf}] as const).map(item=><Link key={item.to} to={item.to} activeOptions={{exact:item.to==='/'}} activeProps={{className:"border-marigold"}} className="flex min-h-11 items-center gap-2 border-b-2 border-transparent py-2 text-sm leading-relaxed hover:border-marigold"><item.icon className="size-4 shrink-0" aria-hidden />{t(item.key)}</Link>)}
      </nav>
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
    let frame = 0;
    let previous = "";
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const height = `${nav.getBoundingClientRect().height}px`;
        if (height === previous) return;
        previous = height;
        document.documentElement.style.setProperty("--bottom-nav-height", height);
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(nav);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); document.documentElement.style.removeProperty("--bottom-nav-height"); };
  }, []);
  const item = "flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 border-t-2 border-transparent px-1 py-2 text-center text-xs leading-relaxed font-medium text-muted-foreground transition-colors";
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
        <Link to="/blogs" className={item} activeProps={{ className: "border-primary text-primary" }}>
          <BookOpen className="size-5" aria-hidden />
          {t("blogs")}
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
          <a href="https://www.tirumala.org/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 max-w-full items-center py-1 underline-offset-4 hover:underline">{t("ttdWebsite")}</a>
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
