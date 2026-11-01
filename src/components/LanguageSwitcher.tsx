import { Globe } from "lucide-react";
import { LANGS, useI18n, type Lang } from "@/lib/i18n";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const { lang, setLang, t } = useI18n();
  const primary = LANGS.filter((l) => l.primary);
  const others = LANGS.filter((l) => !l.primary);
  const otherActive = others.find((l) => l.code === lang);

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full p-1 text-sm",
        tone === "dark" ? "bg-primary-foreground/10 ring-1 ring-primary-foreground/20" : "bg-card ring-1 ring-border",
      )}
      role="group"
      aria-label={t("language")}
    >
      {primary.map((l) => (
        <button
          key={l.code}
          lang={l.code}
          onClick={() => setLang(l.code as Lang)}
          aria-pressed={lang === l.code}
          className={cn(
            "min-h-10 rounded-full px-3.5 font-semibold transition-colors",
            lang === l.code
              ? "bg-accent text-accent-foreground"
              : tone === "dark"
                ? "text-primary-foreground/85 hover:text-primary-foreground"
                : "text-foreground/70 hover:text-foreground",
          )}
        >
          {l.label}
        </button>
      ))}
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={t("moreLanguages")}
          className={cn(
            "flex min-h-10 items-center gap-1 rounded-full px-3 font-semibold transition-colors",
            otherActive ? "bg-accent text-accent-foreground" : tone === "dark" ? "text-primary-foreground/85" : "text-foreground/70",
          )}
        >
          <Globe className="size-4" aria-hidden />
          {otherActive ? <span lang={otherActive.code}>{otherActive.label}</span> : null}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuLabel>{t("moreLanguages")}</DropdownMenuLabel>
          {others.map((l) => (
            <DropdownMenuItem key={l.code} lang={l.code} onSelect={() => setLang(l.code as Lang)} className="min-h-11 text-base">
              {l.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
