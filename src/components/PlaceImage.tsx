import { useState } from "react";
import { catIcon, catKey } from "@/lib/places";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Shows the place photo, or a neutral category placeholder when missing or broken. */
export function PlaceImage({ src, category, alt, className }: { src?: string | null | undefined; category: string; alt: string; className?: string | undefined }) {
  return <PlaceImageRequest key={src} src={src} category={category} alt={alt} className={className} />;
}

function PlaceImageRequest({ src, category, alt, className }: { src?: string | null | undefined; category: string; alt: string; className?: string | undefined }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const { t } = useI18n();
  if (src && !failed) {
    return <img src={src} alt={alt} loading="lazy" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} className={cn("h-full w-full object-cover", !loaded && "bg-secondary", className)} />;
  }
  return (
    <div className={cn("kolam-pattern flex h-full w-full flex-col items-center justify-center gap-1 bg-secondary text-secondary-foreground", className)} role="img" aria-label={`${alt} — ${t("noPhoto")}`}>
      <span className="text-4xl opacity-80" aria-hidden>{catIcon(category)}</span>
      <span className="text-xs font-medium text-muted-foreground">{t(catKey(category))}</span>
    </div>
  );
}
