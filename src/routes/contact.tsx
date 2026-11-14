import { createFileRoute } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { InfoPage, pageMeta } from "@/components/InfoPage";
import { useI18n } from "@/lib/i18n";
import { CONTACT_EMAIL } from "@/lib/site-copy";
export const Route = createFileRoute("/contact")({ head: () => pageMeta("Contact", "Contact Tirumala Guide for corrections, suggestions or privacy requests."), component: Page });
function Page() { const { t } = useI18n(); return <InfoPage title={t("contact")}><p>{t("contactBody")}</p><a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 font-semibold text-primary-foreground"><Mail className="size-4" aria-hidden />{CONTACT_EMAIL}</a><p className="text-sm text-muted-foreground">{t("notAffiliated")}</p></InfoPage>; }
