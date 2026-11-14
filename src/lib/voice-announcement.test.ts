import { describe, expect, it } from "vitest";
import { clipKey, numbersPreserved, repeatDelayMs, textHash, validateSource } from "./voice-announcement";

describe("voice announcement rules", () => {
  it("accepts a translation that keeps 6 hours and 7 compartments", () => {
    expect(numbersPreserved("Wait 6 hours, 7 compartments full", "నిరీక్షణ 6 గంటలు, 7 కంపార్ట్‌మెంట్లు")).toBe(true);
  });
  it("rejects a translation that changed a number", () => {
    expect(numbersPreserved("Wait 6 hours", "నిరీక్షణ 5 గంటలు")).toBe(false);
  });
  it("rejects a translation that dropped a number", () => {
    expect(numbersPreserved("Wait 3 hours, 4 compartments", "Wait 3 hours")).toBe(false);
  });
  it("repeats every 5 minutes when set to 5", () => {
    expect(repeatDelayMs({ repeat_enabled: true, repeat_minutes: 5 })).toBe(300_000);
  });
  it("does not repeat when repeat is off", () => {
    expect(repeatDelayMs({ repeat_enabled: false, repeat_minutes: 1 })).toBeNull();
  });
  it("a new announcement or language gives a different clip", () => {
    expect(clipKey("a", "te", "h")).not.toBe(clipKey("b", "te", "h"));
    expect(clipKey("a", "te", "h")).not.toBe(clipKey("a", "en", "h"));
  });
  it("text change changes the audio hash", () => {
    expect(textHash("6 hours")).not.toBe(textHash("3 hours"));
  });
  it("rejects empty and over-long text", () => {
    expect(() => validateSource("  ")).toThrow();
    expect(() => validateSource("x".repeat(1501))).toThrow();
  });
});
