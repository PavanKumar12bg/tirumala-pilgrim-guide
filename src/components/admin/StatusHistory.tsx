import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { dailyStatus, waitingChange, type StatusEntry } from "@/lib/status-history";
import { pickLocalized, useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function StatusHistory() {
 const { t, lang } = useI18n();
 const [from, setFrom] = useState("");
 const [to, setTo] = useState("");
 const query = useQuery({ queryKey: ["status-history", from, to], queryFn: async () => {
   let request = supabase.from("status_history").select("*").order("recorded_at", { ascending: false });
   if (from) request = request.gte("entry_date", from);
   if (to) request = request.lte("entry_date", to);
   const { data, error } = await request;
   if (error) throw error;
   return data as unknown as StatusEntry[];
 }});
 const daily = useMemo(() => dailyStatus(query.data ?? []), [query.data]);
 const change = waitingChange(query.data ?? []);
 const chart = daily.map(e => ({ date: e.entry_date, wait: e.darshan_wait_hours == null ? null : Number(e.darshan_wait_hours), crowd: e.crowd_level ? ["low", "moderate", "high", "very_high"].indexOf(e.crowd_level) + 1 : null }));
 const levels = ["crowd_low", "crowd_moderate", "crowd_high", "crowd_very_high"] as const;
 return <section className="space-y-4 border-t pt-5">
  <h2 className="text-xl text-primary">{t("dailyHistory")}</h2>
  <div className="grid grid-cols-2 gap-3">
   <div className="min-w-0"><Label htmlFor="history-from">{t("fromDate")}</Label><Input id="history-from" type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-full min-w-0" /></div>
   <div className="min-w-0"><Label htmlFor="history-to">{t("toDate")}</Label><Input id="history-to" type="date" value={to} onChange={e => setTo(e.target.value)} className="w-full min-w-0" /></div>
  </div>
  {query.isLoading ? <p>{t("loading")}</p> : query.isError ? <div role="alert"><p>{t("errorLoad")}</p><Button variant="outline" onClick={() => query.refetch()}>{t("retry")}</Button></div> : !daily.length ? <p className="text-sm text-muted-foreground">{t("noHistory")}</p> : <>
   <dl className="grid grid-cols-2 gap-4"><div><dt className="text-xs text-muted-foreground">{t("entries")}</dt><dd className="text-2xl">{query.data?.length}</dd></div><div><dt className="text-xs text-muted-foreground">{t("waitChange")}</dt><dd className="text-2xl">{change == null ? "—" : `${change > 0 ? "+" : ""}${change}`} <span className="text-sm">{change != null ? t("hours") : ""}</span></dd></div></dl>
   <h3>{t("dailyTrend")} · {t("darshanWait")}</h3>
   <div className="h-48 min-w-0" role="img" aria-label={`${t("dailyTrend")} · ${t("darshanWait")}`}><ResponsiveContainer width="100%" height="100%"><LineChart data={chart} margin={{ left: 0, right: 15 }}><CartesianGrid stroke="var(--border)" /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis width={30} /><Tooltip /><Line type="linear" dataKey="wait" name={t("hours")} stroke="var(--primary)" strokeWidth={2} connectNulls={false} dot /></LineChart></ResponsiveContainer></div>
   <h3>{t("dailyTrend")} · {t("crowdStatus")}</h3>
   <div className="h-40 min-w-0" role="img" aria-label={`${t("dailyTrend")} · ${t("crowdStatus")}`}><ResponsiveContainer width="100%" height="100%"><LineChart data={chart}><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis domain={[1,4]} ticks={[1,2,3,4]} width={75} tick={{ fontSize: 9 }} tickFormatter={(v: number) => { const key = levels[v - 1]; return key ? t(key) : ""; }} /><Tooltip formatter={(v: number) => { const key = levels[v - 1]; return key ? t(key) : "—"; }} /><Line type="stepAfter" dataKey="crowd" name={t("crowdStatus")} stroke="var(--map-nearby)" strokeWidth={2} connectNulls={false} /></LineChart></ResponsiveContainer></div>
   <h3>{t("allEntries")}</h3>
   <ul className="divide-y">{query.data?.map(e => <li key={e.id} className="py-3 text-sm"><p className="text-xs text-muted-foreground">{new Date(e.recorded_at).toLocaleString(lang, { timeZone: "Asia/Kolkata" })} · {t("adminSet")}</p><p className="mt-1">{t("darshanWait")}: {e.darshan_wait_hours == null ? "—" : `${e.darshan_wait_hours} ${t("hours")}`} · {t("crowdStatus")}: {e.crowd_level ? t(`crowd_${e.crowd_level}`) : "—"}</p><p>{pickLocalized(e.darshan_note, lang)}</p></li>)}</ul>
  </>}
 </section>;
}