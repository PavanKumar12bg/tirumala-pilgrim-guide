import { describe, expect, it, vi } from "vitest";
import { checkMicrophone, SPEECH_LOCALES } from "./agent-microphone";
describe("microphone permission", () => {
  it.each(Object.entries({ te: "te-IN", en: "en-IN", ta: "ta-IN", kn: "kn-IN", ml: "ml-IN", hi: "hi-IN", or: "or-IN" }))("uses %s locale", (lang, locale) => expect(SPEECH_LOCALES[lang as keyof typeof SPEECH_LOCALES]).toBe(locale));
  it("requests on prompt and releases every temporary track", async () => {
    const stop = vi.fn(); const request = vi.fn(async () => ({ getTracks: () => [{ stop }, { stop }] }));
    expect(await checkMicrophone({ secure: true, query: async () => ({ state: "prompt" }), request })).toBe("granted");
    expect(request).toHaveBeenCalledTimes(1); expect(stop).toHaveBeenCalledTimes(2);
  });
  it("does not request permission again when granted", async () => {
    const request = vi.fn(); expect(await checkMicrophone({ secure: true, query: async () => ({ state: "granted" }), request })).toBe("granted"); expect(request).not.toHaveBeenCalled();
  });
  it("reports denied permission", async () => expect(await checkMicrophone({ secure: true, request: async () => { throw new DOMException("blocked", "NotAllowedError"); } })).toBe("denied"));
  it("reports missing microphone", async () => expect(await checkMicrophone({ secure: true, request: async () => { throw new DOMException("missing", "NotFoundError"); } })).toBe("unavailable"));
  it("reports unsupported media API", async () => expect(await checkMicrophone({ secure: true })).toBe("unavailable"));
  it("never requests on insecure HTTP", async () => { const request = vi.fn(); expect(await checkMicrophone({ secure: false, request })).toBe("insecure"); expect(request).not.toHaveBeenCalled(); });
});