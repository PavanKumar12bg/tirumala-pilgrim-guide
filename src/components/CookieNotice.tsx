import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

const KEY = "tg-cookie-consent";

export function CookieNotice() {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  useEffect(() => { setShow(!localStorage.getItem(KEY)); }, []);
  if (!show) return null;
  const choose = (v: "all" | "essential") => { localStorage.setItem(KEY, v); setShow(false); };
  return (
    <div role="dialog" aria-label={t("privacy")} className="fixed inset-x-2 bottom-16 z-[1150] mx-auto max-w-xl rounded-lg bg-card p-3 text-sm shadow-lift ring-1 ring-border md:bottom-4">
      <p className="text-foreground">{t("cookieText")} <Link to="/privacy" className="underline">{t("privacy")}</Link></p>
      <div className="mt-2 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => choose("essential")}>{t("cookieDecline")}</Button>
        <Button size="sm" onClick={() => choose("all")}>{t("cookieAccept")}</Button>
      </div>
    </div>
  );
}
