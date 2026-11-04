import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, Play, RefreshCw, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AUDIO_BUCKET, LANG_NAMES, MAX_SOURCE_CHARS, REPEAT_CHOICES, VOICE_LANGS, type VoiceLang } from "@/lib/voice-announcement";
import { createAndTranslate, deleteAnnouncement, generateVoice, publishAnnouncement } from "@/lib/voice-announcement.functions";

type Ann = { id: string; source_text: string; source_lang: string; status: string; published_at: string | null; updated_at: string };
type LangRow = { lang: VoiceLang; text: string | null; text_status: string; audio_status: string; audio_path: string | null; audio_hash: string | null; text_hash: string | null; error: string | null };

const listQuery = { queryKey: ["admin_voice_ann"], queryFn: async () => {
  const { data: anns } = await supabase.from("voice_announcements").select("id, source_text, source_lang, status, published_at, updated_at").in("status", ["draft", "published"]);
  const ids = (anns ?? []).map((a) => a.id);
  const { data: langs } = ids.length ? await supabase.from("voice_announcement_langs").select("*").in("announcement_id", ids) : { data: [] };
  const by = (id: string) => (langs ?? []).filter((l) => l.announcement_id === id) as unknown as LangRow[];
  const draft = (anns ?? []).find((a) => a.status === "draft") as Ann | undefined;
  const live = (anns ?? []).find((a) => a.status === "published") as Ann | undefined;
  return { draft: draft ? { ...draft, langs: by(draft.id) } : null, live: live ? { ...live, langs: by(live.id) } : null };
} };

const fmt = (s: string | null) => (s ? new Date(s).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) + " IST" : "—");
const ready = (l: LangRow) => l.text_status === "ready" && l.audio_status === "ready" && !!l.audio_path && l.audio_hash === l.text_hash;

export function VoiceAnnouncementAdmin() {
  const qc = useQueryClient();
  const q = useQuery({ ...listQuery, refetchInterval: 4000 });
  const settings = useQuery({ queryKey: ["voice_settings"], queryFn: async () => (await supabase.from("voice_settings").select("*").eq("id", 1).maybeSingle()).data });
  const translate = useServerFn(createAndTranslate);
  const voice = useServerFn(generateVoice);
  const publish = useServerFn(publishAnnouncement);
  const remove = useServerFn(deleteAnnouncement);
  const [text, setText] = useState("");
  const [srcLang, setSrcLang] = useState<VoiceLang>("te");
  const [busy, setBusy] = useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin_voice_ann"] }).then(() => qc.invalidateQueries({ queryKey: ["voice_announcement"] }));

  const runVoices = async (id: string, langs: VoiceLang[]) => {
    for (const lang of langs) {
      setBusy(`voice:${lang}`);
      const r = await voice({ data: { id, lang } });
      if (!r.ok) toast.error(`${LANG_NAMES[lang]}: ${r.error}`);
      await refresh();
    }
    setBusy(null);
  };

  const generate = async (draftId?: string) => {
    setBusy("translate");
    const r = await translate({ data: { text, sourceLang: srcLang, draftId } });
    await refresh();
    if (!r.ok || !r.id) { setBusy(null); toast.error(r.ok ? "Failed" : r.error); return; }
    const { data: rows } = await supabase.from("voice_announcement_langs").select("lang, text_status").eq("announcement_id", r.id);
    await runVoices(r.id, (rows ?? []).filter((x) => x.text_status === "ready").map((x) => x.lang as VoiceLang));
  };

  const play = async (path: string | null) => {
    if (!path) return;
    const { data } = await supabase.storage.from(AUDIO_BUCKET).createSignedUrl(path, 600);
    if (data?.signedUrl) void new Audio(data.signedUrl).play();
  };

  const saveSettings = async (patch: Record<string, unknown>) => {
    const { error } = await supabase.from("voice_settings").update(patch).eq("id", 1);
    if (error) toast.error("Could not save settings"); else { toast.success("Saved"); void qc.invalidateQueries({ queryKey: ["voice_settings"] }); }
  };

  const draft = q.data?.draft;
  const live = q.data?.live;
  const allReady = !!draft && draft.langs.length === 7 && draft.langs.every(ready);

  const Table = ({ a, editable }: { a: Ann & { langs: LangRow[] }; editable: boolean }) => (
    <ul className="mt-3 divide-y rounded-lg border">
      {VOICE_LANGS.map((lang) => {
        const l = a.langs.find((x) => x.lang === lang);
        const st = !l ? "waiting" : l.text_status === "failed" || l.audio_status === "failed" ? "failed" : ready(l) ? "ready" : l.text_status === "working" || l.audio_status === "working" || busy === `voice:${lang}` ? "working" : "waiting";
        return (
          <li key={lang} className="flex flex-col gap-1 p-3 sm:flex-row sm:items-start sm:gap-3">
            <div className="flex w-32 shrink-0 items-center gap-2 font-semibold">{LANG_NAMES[lang]}
              <Badge variant={st === "ready" ? "default" : st === "failed" ? "destructive" : "secondary"}>{st === "working" && <Loader2 className="size-3 animate-spin" />}{st}</Badge></div>
            <div className="min-w-0 flex-1 text-sm" lang={lang}>{l?.text ?? "—"}{l?.error && <p className="mt-1 text-xs text-destructive">{l.error}</p>}</div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="min-h-10" disabled={!l?.audio_path} onClick={() => void play(l?.audio_path ?? null)} aria-label={`Play ${LANG_NAMES[lang]}`}><Play className="size-4" /></Button>
              {editable && st === "failed" && <Button size="sm" variant="outline" className="min-h-10" disabled={!!busy} onClick={() => l?.text_status === "failed" ? void generate(a.id) : void runVoices(a.id, [lang])}><RefreshCw className="size-4" />Retry</Button>}
            </div>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card p-4">
        <h2 className="text-lg font-semibold">Voice announcement — currently on Home page</h2>
        {live ? <>
          <p className="mt-1 text-sm text-muted-foreground">Published {fmt(live.published_at)}</p>
          <p className="mt-2 whitespace-pre-wrap">{live.source_text}</p>
          <Table a={live} editable={false} />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" className="min-h-11" onClick={() => { setText(live.source_text); setSrcLang(live.source_lang as VoiceLang); }}>Edit as new announcement</Button>
            <Button variant="destructive" className="min-h-11" disabled={!!busy} onClick={async () => { if (!confirm("Remove this announcement from the Home page?")) return; await remove({ data: { id: live.id } }); toast.success("Deleted"); await refresh(); }}><Trash2 className="size-4" />Delete</Button>
          </div>
        </> : <p className="mt-1 text-sm text-muted-foreground">No announcement is live.</p>}
      </section>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="text-lg font-semibold">New announcement</h2>
        <p className="text-sm text-muted-foreground">Enter text → Generate 7 languages and voices → check → Publish. The current one stays live until you publish.</p>
        <div className="mt-3 grid gap-2">
          <Label htmlFor="ann-lang">Language you are typing in</Label>
          <select id="ann-lang" className="h-11 rounded-md border border-input bg-card px-3" value={srcLang} onChange={(e) => setSrcLang(e.target.value as VoiceLang)}>
            {VOICE_LANGS.map((l) => <option key={l} value={l}>{LANG_NAMES[l]}</option>)}
          </select>
          <Label htmlFor="ann-text">Announcement</Label>
          <Textarea id="ann-text" rows={4} maxLength={MAX_SOURCE_CHARS} value={text} onChange={(e) => setText(e.target.value)} placeholder="Today's darshan waiting time is about 6 hours. 7 compartments are full." />
          <p className="text-xs text-muted-foreground">{text.length}/{MAX_SOURCE_CHARS}. Write numbers as digits (6, 7) so they can be checked.</p>
          <Button className="min-h-12" disabled={!!busy || text.trim().length < 3} onClick={() => void generate()}>{busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}{busy === "translate" ? "Translating…" : busy ? "Making voices…" : "Generate 7 languages and voices"}</Button>
        </div>
        {draft && <>
          <h3 className="mt-5 font-semibold">Draft preview</h3>
          <p className="whitespace-pre-wrap text-sm">{draft.source_text}</p>
          <Table a={draft} editable />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button className="min-h-12" disabled={!allReady || !!busy} onClick={async () => { setBusy("publish"); const r = await publish({ data: { id: draft.id } }); setBusy(null); if (r.ok) { toast.success("Published to Home page"); setText(""); } else toast.error(r.error); await refresh(); }}><Send className="size-4" />Publish</Button>
            <Button variant="outline" className="min-h-12" disabled={!!busy} onClick={async () => { await remove({ data: { id: draft.id } }); await refresh(); }}><Trash2 className="size-4" />Discard draft</Button>
          </div>
          {!allReady && <p className="mt-2 text-sm text-muted-foreground">Publish unlocks when all 7 languages show "ready".</p>}
        </>}
      </section>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="text-lg font-semibold">Playback settings</h2>
        {settings.data && <div className="mt-3 grid gap-4">
          <label className="flex items-center justify-between gap-3"><span>Try to play automatically on Home page</span><Switch checked={settings.data.autoplay_enabled} onCheckedChange={(v) => void saveSettings({ autoplay_enabled: v })} /></label>
          <label className="flex items-center justify-between gap-3"><span>Repeat automatically</span><Switch checked={settings.data.repeat_enabled} onCheckedChange={(v) => void saveSettings({ repeat_enabled: v })} /></label>
          <div className="grid gap-1"><Label htmlFor="ann-rep">Repeat every</Label>
            <select id="ann-rep" className="h-11 rounded-md border border-input bg-card px-3" value={settings.data.repeat_minutes} onChange={(e) => void saveSettings({ repeat_minutes: Number(e.target.value) })}>
              {REPEAT_CHOICES.map((m) => <option key={m} value={m}>{m} min</option>)}
            </select></div>
          <p className="text-xs text-muted-foreground">Phones often block sound until the visitor taps once; they then see an "Enable" button.</p>
        </div>}
      </section>
    </div>
  );
}
