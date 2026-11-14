import { describe, expect, it, vi } from "vitest";
import { createBackHandler } from "./android-back";

function setup(over: Partial<Parameters<typeof createBackHandler>[0]> = {}) {
  let t = 1000;
  const d = { pathname: () => "/", historyLength: () => 3, goBack: vi.fn(), goHome: vi.fn(), closeOverlay: () => false, showExitHint: vi.fn(), now: () => t, ...over };
  return { d, on: createBackHandler(d), tick: (ms: number) => { t += ms; } };
}

describe("android back", () => {
  it("first press on Home shows hint and stays; second within 2s exits", () => {
    const { d, on, tick } = setup();
    expect(on()).toBe(true); expect(d.showExitHint).toHaveBeenCalledTimes(1);
    tick(1500); expect(on()).toBe(false);
  });
  it("second press after the window only shows the hint again", () => {
    const { d, on, tick } = setup();
    on(); tick(2500); expect(on()).toBe(true); expect(d.showExitHint).toHaveBeenCalledTimes(2);
  });
  it("inner page goes back in history", () => {
    const { d, on } = setup({ pathname: () => "/map" });
    expect(on()).toBe(true); expect(d.goBack).toHaveBeenCalled(); expect(d.goHome).not.toHaveBeenCalled();
  });
  it("inner page with no history goes Home instead of exiting", () => {
    const { d, on } = setup({ pathname: () => "/map", historyLength: () => 1 });
    expect(on()).toBe(true); expect(d.goHome).toHaveBeenCalled(); expect(d.goBack).not.toHaveBeenCalled();
  });
  it("open dialog is closed first and nothing else happens", () => {
    const { d, on } = setup({ pathname: () => "/map", closeOverlay: () => true });
    expect(on()).toBe(true); expect(d.goBack).not.toHaveBeenCalled(); expect(d.showExitHint).not.toHaveBeenCalled();
  });
});
