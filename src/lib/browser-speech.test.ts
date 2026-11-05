import { afterEach, describe, expect, it, vi } from "vitest";
import { createBrowserSpeech, selectSpeechVoice } from "./browser-speech";
const voice = (lang: string) => ({ lang }) as SpeechSynthesisVoice;
describe("device speech", () => {
  afterEach(() => vi.useRealTimers());
  it("prefers Indian English and normalizes Telugu locale tags", () => {
    const indian = voice("en-IN");
    expect(selectSpeechVoice([voice("en-US"), indian], "en")).toBe(indian);
    expect(selectSpeechVoice([voice("TE_in")], "te")?.lang).toBe("TE_in");
    expect(selectSpeechVoice([voice("en-IN")], "te")).toBeUndefined();
  });
  it("reads newly available voices at click time and cancels previous speech", () => {
    vi.useFakeTimers();
    let voices: SpeechSynthesisVoice[] = [];
    const utterances: SpeechSynthesisUtterance[] = [];
    const synth = { getVoices: () => voices, cancel: vi.fn(), resume: vi.fn(), speak: vi.fn() };
    const status = vi.fn();
    const owner = createBrowserSpeech({ synth: synth as unknown as SpeechSynthesis, utterance: () => { const u = {} as SpeechSynthesisUtterance; utterances.push(u); return u; }, status });
    owner.speak("నమస్కారం", "te");
    expect(status).toHaveBeenLastCalledWith("unavailable");
    voices = [voice("te-IN")];
    owner.speak("నమస్కారం", "te");
    expect(synth.speak).toHaveBeenCalledTimes(1);
    owner.speak("తిరుమల", "te");
    expect(synth.speak).toHaveBeenCalledTimes(2);
    expect(synth.cancel).toHaveBeenCalledTimes(3);
    utterances[0]?.onerror?.({} as SpeechSynthesisErrorEvent);
    expect(status).toHaveBeenLastCalledWith("loading");
    utterances[1]?.onerror?.({} as SpeechSynthesisErrorEvent);
    expect(status).toHaveBeenLastCalledWith("failed");
    owner.stop();
  });
});