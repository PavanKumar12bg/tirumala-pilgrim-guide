import { selectSpeechVoice } from "./browser-speech";

export type NativeTts = { speak: (options: { text: string; lang: string; rate: number }) => Promise<unknown>; stop: () => Promise<unknown>; isLanguageSupported: (options: { lang: string }) => Promise<{ supported: boolean }> };
/** Retains utterances, waits briefly for lazy device voices, and reports actual failures. */
export function createAgentSpeech(deps: { synth?: SpeechSynthesis | undefined; utterance: (text: string) => SpeechSynthesisUtterance; native?: NativeTts | undefined }) {
  let seq = 0;
  let current: SpeechSynthesisUtterance | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cleanup: (() => void) | undefined;
  const stop = () => {
    seq++;
    clearTimeout(timer);
    cleanup?.(); cleanup = undefined;
    current = undefined;
    deps.synth?.cancel();
    void deps.native?.stop().catch(() => {});
  };
  return { stop, speak(text: string, lang: string, rate: number, finish: (result: "done" | "unavailable" | "failed") => void) {
    stop();
    const token = seq;
    let ended = false;
    const done = (result: "done" | "unavailable" | "failed") => {
      if (token !== seq || ended) return;
      ended = true; clearTimeout(timer); cleanup?.(); cleanup = undefined;
      if (result === "failed") { deps.synth?.cancel(); void deps.native?.stop().catch(() => {}); }
      current = undefined; finish(result);
    };
    if (deps.native) {
      timer = setTimeout(() => done("failed"), Math.max(15000, text.length * 200));
      void deps.native.isLanguageSupported({ lang: `${lang}-IN` }).then(async result => {
        if (token !== seq || ended) return;
        if (!result.supported) return done("unavailable");
        await deps.native?.speak({ text, lang: `${lang}-IN`, rate });
        done("done");
      }).catch(() => done("failed"));
      return;
    }
    const synth = deps.synth;
    if (!synth) return done("unavailable");
    const start = () => {
      if (token !== seq || ended || current) return;
      const voice = selectSpeechVoice(synth.getVoices(), lang);
      if (!voice) return;
      clearTimeout(timer); cleanup?.(); cleanup = undefined;
      current = deps.utterance(text);
      current.voice = voice; current.lang = voice.lang; current.rate = rate;
      current.onend = () => done("done");
      current.onerror = () => done("failed");
      timer = setTimeout(() => done("failed"), Math.max(15000, text.length * 200));
      try { synth.resume(); synth.speak(current); } catch { done("failed"); }
    };
    synth.addEventListener("voiceschanged", start);
    cleanup = () => synth.removeEventListener("voiceschanged", start);
    timer = setTimeout(() => done("unavailable"), 2000);
    start();
  } };
}