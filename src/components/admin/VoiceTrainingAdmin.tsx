import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { syncVoiceTraining } from "@/lib/voice-training.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function VoiceTrainingAdmin() {
  const qc = useQueryClient();
  const sync = useServerFn(syncVoiceTraining);
  const [id, setId] = useState("");
  const [range, setRange] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const status = useQuery({ queryKey: ["voice-training", "admin"], queryFn: async () => {
    const result = await supabase.from("voice_training_sync").select("*").eq("id", 1).maybeSingle();
    if (result.error) throw result.error;
    return result.data;
  } });
  const syncNow = async () => {
    setBusy(true); setError("");
    try {
      const value = id || status.data?.spreadsheet_id || "";
      const spreadsheetId = value.match(/\/spreadsheets\/d\/([\w-]+)/)?.[1] ?? value;
      await sync({ data: { spreadsheetId, range: range || status.data?.sheet_range || "Queries!A1:T1001" } });
    } catch (e) { setError(e instanceof Error ? e.message : "Sync failed"); }
    finally { setBusy(false); await qc.invalidateQueries({ queryKey: ["voice-training"] }); }
  };
  return <section className="space-y-2 border-b border-border pb-4">
    <h3 className="font-semibold text-primary">Google Sheets query training</h3>
    <div className="grid gap-2 sm:grid-cols-2">
      <div><Label htmlFor="training-sheet">Spreadsheet URL or ID</Label><Input id="training-sheet" value={id || status.data?.spreadsheet_id || ""} onChange={e => setId(e.target.value)} /></div>
      <div><Label htmlFor="training-range">Sheet range</Label><Input id="training-range" value={range || status.data?.sheet_range || "Queries!A1:T1001"} onChange={e => setRange(e.target.value)} /></div>
    </div>
    <div className="flex flex-wrap items-center gap-3"><Button disabled={busy} onClick={() => void syncNow()}><RefreshCw className="size-4" />{busy ? "Syncing…" : "Sync Now"}</Button><a className="text-sm text-primary underline" href="/voice-query-template.csv" download>Download template</a></div>
    <p className="text-xs text-muted-foreground">{status.data?.last_synced_at ? `Last sync: ${new Date(status.data.last_synced_at).toLocaleString()} · ${status.data.row_count} rows` : "Not synchronized"}</p>
    {error || status.data?.last_error || status.error ? <p role="alert" className="text-sm text-destructive">{error || status.data?.last_error || String(status.error)}</p> : null}
  </section>;
}