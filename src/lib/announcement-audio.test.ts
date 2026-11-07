import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAnnouncementAudio } from "./announcement-audio";

class FakeAudio extends EventTarget {
  paused = true;
  src = "";
  preload = "";
  currentTime = 0;
  play = vi.fn(async () => { this.paused = false; });
  pause = vi.fn(() => { this.paused = true; });
  removeAttribute() { this.src = ""; }
  getAttribute() { return this.src; }
  end() { this.paused = true; this.dispatchEvent(new Event("ended")); }
}
const settings = { autoplay_enabled: true, repeat_enabled: true, repeat_minutes: 1 };
function setup(saved: string | null = null) {
  const audio = new FakeAudio();
  const storage = { getItem: vi.fn(() => saved), setItem: vi.fn() };
  const owner = createAnnouncementAudio({ audio: () => audio as unknown as HTMLAudioElement, storage: () => storage });
  const recover = vi.fn();
  const unmount = owner.mount(recover);
  owner.setSettings(settings);
  return { audio, owner, storage, recover, unmount };
}
describe("background announcement lifecycle", () => {
  it("agent pauses immediately and resumes same element at saved playback position", async () => {
    const { owner, audio } = setup(); owner.setClip({ key: "a:te", url: "a.wav" }); await vi.advanceTimersByTimeAsync(0);
    audio.currentTime = 24; owner.setAgentActive(true);
    expect(audio.paused).toBe(true); expect(audio.play).toHaveBeenCalledTimes(1);
    owner.setAgentActive(true); owner.setAgentActive(false); await vi.advanceTimersByTimeAsync(0);
    expect(audio.currentTime).toBe(24); expect(audio.play).toHaveBeenCalledTimes(2);
  });
  it.each(["off", "deleted", "disabled"])("does not resume announcement after %s during agent response", async action => {
    const { owner, audio } = setup(); owner.setClip({ key: "a", url: "a.wav" }); await vi.advanceTimersByTimeAsync(0); owner.setAgentActive(true);
    if (action === "off") owner.setPreference("off");
    if (action === "deleted") owner.setClip(null);
    if (action === "disabled") owner.setSettings({ ...settings, autoplay_enabled: false });
    owner.setAgentActive(false); await vi.advanceTimersByTimeAsync(0); expect(audio.play).toHaveBeenCalledTimes(1);
  });
  it("replacement during agent speech never resumes retired audio", async () => {
    const { owner, audio } = setup(); owner.setClip({ key: "a", url: "a.wav" }); await vi.advanceTimersByTimeAsync(0);
    audio.currentTime = 24; owner.setAgentActive(true); owner.setClip({ key: "b", url: "b.wav" }); audio.currentTime = 0;
    expect(audio.play).toHaveBeenCalledTimes(1); owner.setAgentActive(false); await vi.advanceTimersByTimeAsync(0);
    expect(audio.src).toBe("b.wav"); expect(audio.currentTime).toBe(0);
  });
  it("scheduled repeat waits for agent completion without changing interval", async () => {
    const { owner, audio } = setup(); owner.setClip({ key: "a", url: "a.wav" }); await vi.advanceTimersByTimeAsync(0); audio.end(); owner.setAgentActive(true);
    await vi.advanceTimersByTimeAsync(59999); expect(audio.play).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1); expect(audio.play).toHaveBeenCalledTimes(1);
    owner.setAgentActive(false); await vi.advanceTimersByTimeAsync(0); expect(audio.play).toHaveBeenCalledTimes(2);
  });
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  it("honors persisted opt-out even when admin autoplay is on", () => {
    const { owner, audio } = setup("off");
    owner.setClip({ key: "a:te", url: "te.mp3" });
    expect(audio.play).not.toHaveBeenCalled();
  });
  it("attempts autoplay without overriding a browser denial, and enables from an explicit tap", async () => {
    const { owner, audio, storage } = setup();
    audio.play.mockRejectedValueOnce(new DOMException("Blocked", "NotAllowedError"));
    owner.setClip({ key: "a:te", url: "te.mp3" });
    await vi.advanceTimersByTimeAsync(0);
    expect(owner.snapshot().blocked).toBe(true);
    owner.setPreference("on");
    expect(audio.play).toHaveBeenCalledTimes(2);
    expect(storage.setItem).toHaveBeenCalledWith("tirumala-guide-voice-announcements", "on");
  });
  it.each([1, 3, 5, 10, 15])("repeats only after finishing plus the configured %i minute interval", async minutes => {
    const { owner, audio } = setup();
    owner.setSettings({ ...settings, repeat_minutes: minutes });
    owner.setClip({ key: "a:te", url: "te.mp3" });
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(minutes * 60_000);
    expect(audio.play).toHaveBeenCalledTimes(1); // Still speaking: no repeat.
    audio.end();
    await vi.advanceTimersByTimeAsync(minutes * 60_000 - 1);
    expect(audio.play).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(audio.play).toHaveBeenCalledTimes(2);
  });
  it("does not repeat with repeat disabled", async () => {
    const { owner, audio } = setup();
    owner.setSettings({ ...settings, repeat_enabled: false });
    owner.setClip({ key: "a:te", url: "te.mp3" });
    await vi.advanceTimersByTimeAsync(0);
    audio.end();
    await vi.advanceTimersByTimeAsync(900_000);
    expect(audio.play).toHaveBeenCalledTimes(1);
  });
  it.each(["te", "en", "hi", "ta", "kn", "ml", "or"])("loads only the selected %s clip and stops old audio", async lang => {
    const { owner, audio } = setup();
    owner.setClip({ key: "old", url: "old.mp3" });
    await vi.advanceTimersByTimeAsync(0);
    owner.setClip({ key: `new:${lang}`, url: `${lang}.mp3` });
    expect(audio.pause).toHaveBeenCalled();
    expect(audio.src).toBe(`${lang}.mp3`);
  });
  it("deletion stops playback and cancels scheduled repeats", async () => {
    const { owner, audio } = setup();
    owner.setClip({ key: "a:te", url: "te.mp3" });
    await vi.advanceTimersByTimeAsync(0);
    audio.end();
    owner.setClip(null);
    await vi.advanceTimersByTimeAsync(300_000);
    expect(audio.src).toBe("");
    expect(audio.paused).toBe(true);
    expect(audio.play).toHaveBeenCalledTimes(1);
  });
  it("pauses while hidden or voice assistant is open and stops when Home unmounts", async () => {
    const { owner, audio, unmount } = setup();
    owner.setClip({ key: "a:te", url: "te.mp3" });
    await vi.advanceTimersByTimeAsync(0);
    owner.setEnvironment(false, false);
    expect(audio.paused).toBe(true);
    owner.setEnvironment(true, true);
    expect(audio.play).toHaveBeenCalledTimes(1);
    owner.setEnvironment(true, false);
    await vi.advanceTimersByTimeAsync(0);
    expect(audio.play).toHaveBeenCalledTimes(2);
    unmount();
    expect(audio.src).toBe("");
    expect(audio.paused).toBe(true);
  });
  it("off cancels repeats and an admin disable prevents explicit enabling", async () => {
    const { owner, audio } = setup();
    owner.setClip({ key: "a:te", url: "te.mp3" });
    await vi.advanceTimersByTimeAsync(0);
    audio.end();
    owner.setPreference("off");
    await vi.advanceTimersByTimeAsync(60_000);
    owner.setSettings({ ...settings, autoplay_enabled: false });
    owner.setPreference("on");
    expect(audio.play).toHaveBeenCalledTimes(1);
  });
  it("does not interrupt identical clips or signed URL renewal", async () => {
    const { owner, audio } = setup();
    owner.setClip({ key: "a:te", url: "signed1" });
    await vi.advanceTimersByTimeAsync(0);
    const pauses = audio.pause.mock.calls.length;
    owner.setClip({ key: "a:te", url: "signed2" });
    expect(audio.pause).toHaveBeenCalledTimes(pauses);
    expect(audio.play).toHaveBeenCalledTimes(1);
  });
  it("ignores stale play rejection after replacement", async () => {
    const { owner, audio } = setup();
    let reject: ((reason: Error) => void) | undefined;
    audio.play.mockImplementationOnce(() => new Promise<void>((_, r) => { reject = r; }));
    owner.setClip({ key: "a", url: "a.mp3" });
    owner.setClip({ key: "b", url: "b.mp3" });
    reject?.(new DOMException("Old denial", "NotAllowedError"));
    await vi.advanceTimersByTimeAsync(0);
    expect(owner.snapshot().blocked).toBe(false);
    expect(audio.src).toBe("b.mp3");
  });
  it("explicit retry works after a persisted On preference is autoplay-blocked", async () => {
    const { owner, audio } = setup("on");
    audio.play.mockRejectedValueOnce(new DOMException("Blocked", "NotAllowedError"));
    owner.setClip({ key: "a", url: "a.wav" });
    await vi.advanceTimersByTimeAsync(0);
    owner.retry();
    expect(audio.play).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(0);
    expect(owner.snapshot().blocked).toBe(false);
  });
  it("retry cannot bypass sound opt-out or admin disable", () => {
    const { owner, audio } = setup("off");
    owner.setClip({ key: "a", url: "a.wav" });
    owner.retry();
    owner.setSettings({ ...settings, autoplay_enabled: false });
    owner.setPreference("on");
    owner.retry();
    expect(audio.play).not.toHaveBeenCalled();
  });
  it("Allow synchronously plays the pending clip once and persists consent only after success", async () => {
    const { owner, audio, storage } = setup();
    audio.play.mockRejectedValueOnce(new DOMException("Blocked", "NotAllowedError"));
    owner.setClip({ key: "a:te", url: "te.wav" });
    await vi.advanceTimersByTimeAsync(0);
    expect(owner.snapshot().blocked).toBe(true);
    owner.unlock();
    owner.unlock();
    expect(audio.play).toHaveBeenCalledTimes(2);
    expect(audio.src).toBe("te.wav");
    expect(storage.setItem).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(0);
    expect(storage.setItem).toHaveBeenCalledWith("tirumala-guide-voice-announcements", "on");
    expect(owner.snapshot().blocked).toBe(false);
    owner.setClip({ key: "b:te", url: "next.wav" });
    await vi.advanceTimersByTimeAsync(0);
    expect(owner.snapshot().blocked).toBe(false);
    expect(audio.play).toHaveBeenCalledTimes(3);
  });
  it.each(["te", "en", "hi", "ta", "kn", "ml", "or"])("Allow uses the newly selected %s clip, never the blocked old language", async lang => {
    const { owner, audio } = setup();
    audio.play.mockRejectedValue(new DOMException("Blocked", "NotAllowedError"));
    owner.setClip({ key: "a:old", url: "old.wav" });
    await vi.advanceTimersByTimeAsync(0);
    owner.setClip(null); // New language is still loading.
    owner.unlock();
    expect(audio.play).toHaveBeenCalledTimes(1);
    owner.setClip({ key: `a:${lang}`, url: `${lang}.wav` });
    await vi.advanceTimersByTimeAsync(0);
    audio.play.mockImplementation(async () => { audio.paused = false; });
    owner.unlock();
    expect(audio.src).toBe(`${lang}.wav`);
    expect(audio.play).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(0);
    expect(owner.snapshot().blocked).toBe(false);
  });
  it("ordinary autoplay success never requests permission or changes consent", async () => {
    const { owner, audio, storage } = setup();
    owner.setClip({ key: "a:te", url: "te.wav" });
    await vi.advanceTimersByTimeAsync(0);
    expect(owner.snapshot().blocked).toBe(false);
    owner.unlock();
    expect(audio.play).toHaveBeenCalledTimes(1);
    expect(storage.setItem).not.toHaveBeenCalled();
  });
  it("saved consent still permits recovery from a later genuine browser denial", async () => {
    const { owner, audio } = setup("on");
    owner.setClip({ key: "a", url: "a.wav" });
    await vi.advanceTimersByTimeAsync(0);
    audio.play.mockRejectedValueOnce(new DOMException("Blocked again", "NotAllowedError"));
    owner.setClip({ key: "b", url: "b.wav" });
    await vi.advanceTimersByTimeAsync(0);
    expect(owner.snapshot().blocked).toBe(true);
    owner.unlock();
    await vi.advanceTimersByTimeAsync(0);
    expect(owner.snapshot().blocked).toBe(false);
  });
  it("failed Allow retains the clip and prompt without persisting consent", async () => {
    const { owner, audio, storage } = setup();
    audio.play.mockRejectedValue(new DOMException("Blocked", "NotAllowedError"));
    owner.setClip({ key: "a", url: "a.wav" });
    await vi.advanceTimersByTimeAsync(0);
    owner.unlock();
    await vi.advanceTimersByTimeAsync(0);
    expect(owner.snapshot().blocked).toBe(true);
    expect(audio.src).toBe("a.wav");
    expect(storage.setItem).not.toHaveBeenCalled();
  });
  it("non-permission errors never request permission, including synchronous throws", async () => {
    const { owner, audio } = setup();
    audio.play.mockImplementationOnce(() => { throw new Error("Unavailable"); });
    owner.setClip({ key: "a", url: "a.wav" });
    await vi.advanceTimersByTimeAsync(0);
    expect(owner.snapshot().blocked).toBe(false);
    expect(owner.snapshot().failed).toBe(true);
  });
  it("admin disabling autoplay dismisses blocked recovery and prevents Allow playback", async () => {
    const { owner, audio } = setup();
    audio.play.mockRejectedValueOnce(new DOMException("Blocked", "NotAllowedError"));
    owner.setClip({ key: "a", url: "a.wav" });
    await vi.advanceTimersByTimeAsync(0);
    owner.setSettings({ ...settings, autoplay_enabled: false });
    owner.unlock();
    expect(owner.snapshot().blocked).toBe(false);
    expect(audio.play).toHaveBeenCalledTimes(1);
  });
});