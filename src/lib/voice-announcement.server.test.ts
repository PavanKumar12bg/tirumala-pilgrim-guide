import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ speech: vi.fn(), response: vi.fn() }));
vi.mock("@lovable.dev/ai-gateway", () => ({ generateSpeech: mocks.speech, generateResponse: mocks.response }));
import { speak } from "./voice-announcement.server";
import { VOICE_LANGS } from "./voice-announcement";
beforeEach(() => vi.clearAllMocks());
it.each(VOICE_LANGS)("accepts verified speech bytes for %s with the existing Google model", async (lang) => {
  mocks.speech.mockResolvedValue({ contentType: "audio/wav", blob: async () => ({ size: 2048, arrayBuffer: async () => new ArrayBuffer(2048) }) });
  expect((await speak("Test announcement", lang)).bytes.byteLength).toBe(2048);
  expect(mocks.speech.mock.calls[0][0].model).toBe("google/gemini-3.1-flash-tts-preview");
});
it("rejects non-audio provider responses", async () => {
  mocks.speech.mockResolvedValue({ contentType: "application/json", blob: async () => ({ size: 2048 }) });
  await expect(speak("Test", "te")).rejects.toThrow("Unsupported voice content type");
});
it("propagates provider denial without switching models", async () => {
  mocks.speech.mockRejectedValue(new Error("Provider access denied"));
  await expect(speak("Test", "or")).rejects.toThrow("Provider access denied");
  expect(mocks.speech).toHaveBeenCalledTimes(1);
});
