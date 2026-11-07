import { afterEach, describe, expect, it, vi } from "vitest";
import { createAgentSpeech } from "./agent-speech";
const voice = (lang: string) => ({ lang }) as SpeechSynthesisVoice;
function setup(voices = [voice("te-IN")]) {
  const synth = Object.assign(new EventTarget(), { getVoices: vi.fn(() => voices), cancel: vi.fn(), resume: vi.fn(), speak: vi.fn() });
  const utterance = vi.fn(text => ({ text }) as SpeechSynthesisUtterance);
  const speech = createAgentSpeech({ synth: synth as unknown as SpeechSynthesis, utterance });
  return { synth, utterance, speech };
}
afterEach(() => vi.useRealTimers());
describe("agent speech output", () => {
  it.each(["te", "en", "ta", "kn", "ml", "hi", "or"])("speaks selected %s voice and finishes only after end", lang => {
    const { speech, synth, utterance } = setup([voice(`${lang}-IN`)]);
    const done = vi.fn(); speech.speak("answer", lang, 1, done);
    expect(synth.speak).toHaveBeenCalledTimes(1);
    const u = utterance.mock.results[0]?.value;
    expect(u?.lang).toBe(`${lang}-IN`);
    expect(done).not.toHaveBeenCalled();
    u?.onend?.({} as SpeechSynthesisEvent);
    expect(done).toHaveBeenCalledWith("done");
    speech.stop();
  });
  it("waits for asynchronously loaded voices", () => {
    const { speech, synth } = setup([]);
    speech.speak("answer", "te", 1, vi.fn());
    expect(synth.speak).not.toHaveBeenCalled();
    synth.getVoices.mockReturnValue([voice("te-IN")]);
    synth.dispatchEvent(new Event("voiceschanged"));
    expect(synth.speak).toHaveBeenCalledTimes(1); speech.stop();
  });
  it("reports missing language instead of using English", async () => {
    vi.useFakeTimers(); const { speech, synth } = setup([voice("en-IN")]); const done = vi.fn();
    speech.speak("తెలుగు", "te", 1, done); await vi.advanceTimersByTimeAsync(2000);
    expect(done).toHaveBeenCalledWith("unavailable"); expect(synth.speak).not.toHaveBeenCalled();
  });
  it("cancels old output and suppresses its late end", () => {
    const { speech, utterance, synth } = setup(); const old = vi.fn(); const next = vi.fn();
    speech.speak("old", "te", 1, old); const u = utterance.mock.results[0]?.value;
    speech.speak("new", "te", 1, next); u?.onend?.({} as SpeechSynthesisEvent);
    expect(old).not.toHaveBeenCalled(); expect(synth.speak).toHaveBeenCalledTimes(2); speech.stop();
  });
  it("native TTS completion controls audio priority", async () => {
    const native = { speak: vi.fn(async () => {}), stop: vi.fn(async () => {}), isLanguageSupported: vi.fn(async () => ({ supported: true })) };
    const speech = createAgentSpeech({ native, utterance: t => ({ text: t }) as SpeechSynthesisUtterance });
    const done = vi.fn(); speech.speak("answer", "hi", 1, done);
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    expect(native.speak).toHaveBeenCalledWith({ text: "answer", lang: "hi-IN", rate: 1 }); expect(done).toHaveBeenCalledWith("done"); speech.stop();
  });
});