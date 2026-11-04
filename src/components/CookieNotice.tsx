import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { readCookiePreference, saveCookiePreference, type CookiePreference } from "@/lib/cookie-preference";

export function CookieNotice() {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  useEffect(() => {
    try { setShow(readCookiePreference(window.localStorage) === null); }
    catch { setShow(true); }
  }, []);
  if (!show) return null;
  const choose = (v: CookiePreference) => {
    try { saveCookiePreference(window.localStorage, v); } catch { /* Choice still dismisses this visit. */ }
    setShow(false);
  };
  return (
    <aside aria-label={t("privacy")} className="border-y border-border bg-secondary text-sm">
      <div className="mx-auto grid max-w-5xl gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <p className="leading-relaxed text-foreground">{t("cookieText")} <Link to="/privacy" className="underline underline-offset-4">{t("privacy")}</Link></p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="min-h-11 h-auto whitespace-normal" onClick={() => choose("essential")}>{t("cookieDecline")}</Button>
        <Button className="min-h-11 h-auto whitespace-normal" onClick={() => choose("all")}>{t("cookieAccept")}</Button>
      </div>
      </div>
    </aside>
  );
}
