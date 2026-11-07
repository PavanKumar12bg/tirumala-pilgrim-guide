import { expect, it } from "vitest";
import { validateAudioFile } from "./announcement-audio-file";
import { testWav } from "./announcement-audio-fixture";
it("accepts a complete PCM WAV", () => expect(() => validateAudioFile(testWav(), "audio/wav")).not.toThrow());
it("rejects truncated WAV samples", () => expect(() => validateAudioFile(testWav().slice(0, 1800), "audio/wav")).toThrow("Truncated WAV audio"));
it("rejects a WAV with an invalid sample format", () => {
  const bytes = testWav(); new DataView(bytes).setUint16(32, 0, true);
  expect(() => validateAudioFile(bytes, "audio/wav")).toThrow("no playable samples");
});