/**
 * Platform capability layer. The website is the source of truth; inside the Capacitor Android app
 * native plugins are used only when they are actually installed (detected at runtime via the
 * Capacitor bridge on `window`). No Capacitor package is imported, so the web build is unaffected.
 */
type Listener = { remove: () => Promise<void> | void };
type Fn = (...args: unknown[]) => Promise<unknown>;
type Plugin = { getCurrentPosition?: Fn; exitApp?: Fn; setBackgroundColor?: Fn; setStyle?: Fn; hide?: Fn;
  speak?: Fn; stop?: Fn; isLanguageSupported?: Fn;
  addListener?: (event: string, cb: (e: unknown) => void) => Promise<Listener> | Listener;
};
type Bridge = { isNativePlatform?: () => boolean; getPlatform?: () => string; Plugins?: Record<string, Plugin | undefined> };

const bridge = (): Bridge | undefined => (typeof window === "undefined" ? undefined : (window as unknown as { Capacitor?: Bridge }).Capacitor);
export const isNativeApp = () => !!bridge()?.isNativePlatform?.();
export const platformName = (): "android" | "ios" | "web" => (isNativeApp() ? ((bridge()?.getPlatform?.() as "android" | "ios") ?? "android") : "web");
const plugin = (name: string): Plugin | undefined => (isNativeApp() ? bridge()?.Plugins?.[name] : undefined);
export function nativeTextToSpeech() {
  const p = plugin("TextToSpeech");
  if (!p?.speak || !p.stop || !p.isLanguageSupported) return undefined;
  return {
    speak: (options: { text: string; lang: string; rate: number }) => p.speak?.(options) ?? Promise.reject(new Error("TTS unavailable")),
    stop: () => p.stop?.() ?? Promise.resolve(),
    isLanguageSupported: async (options: { lang: string }) => await p.isLanguageSupported?.(options) as { supported: boolean },
  };
}

export type Capabilities = {
  native: boolean;
  /** Browser Web Speech API or a native speech-recognition plugin. */
  speechRecognition: "native" | "browser" | "none";
  textToSpeech: "native" | "browser" | "none";
  geolocation: "native" | "browser" | "none";
  notifications: "native" | "browser" | "none";
  /** Never true today: background listening needs a native foreground service that is not built yet. */
  backgroundListening: false;
};

export function getCapabilities(): Capabilities {
  const w = typeof window === "undefined" ? undefined : (window as unknown as Record<string, unknown>);
  const native = isNativeApp();
  return {
    native,
    speechRecognition: plugin("SpeechRecognition") ? "native" : w && (w["SpeechRecognition"] || w["webkitSpeechRecognition"]) ? "browser" : "none",
    textToSpeech: plugin("TextToSpeech") ? "native" : w && "speechSynthesis" in w ? "browser" : "none",
    geolocation: plugin("Geolocation") ? "native" : typeof navigator !== "undefined" && "geolocation" in navigator ? "browser" : "none",
    notifications: plugin("LocalNotifications") ? "native" : w && "Notification" in w ? "browser" : "none",
    backgroundListening: false,
  };
}

/** Current position from the native plugin when installed, else the browser API. */
export async function getPosition(opts: { timeout?: number } = {}): Promise<[number, number] | null> {
  const geo = plugin("Geolocation");
  if (geo?.getCurrentPosition) {
    try {
      const p = (await geo.getCurrentPosition({ enableHighAccuracy: true, timeout: opts.timeout ?? 12_000 })) as { coords: { latitude: number; longitude: number } };
      return [p.coords.latitude, p.coords.longitude];
    } catch { return null; }
  }
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) return null;
  return new Promise(resolve => navigator.geolocation.getCurrentPosition(p => resolve([p.coords.latitude, p.coords.longitude]), () => resolve(null), { enableHighAccuracy: true, timeout: opts.timeout ?? 12_000, maximumAge: 30_000 }));
}

/**
 * Native shell wiring: Android back button, app pause/resume, status bar and splash screen.
 * Each step is skipped when its plugin is not installed. Returns a cleanup function.
 */
export function initNativeShell(opts: { onBack: () => boolean; onResume?: () => void; onPause?: () => void; statusBarColor: string }) {
  if (!isNativeApp()) return () => {};
  const subs: Promise<Listener | undefined>[] = [];
  const app = plugin("App");
  const listen = (event: string, cb: (e: unknown) => void) => subs.push(Promise.resolve(app?.addListener?.(event, cb)));
  listen("backButton", () => { if (!opts.onBack()) void app?.exitApp?.(); });
  listen("resume", () => opts.onResume?.());
  listen("pause", () => opts.onPause?.());
  const bar = plugin("StatusBar");
  void bar?.setBackgroundColor?.({ color: opts.statusBarColor }).catch(() => {});
  void bar?.setStyle?.({ style: "DARK" }).catch(() => {});
  void plugin("SplashScreen")?.hide?.().catch(() => {});
  document.documentElement.dataset["native"] = platformName();
  return () => { subs.forEach(p => void p.then(l => l?.remove())); };
}
