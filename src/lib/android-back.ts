/**
 * Android back-button rules for the native shell.
 * Order: close an open dialog/sheet -> go back in app history (or to Home if there is no history)
 * -> on Home, the first press shows a hint and only a second press within the window exits the app.
 * Returns true when the press was handled (app stays open), false to let the app exit.
 */
export type BackDeps = {
  pathname: () => string;
  historyLength: () => number;
  goBack: () => void;
  goHome: () => void;
  closeOverlay: () => boolean;
  showExitHint: () => void;
  now?: () => number;
  windowMs?: number;
};

export function createBackHandler(deps: BackDeps) {
  let lastHomePress = -Infinity;
  const now = deps.now ?? (() => Date.now());
  const windowMs = deps.windowMs ?? 2000;
  return function onBack(): boolean {
    if (deps.closeOverlay()) return true;
    if (deps.pathname() !== "/") {
      if (deps.historyLength() > 1) deps.goBack(); else deps.goHome();
      return true;
    }
    const t = now();
    if (t - lastHomePress <= windowMs) return false;
    lastHomePress = t;
    deps.showExitHint();
    return true;
  };
}

/** Closes the top-most open Radix dialog/sheet/drawer by sending Escape; true if one was open. */
export function closeOpenOverlay(): boolean {
  if (typeof document === "undefined") return false;
  if (!document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]')) return false;
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));
  return true;
}
