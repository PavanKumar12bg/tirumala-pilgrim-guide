import { Globe, ChevronDown } from "lucide-react";
import { LANGS, useI18n, type Lang } from "@/lib/i18n";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const { lang, setLang, t } = useI18n();
  const active = LANGS.find(l => l.code === lang);

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full p-1 text-sm",
        tone === "dark" ? "bg-primary-foreground/10 ring-1 ring-primary-foreground/20" : "bg-card ring-1 ring-border",
      )}
      role="group"
      aria-label={t("language")}
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={t("language")}
          className={cn(
            "flex min-h-10 items-center gap-1.5 rounded-full px-2 font-semibold transition-colors",
            tone === "dark" ? "text-primary-foreground" : "text-foreground",
          )}
        >
          <Globe className="size-4" aria-hidden />
          <span lang={active?.code}>{active?.label}</span><ChevronDown className="size-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-[1300] min-w-44">
          <DropdownMenuLabel>{t("language")}</DropdownMenuLabel>
          {LANGS.map((l) => (
            <DropdownMenuItem key={l.code} lang={l.code} onSelect={() => setLang(l.code as Lang)} className="min-h-11 text-base">
              {l.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
