import { ExternalLink } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const TIRUMALAINFO_LIVE_URL = "https://www.tirumalainfo.com/tirumala-live-status.php";

// Link only: TirumalaInfo's terms forbid republishing its data feed without written permission.
const COPY: Record<string, { title: string; body: string }> = {
  en: { title: "TirumalaInfo live status (external site)", body: "An independent site's own queue estimates. Not TTD official and not shown inside this guide." },
  te: { title: "తిరుమలఇన్ఫో ప్రత్యక్ష స్థితి (బయటి సైట్)", body: "స్వతంత్ర సైట్ స్వంత క్యూ అంచనాలు. టీటీడీ అధికారికం కాదు, ఈ గైడ్‌లో చూపబడవు." },
  ta: { title: "TirumalaInfo நேரடி நிலை (வெளி தளம்)", body: "ஒரு சுயாதீன தளத்தின் வரிசை மதிப்பீடுகள். TTD அதிகாரப்பூர்வம் அல்ல." },
  kn: { title: "TirumalaInfo ನೇರ ಸ್ಥಿತಿ (ಹೊರಗಿನ ತಾಣ)", body: "ಸ್ವತಂತ್ರ ತಾಣದ ಸರತಿ ಅಂದಾಜುಗಳು. TTD ಅಧಿಕೃತವಲ್ಲ." },
  ml: { title: "TirumalaInfo തത്സമയ നില (പുറം സൈറ്റ്)", body: "ഒരു സ്വതന്ത്ര സൈറ്റിന്റെ ക്യൂ അനുമാനങ്ങൾ. TTD ഔദ്യോഗികമല്ല." },
  hi: { title: "TirumalaInfo लाइव स्थिति (बाहरी साइट)", body: "एक स्वतंत्र साइट के अपने कतार अनुमान। TTD आधिकारिक नहीं।" },
  or: { title: "TirumalaInfo ସିଧା ସ୍ଥିତି (ବାହାର ସାଇଟ୍)", body: "ଏକ ସ୍ୱାଧୀନ ସାଇଟ୍‌ର ଧାଡ଼ି ଅନୁମାନ। TTD ସରକାରୀ ନୁହେଁ।" },
};

export function TirumalaInfoLink() {
  const { lang } = useI18n();
  const c = COPY[lang] ?? COPY.en;
  return <a href={TIRUMALAINFO_LIVE_URL} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-start justify-between gap-3 rounded-lg bg-card px-4 py-3 shadow-soft ring-1 ring-border">
    <span><span className="block font-semibold text-primary">{c.title}</span><span className="block text-xs text-muted-foreground">{c.body}</span></span>
    <ExternalLink className="mt-1 size-4 shrink-0 text-primary" aria-hidden />
  </a>;
}
