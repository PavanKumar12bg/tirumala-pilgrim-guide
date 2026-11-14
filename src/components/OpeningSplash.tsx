import { useEffect, useState } from "react";
import openingImage from "@/assets/tirumala-opening.png.asset.json";
import { useI18n } from "@/lib/i18n";

/** One opening per document load; ordinary page navigation never replays it. */
export function OpeningSplash() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Never leave the guide hidden when an image or connection fails.
    const timeout = setTimeout(() => setVisible(false), loaded ? 2000 : 5000);
    return () => clearTimeout(timeout);
  }, [loaded]);

  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[2000] flex h-dvh items-center justify-center overflow-hidden bg-background" role="status" aria-label={t("appName")}>
      <img
        src={openingImage.url}
        alt={t("appName")}
        className="absolute inset-0 h-full w-full object-cover object-center"
        fetchPriority="high"
        onLoad={() => setLoaded(true)}
        onError={() => setVisible(false)}
      />
      <div className="absolute inset-x-0 bottom-0 flex justify-center bg-aubergine-deep/70 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] pt-5" aria-hidden="true">
        <span className="size-8 animate-spin rounded-full border-[3px] border-primary-foreground/30 border-t-marigold motion-reduce:animate-none" />
      </div>
    </div>
  );
}