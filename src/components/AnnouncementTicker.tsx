import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { announcementsQuery, officialStatusQuery } from "@/lib/places";
import { isCurrentTtdReport } from "@/lib/ttd-report";
import { pickLocalized, useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
export function AnnouncementTicker() {
 const { t, lang } = useI18n();
 const announcements = useQuery({ ...announcementsQuery(), refetchInterval: 60_000 });
 const status = useQuery(officialStatusQuery());
 const [open, setOpen] = useState(false);
 const [read, setRead] = useState("");
 const active = (announcements.data ?? []).filter(a => a.active);
 const fingerprint = JSON.stringify(active.map(a => [a.id, a.text]));
 useEffect(() => { try { setRead(localStorage.getItem("tg-announcements-read") ?? ""); } catch { /* unavailable storage does not block announcements */ } }, []);
 const report = status.data?.report;
 const items: string[] = [];
 if (report) {
  items.push(`${t("officialReport")} · ${t("darshanWait")}: ${report.wait_min_hours === report.wait_max_hours ? report.wait_min_hours : `${report.wait_min_hours}–${report.wait_max_hours}`} ${t("hours")}`);
  if (report.waiting_compartments != null) items.push(`${t("queueCompartments")}: ${report.waiting_compartments}`);
  items.push(`${t("reportDate")}: ${report.report_date}`, t("reportNotLive"));
  if (!isCurrentTtdReport(report)) items.push(t("reportStale"));
  if (status.data?.unavailable) items.push(t("reportUnavailable"));
 }
 items.push(...active.map(a => pickLocalized(a.text, lang)).filter(Boolean));
 const text = items.length ? items.join("   ✦   ") : t("noAnnouncements");
 const unread = active.length > 0 && read !== fingerprint;
 const show = () => { setOpen(true); setRead(fingerprint); try { localStorage.setItem("tg-announcements-read", fingerprint); } catch { /* optional read indicator */ } };
 return <>
  <Button variant="ghost" onClick={show} aria-label={t("announcements")} className="ticker-trigger flex h-8 w-full shrink-0 justify-start gap-2 overflow-hidden rounded-none border-b border-accent/30 bg-aubergine-deep px-3 text-primary-foreground hover:bg-aubergine-deep hover:text-primary-foreground">
   <span className="relative shrink-0"><Megaphone className="size-3.5 text-accent" />{unread ? <span className="absolute -right-1 -top-1 size-1.5 rounded-full bg-accent" /> : null}</span>
   <span className="min-w-0 flex-1 overflow-hidden text-left text-xs"><span className={items.length ? "animate-ticker inline-flex w-max" : "block truncate"}><span className="pr-12">{text}</span>{items.length ? <span aria-hidden className="pr-12">{text}</span> : null}</span></span>
  </Button>
  <Dialog open={open} onOpenChange={setOpen}><DialogContent className="z-[1300] max-h-[80svh] w-[calc(100%-1.5rem)] overflow-y-auto rounded-lg p-4"><DialogTitle>{t("announcements")}</DialogTitle><DialogDescription>{t("officialNote")}</DialogDescription><ul className="divide-y">{items.length ? items.map((item, i) => <li className="py-3 text-sm" key={i}>{item}</li>) : <li>{announcements.isError || status.isError ? t("errorLoad") : t("noAnnouncements")}</li>}</ul></DialogContent></Dialog>
 </>;
}