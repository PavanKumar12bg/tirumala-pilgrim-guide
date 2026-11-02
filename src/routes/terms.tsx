import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, pageMeta } from "@/components/InfoPage";
import { useI18n } from "@/lib/i18n";
import { CONTACT_EMAIL } from "@/lib/site-copy";
export const Route = createFileRoute("/terms")({ head: () => pageMeta("Terms", "Terms page of Tirumala Guide, an independent pilgrim guide not affiliated with TTD."), component: Page });
function Page() { const { t } = useI18n(); return <InfoPage title={t("terms")}><p>{t("termsBody")}</p><p className="text-sm text-muted-foreground">{t("notAffiliated")}</p><p className="text-sm">{t("contact")}: <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p></InfoPage>; }
