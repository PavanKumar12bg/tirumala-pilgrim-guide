import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Megaphone, Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { AUDIO_BUCKET, clipKey, repeatDelayMs, VOICE_PREF_KEY } from "@/lib/voice-announcement";

type Published = { id: string; published_at: string | null; text: string | null; audio_path: string | null; audio_hash: string | null; url: string | null };
type Settings = { autoplay_enabled: boolean; repeat_enabled: boolean; repeat_minutes: number };

// One audio element for the whole tab, so re-renders or route changes can never stack voices.
const g = globalThis as { __tgAnnAudio?: HTMLAudioElement; __tgAnnKey?: string | undefined };
function sharedAudio() { return (g.__tgAnnAudio ??= new Audio()); }

export function DarshanVoiceCard() {
  const { t, lang } = useI18n();
  const ann = useQuery({
    queryKey: ["voice_announcement", lang],
    refetchInterval: 60_000,
    queryFn: async (): Promise<Published | null> => {
      const { data: a } = await supabase.from("voice_announcements").select("id, published_at").eq("status", "published").maybeSingle();
      if (!a) return null;
      const { data: l } = await supabase.from("voice_announcement_langs").select("text, audio_path, audio_hash").eq("announcement_id", a.id).eq("lang", lang).maybeSingle();
      let url: string | null = null;
      if (l?.audio_path) url = (await supabase.storage.from(AUDIO_BUCKET).createSignedUrl(l.audio_path, 60 * 60 * 6)).data?.signedUrl ?? null;
      return { id: a.id, published_at: a.published_at, text: l?.text ?? null, audio_path: l?.audio_path ?? null, audio_hash: l?.audio_hash ?? null, url };
    },
  });
  const settings = useQuery({
    queryKey: ["voice_settings"], refetchInterval: 5 * 60_000,
    queryFn: async () => (await supabase.from("voice_settings").select("autoplay_enabled, repeat_enabled, repeat_minutes").eq("id", 1).maybeSingle()).data as Settings | null,
  });
  const [playing, setPlaying] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const userPaused = useRef(false);
  const settingsRef = useRef(settings.data);
  settingsRef.current = settings.data;

  const a = ann.data;
  const key = a && a.url ? clipKey(a.id, lang, a.audio_hash) : null;

  const tryPlay = async (manual = false) => {
    const audio = sharedAudio();
    if (!audio.src || !audio.paused) return; // never interrupt a voice already speaking
    try {
      await audio.play();
      setBlocked(false);
      if (manual) { try { localStorage.setItem(VOICE_PREF_KEY, "on"); } catch { /* optional */ } }
    } catch (e) {
      if ((e as Error).name === "NotAllowedError") setBlocked(true); else setFailed(true);
    }
  };

  // Load the clip for this announcement + language; stop anything else first.
  useEffect(() => {
    const audio = sharedAudio();
    clearTimeout(timer.current);
    if (!key) { audio.pause(); audio.removeAttribute("src"); g.__tgAnnKey = undefined; setPlaying(false); return; }
    if (g.__tgAnnKey === key) { setPlaying(!audio.paused); return; }
    audio.pause();
    g.__tgAnnKey = key;
    audio.src = a!.url!;
    audio.preload = "auto";
    setFailed(false);
    userPaused.current = false;
    const s = settingsRef.current;
    if (s?.autoplay_enabled !== false) void tryPlay();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    const audio = sharedAudio();
    const onPlay = () => { clearTimeout(timer.current); setPlaying(true); };
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      const d = repeatDelayMs(settingsRef.current);
      if (d == null || userPaused.current || settingsRef.current?.autoplay_enabled === false) return;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => { if (document.visibilityState === "visible") void tryPlay(); }, d);
    };
    const onError = () => { setFailed(true); setPlaying(false); };
    audio.addEventListener("play", onPlay); audio.addEventListener("pause", onPause); audio.addEventListener("ended", onEnded); audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("play", onPlay); audio.removeEventListener("pause", onPause); audio.removeEventListener("ended", onEnded); audio.removeEventListener("error", onError);
      clearTimeout(timer.current);
      audio.pause(); g.__tgAnnKey = undefined; // leaving Home stops the voice
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!a || !a.text) return null;
  const audio = typeof window !== "undefined" ? sharedAudio() : null;
  const when = a.published_at ? new Date(a.published_at).toLocaleString(lang === "or" ? "or-IN" : `${lang}-IN`, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) : "";

  return (
    <section aria-label={t("voiceAnnTitle")} className="rounded-2xl border border-accent/40 bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary"><Megaphone className="size-4" aria-hidden />{t("voiceAnnTitle")}</div>
      <p className="mt-2 text-base leading-relaxed" aria-live="polite">{a.text}</p>
      <p className="mt-1 text-xs text-muted-foreground">{t("voiceAdminNote")} · {t("voiceUpdated")} {when}</p>
      {!a.url || failed ? <p className="mt-3 text-sm text-muted-foreground">{t("voiceUnavailable")}</p> : (
        <div className="mt-3 flex flex-wrap gap-2">
          {blocked && <Button className="min-h-12 w-full" onClick={() => void tryPlay(true)}><Volume2 className="size-5" />{t("voiceEnable")}</Button>}
          {playing
            ? <Button variant="secondary" className="min-h-11" onClick={() => { userPaused.current = true; clearTimeout(timer.current); audio?.pause(); }}><Pause className="size-4" />{t("voicePause")}</Button>
            : <Button variant="secondary" className="min-h-11" onClick={() => { userPaused.current = false; void tryPlay(true); }}><Play className="size-4" />{t("voiceListen")}</Button>}
          <Button variant="outline" className="min-h-11" onClick={() => { if (!audio) return; userPaused.current = false; audio.pause(); audio.currentTime = 0; void tryPlay(true); }}><RotateCcw className="size-4" />{t("voiceReplay")}</Button>
        </div>
      )}
    </section>
  );
}
