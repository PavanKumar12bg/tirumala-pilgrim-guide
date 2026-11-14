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
    <div className="fixed inset-0 z-[1000] flex h-dvh items-center justify-center bg-background" role="status" aria-label={t("appName")}>
      <img
        src={openingImage.url}
        alt={t("appName")}
        className="h-full w-full object-contain"
        fetchPriority="high"
        onLoad={() => setLoaded(true)}
        onError={() => setVisible(false)}
      />
    </div>
  );
}