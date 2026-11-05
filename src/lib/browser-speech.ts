/** Never substitute a different language's voice for Telugu (or any script). */
export function selectSpeechVoice(voices: SpeechSynthesisVoice[], lang: string) {
  const normalize = (value: string) => value.toLowerCase().replaceAll("_", "-");
  const locale = `${lang.toLowerCase()}-in`;
  return voices.find(v => normalize(v.lang) === locale)
    ?? voices.find(v => normalize(v.lang).split("-")[0] === lang.toLowerCase());
}

export function createBrowserSpeech(deps: {
  synth: SpeechSynthesis;
  utterance: (text: string) => SpeechSynthesisUtterance;
  status: (state: "loading" | "playing" | "idle" | "failed" | "unavailable") => void;
}) {
  let current: SpeechSynthesisUtterance | undefined;
  let generation = 0;
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    generation++;
    clearTimeout(watchdog);
    current = undefined;
    deps.synth.cancel();
    deps.status("idle");
  };
  return {
    stop,
    speak(text: string, lang: string) {
      stop();
      if (!text.trim()) return;
      const voice = selectSpeechVoice(deps.synth.getVoices(), lang);
      if (!voice) { deps.status("unavailable"); return; }
      const token = generation;
      const utterance = deps.utterance(text.trim());
      current = utterance; // Keep the utterance alive until playback completes.
      utterance.voice = voice;
      utterance.lang = voice.lang;
      const finish = (state: "idle" | "failed") => {
        if (token !== generation) return;
        clearTimeout(watchdog);
        current = undefined;
        deps.status(state);
      };
      utterance.onstart = () => {
        if (token !== generation) return;
        clearTimeout(watchdog);
        deps.status("playing");
      };
      utterance.onend = () => finish("idle");
      utterance.onerror = () => finish("failed");
      deps.status("loading");
      try {
        // Run within the button tap; deferring speak can lose mobile user activation.
        deps.synth.resume();
        deps.synth.speak(current);
        watchdog = setTimeout(() => {
          if (token !== generation) return;
          stop();
          deps.status("failed");
        }, 10_000);
      } catch { finish("failed"); }
    },
  };
}