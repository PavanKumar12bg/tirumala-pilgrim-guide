import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LANGS } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

type Loc = Record<string, string | undefined>;
type Entry = { id: string; question: Loc; answer: Loc; keywords: string[]; category: string; source_label: string | null; source_url: string | null; ttd_verified: boolean; status: string; sort_order: number; updated_at: string };
const blank = (): Omit<Entry, "id" | "updated_at"> => ({ question: {}, answer: {}, keywords: [], category: "general", source_label: null, source_url: null, ttd_verified: false, status: "draft", sort_order: 100 });

/** Admin-only Q&A used by the voice helper. Visitors only ever read published rows (RLS). */
export function KnowledgeAdmin() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["knowledge", "admin"], queryFn: async () => {
    const { data, error } = await supabase.from("knowledge_entries").select("*").order("sort_order").order("created_at");
    if (error) throw error;
    return (data ?? []) as unknown as Entry[];
  } });
  const [editing, setEditing] = useState<(Omit<Entry, "id" | "updated_at"> & { id?: string }) | null>(null);
  const [allLangs, setAllLangs] = useState(false);
  const [busy, setBusy] = useState(false);
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["knowledge"] }); };

  const save = async () => {
    if (!editing) return;
    if (!Object.values(editing.question).some(v => v?.trim()) || !Object.values(editing.answer).some(v => v?.trim())) { toast.error("Add a question and an answer in at least one language."); return; }
    if (editing.source_url && !/^https:\/\//.test(editing.source_url)) { toast.error("Source link must start with https://"); return; }
    setBusy(true);
    const { id, ...row } = editing;
    const res = id ? await supabase.from("knowledge_entries").update(row).eq("id", id).select("id") : await supabase.from("knowledge_entries").insert(row).select("id");
    setBusy(false);
    if (res.error) { toast.error(res.error.message); return; }
    if (!res.data?.length) { toast.error("Could not save"); return; }
    toast.success("Saved");
    setEditing(null); refresh();
  };
  const remove = async (id: string) => {
    if (!window.confirm("Delete this entry?")) return;
    const { data, error } = await supabase.from("knowledge_entries").delete().eq("id", id).select("id");
    if (error || !data?.length) { toast.error(error?.message ?? "Could not delete"); return; }
    toast.success("Deleted"); refresh();
  };

  if (list.isLoading) return <Loader2 className="size-5 animate-spin" />;
  if (list.error) return <p role="alert" className="text-destructive">{(list.error as Error).message}</p>;
  const langs = allLangs ? LANGS : LANGS.filter(l => l.primary);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xl text-primary">Voice helper Q&amp;A</h2>
          <p className="text-sm text-muted-foreground">Published answers are used by the voice helper right away. Add only verified information with a source.</p>
        </div>
        <Button onClick={() => setEditing(blank())}><Plus className="size-4" />New</Button>
      </div>
      {editing ? (
        <form onSubmit={e => { e.preventDefault(); void save(); }} className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-border">
          {langs.map(l => (
            <fieldset key={l.code} className="space-y-1">
              <legend className="text-xs font-semibold text-muted-foreground">{l.label}</legend>
              <Input lang={l.code} placeholder="Question" value={editing.question[l.code] ?? ""} onChange={e => setEditing({ ...editing, question: { ...editing.question, [l.code]: e.target.value } })} />
              <Textarea lang={l.code} placeholder="Answer" value={editing.answer[l.code] ?? ""} onChange={e => setEditing({ ...editing, answer: { ...editing.answer, [l.code]: e.target.value } })} />
            </fieldset>
          ))}
          <Button type="button" variant="link" className="px-0 text-xs" onClick={() => setAllLangs(!allLangs)}>{allLangs ? "Show fewer languages" : "Show all 7 languages"}</Button>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1"><Label htmlFor="kw">Keywords / synonyms (comma separated, any language)</Label><Input id="kw" value={editing.keywords.join(", ")} onChange={e => setEditing({ ...editing, keywords: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} /></div>
            <div className="space-y-1"><Label htmlFor="kcat">Category</Label><Input id="kcat" value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="ksrc">Source name</Label><Input id="ksrc" value={editing.source_label ?? ""} onChange={e => setEditing({ ...editing, source_label: e.target.value || null })} /></div>
            <div className="space-y-1"><Label htmlFor="kurl">Source link (https)</Label><Input id="kurl" value={editing.source_url ?? ""} onChange={e => setEditing({ ...editing, source_url: e.target.value || null })} /></div>
          </div>
          <label className="flex items-center gap-3 text-sm"><Switch checked={editing.ttd_verified} onCheckedChange={v => setEditing({ ...editing, ttd_verified: v })} />Verified from an official TTD source</label>
          <label className="flex items-center gap-3 text-sm"><Switch checked={editing.status === "published"} onCheckedChange={v => setEditing({ ...editing, status: v ? "published" : "draft" })} />Published</label>
          <div className="flex gap-2"><Button type="submit" disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : null}Save</Button><Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button></div>
        </form>
      ) : null}
      {list.data?.length ? (
        <ul className="divide-y rounded-xl bg-card ring-1 ring-border">
          {list.data.map(e => (
            <li key={e.id} className="flex items-start justify-between gap-3 p-3">
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setEditing({ ...e })}>
                <p className="font-semibold">{e.question["te"] || e.question["en"] || Object.values(e.question).find(Boolean)}</p>
                <p className="mt-1 flex flex-wrap gap-1 text-xs"><Badge variant={e.status === "published" ? "default" : "secondary"}>{e.status}</Badge>{e.ttd_verified ? <Badge variant="outline">TTD verified</Badge> : null}<span className="text-muted-foreground">{e.category}</span></p>
              </button>
              <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => void remove(e.id)}><Trash2 className="size-4" /></Button>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted-foreground">No entries yet.</p>}
    </div>
  );
}
