import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { AUDIO_BUCKET, clipKey } from "@/lib/voice-announcement";
import { announcementAudio, type AudioSettings } from "@/lib/announcement-audio";
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/** Fully downloaded clip per announcement/language/audio version, reused across polls. */
const localClips = new Map<string, string>();

export function BackgroundDarshanAudio({ suspended = false }: { suspended?: boolean }) {
  const { lang, t } = useI18n();
  const sound = useSyncExternalStore(announcementAudio.subscribe, announcementAudio.snapshot, announcementAudio.serverSnapshot);
  const client = useQueryClient();
  const lastRecovery = useRef(0);
  const retries = useRef(0);
  const recoveryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ann = useQuery({
    queryKey: ["voice_announcement", lang],
    refetchInterval: 30_000,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
    retry: 2,
    queryFn: async () => {
      const { data: a, error } = await supabase.from("voice_announcements").select("id, published_at").eq("status", "published").maybeSingle();
      if (error) throw error;
      if (!a) return null; // Only a successful empty read is deletion.
      const { data: l, error: languageError } = await supabase.from("voice_announcement_langs").select("audio_path, audio_hash").eq("announcement_id", a.id).eq("lang", lang).maybeSingle();
      if (languageError) throw languageError;
      if (!l?.audio_path) return null;
      const key = clipKey(a.id, lang, l.audio_hash);
      const cached = localClips.get(key);
      if (cached) return { key, url: cached };
      const signed = await supabase.storage.from(AUDIO_BUCKET).createSignedUrl(l.audio_path, 60 * 60 * 6);
      if (signed.error) throw signed.error;
      if (!signed.data?.signedUrl) throw new Error("Audio temporarily unavailable");
      // Download the whole clip first so slow mobile networks cannot stall or cut playback midway.
      const res = await fetch(signed.data.signedUrl);
      if (!res.ok) throw new Error("Audio temporarily unavailable");
      const url = URL.createObjectURL(await res.blob());
      // Keep a paused element's object URL alive while another language request finishes.
      localClips.set(key, url);
      // Bound cached versions; the latest selected seven-language set stays reusable.
      if (localClips.size > 14) {
        const oldest = localClips.keys().next().value;
        if (oldest && oldest !== key) { const oldUrl = localClips.get(oldest); localClips.delete(oldest); if (oldUrl) URL.revokeObjectURL(oldUrl); }
      }
      return { key, url };
    },
  });
  const settings = useQuery({
    queryKey: ["voice_settings"], refetchInterval: 30_000,
    refetchOnWindowFocus: "always", refetchOnReconnect: "always",
    queryFn: async (): Promise<AudioSettings | null> => {
      const { data, error } = await supabase.from("voice_settings").select("autoplay_enabled, repeat_enabled, repeat_minutes").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    announcementAudio.setEnvironment(document.visibilityState === "visible", suspended);
    const unmount = announcementAudio.mount(() => {
      const now = Date.now();
      if (retries.current >= 3 || now - lastRecovery.current < 30_000) return;
      lastRecovery.current = now;
      retries.current++;
      clearTimeout(recoveryTimer.current);
      recoveryTimer.current = setTimeout(() => {
        void client.invalidateQueries({ queryKey: ["voice_announcement"] });
      }, 5_000 * retries.current);
    });
    return () => { clearTimeout(recoveryTimer.current); unmount(); };
  }, [client]);
  useEffect(() => {
    // Stop the old spoken language even while the new language is still loading.
    announcementAudio.setClip(null);
    retries.current = 0;
    clearTimeout(recoveryTimer.current);
  }, [lang]);
  useEffect(() => { announcementAudio.setSettings(settings.data ?? null); }, [settings.data]);
  useEffect(() => {
    if (ann.data !== undefined) announcementAudio.setClip(ann.data);
  }, [lang, ann.data, ann.dataUpdatedAt]);
  useEffect(() => {
    const update = () => announcementAudio.setEnvironment(document.visibilityState === "visible", suspended);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, [suspended]);
  return (
    <AlertDialog open={sound.blocked && !!ann.data && !suspended}>
      <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-lg sm:max-w-sm" onEscapeKeyDown={event => event.preventDefault()}>
        <AlertDialogTitle>{t("websiteSound")}</AlertDialogTitle>
        <AlertDialogDescription>{t("voiceBlocked")}</AlertDialogDescription>
        <Button className="min-h-11 justify-self-end" onClick={() => announcementAudio.unlock()}>{t("voiceAllow")}</Button>
      </AlertDialogContent>
    </AlertDialog>
  );
}