import { describe, expect, it, vi } from "vitest";
import { COOKIE_PREFERENCE_KEY, readCookiePreference, saveCookiePreference } from "./cookie-preference";

describe("cookie preference storage", () => {
  it("remembers essential-only without upgrading consent", () => {
    const setItem = vi.fn();
    expect(saveCookiePreference({ setItem }, "essential")).toBe(true);
    expect(setItem).toHaveBeenCalledWith(COOKIE_PREFERENCE_KEY, "essential");
    expect(readCookiePreference({ getItem: () => "essential" })).toBe("essential");
  });
  it("does not treat invalid stored data as consent", () => {
    expect(readCookiePreference({ getItem: () => "yes" })).toBeNull();
  });
  it("handles unavailable storage without throwing", () => {
    expect(readCookiePreference({ getItem: () => { throw new Error("blocked"); } })).toBeNull();
    expect(saveCookiePreference({ setItem: () => { throw new Error("blocked"); } }, "all")).toBe(false);
  });
});