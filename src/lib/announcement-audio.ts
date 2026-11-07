import { repeatDelayMs, VOICE_PREF_KEY } from "./voice-announcement";

export type AudioSettings = { autoplay_enabled: boolean; repeat_enabled: boolean; repeat_minutes: number };
type Clip = { key: string; url: string };
type SoundState = { preference: "on" | "off" | null; blocked: boolean; failed: boolean };
const initialState: SoundState = { preference: null, blocked: false, failed: false };

/** One owner per tab. No browser APIs are accessed until Home mounts. */
export function createAnnouncementAudio(deps: {
  audio: () => HTMLAudioElement;
  storage: () => Pick<Storage, "getItem" | "setItem">;
}) {
  let state = initialState;
  const subscribers = new Set<() => void>();
  let audio: HTMLAudioElement | undefined;
  let clip: Clip | null = null;
  let settings: AudioSettings | null = null;
  let active = false;
  let visible = true;
  let suspended = false;
  let agentActive = false;
  let resumeKey: string | null = null;
  let resumePosition = 0;
  let repeatDue = false;
  let generation = 0;
  let pending = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let recover: (() => void) | undefined;
  const emit = (patch: Partial<SoundState>) => {
    state = { ...state, ...patch };
    subscribers.forEach(fn => fn());
  };
  const cancelTimer = () => { clearTimeout(timer); timer = undefined; };
  const allowed = () => active && visible && !suspended && !agentActive && settings?.autoplay_enabled === true && state.preference !== "off";
  const stop = () => {
    generation++;
    pending = false;
    resumeKey = null;
    repeatDue = false;
    cancelTimer();
    audio?.pause();
    emit({ blocked: false });
  };
  const play = (unlock = false) => {
    if (!allowed() || !clip || !audio || pending || !audio.paused) return;
    // Use the latest signed URL on the next play without interrupting a playing clip.
    if (audio.getAttribute("src") !== clip.url) audio.src = clip.url;
    const token = generation;
    pending = true;
    // Call play synchronously here so the menu's explicit tap retains user activation.
    const onFailure = (error: unknown) => {
      if (token !== generation) return;
      pending = false;
      const name = typeof error === "object" && error !== null && "name" in error ? error.name : null;
      if (name === "NotAllowedError") emit({ blocked: true, failed: false });
      else if (name !== "AbortError") {
        emit({ blocked: false, failed: true });
        recover?.();
      }
    };
    let attempt: Promise<void>;
    try { attempt = audio.play(); } catch (error) { onFailure(error); return; }
    void attempt.then(() => {
      if (token !== generation) return;
      pending = false;
      if (unlock) {
        // Site sound consent, not a guarantee of browser-wide autoplay permission.
        try { deps.storage().setItem(VOICE_PREF_KEY, "on"); } catch { /* optional */ }
      }
      emit({ blocked: false, failed: false, ...(unlock ? { preference: "on" as const } : {}) });
    }).catch(onFailure);
  };
  const onEnded = () => {
    cancelTimer();
    const delay = repeatDelayMs(settings);
    if (!allowed() || delay == null) return;
    timer = setTimeout(() => { timer = undefined; if (agentActive) repeatDue = true; else play(); }, delay);
  };
  const onError = () => { cancelTimer(); emit({ failed: true }); recover?.(); };
  return {
    /** Central priority lock covers command processing as well as speech. Same element, same position. */
    setAgentActive(value: boolean) {
      if (agentActive === value) return;
      agentActive = value;
      if (value) {
        if (audio && clip && (!audio.paused || pending)) {
          resumeKey = clip.key;
          resumePosition = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
          generation++;
          pending = false;
          audio.pause();
        }
      } else {
        const shouldResume = resumeKey === clip?.key || repeatDue;
        if (resumeKey === clip?.key && audio) {
          try { audio.currentTime = resumePosition; } catch { /* source cannot seek: retain browser position */ }
        }
        resumeKey = null;
        repeatDue = false;
        if (shouldResume && !state.blocked) play();
      }
    },
    subscribe(fn: () => void) { subscribers.add(fn); return () => { subscribers.delete(fn); }; },
    snapshot: () => state,
    serverSnapshot: () => initialState,
    mount(onRecover: () => void) {
      active = true;
      recover = onRecover;
      audio = deps.audio();
      audio.preload = "auto";
      try {
        const value = deps.storage().getItem(VOICE_PREF_KEY);
        emit({ preference: value === "on" || value === "off" ? value : null });
      } catch { /* storage is optional */ }
      audio.addEventListener("ended", onEnded);
      audio.addEventListener("error", onError);
      return () => {
        active = false;
        stop();
        audio?.removeEventListener("ended", onEnded);
        audio?.removeEventListener("error", onError);
        audio?.removeAttribute("src");
        clip = null;
        settings = null;
        recover = undefined;
      };
    },
    setClip(next: Clip | null) {
      if (next?.key === clip?.key && next?.url === clip?.url && !state.failed) return;
      if (next && clip?.key === next.key && !state.failed) {
        // Signing the same object again is not a new announcement. Do not interrupt it.
        clip = next;
        return;
      }
      stop();
      clip = next;
      emit({ blocked: false, failed: false });
      if (!audio) return;
      if (!next) { audio.removeAttribute("src"); return; }
      audio.src = next.url;
      if (agentActive) resumeKey = next.key;
      play();
    },
    setSettings(next: AudioSettings | null) {
      const before = settings;
      settings = next;
      if (!allowed()) { stop(); return; }
      if (timer && (before?.repeat_minutes !== next?.repeat_minutes || before?.repeat_enabled !== next?.repeat_enabled)) onEnded();
      if (!before?.autoplay_enabled && next?.autoplay_enabled) play();
    },
    setEnvironment(nextVisible: boolean, nextSuspended: boolean) {
      const wasAllowed = allowed();
      visible = nextVisible;
      suspended = nextSuspended;
      if (!allowed()) stop();
      else if (!wasAllowed && !state.blocked) play();
    },
    setPreference(value: "on" | "off") {
      try { deps.storage().setItem(VOICE_PREF_KEY, value); } catch { /* optional */ }
      emit({ preference: value, blocked: false });
      if (value === "off") stop();
      else { cancelTimer(); play(); }
    },
    retry() {
      if (!allowed()) return;
      stop();
      emit({ blocked: false, failed: false });
      play();
    },
    unlock() {
      // No await, fetching, new element or timer before play: retain this tap's activation.
      if (state.blocked) play(true);
    },
  };
}

const globals = globalThis as { __tgBackgroundAudio?: ReturnType<typeof createAnnouncementAudio> };
export const announcementAudio = globals.__tgBackgroundAudio ??= createAnnouncementAudio({
  audio: () => new Audio(),
  storage: () => localStorage,
});