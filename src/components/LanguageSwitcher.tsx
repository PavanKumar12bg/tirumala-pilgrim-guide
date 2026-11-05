import { Globe, ChevronDown } from "lucide-react";
import { useSyncExternalStore } from "react";
import { announcementAudio } from "@/lib/announcement-audio";
import { LANGS, useI18n, type Lang } from "@/lib/i18n";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const { lang, setLang, t } = useI18n();
  const active = LANGS.find(l => l.code === lang);
  const sound = useSyncExternalStore(announcementAudio.subscribe, announcementAudio.snapshot, announcementAudio.serverSnapshot);

  return (
    <div
      className={cn(
        "flex items-center gap-1 text-sm",
        tone === "dark" ? "text-primary-foreground" : "text-foreground",
      )}
      role="group"
      aria-label={t("language")}
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={t("language")}
          className={cn(
            "flex min-h-11 items-center gap-1.5 rounded-md px-2 font-semibold transition-colors",
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
          <DropdownMenuSeparator />
          <DropdownMenuLabel>{t("websiteSound")}</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={sound.preference ?? ""} onValueChange={value => {
            if (value === "on" || value === "off") announcementAudio.setPreference(value);
          }}>
            <DropdownMenuRadioItem value="on" className="min-h-11">{t("soundOn")}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="off" className="min-h-11">{t("soundOff")}</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          {(sound.blocked || sound.failed) && sound.preference !== "off" && <DropdownMenuItem className="min-h-11" onSelect={() => announcementAudio.retry()}>{t("retry")}</DropdownMenuItem>}
          {sound.blocked && <DropdownMenuLabel className="max-w-64 whitespace-normal text-xs font-normal">{t("voiceBlocked")}</DropdownMenuLabel>}
          {sound.failed && <DropdownMenuLabel className="max-w-64 whitespace-normal text-xs font-normal">{t("soundUnavailable")}</DropdownMenuLabel>}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
