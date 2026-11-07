import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Mic, MicOff, Pause, Play, Repeat, Send, Square, Volume2, VolumeX, Minus, Plus, X } from "lucide-react";
import { DICTS, pickLocalized, useI18n, type Lang } from "@/lib/i18n";
import { announcementsQuery, catKey, placesQuery, type Place } from "@/lib/places";
import { transportListQuery } from "@/lib/transport";
import { knowledgeQuery } from "@/lib/knowledge";
import { selectSpeechVoice } from "@/lib/browser-speech";
import { formatDistance, type LatLng } from "@/lib/geo";
import { fill, findKnowledge, findPlaces, hasCoords, localizedWithFlag, nameScore, nearestPlaces, parseIntent, type AgentIntent } from "@/lib/voice-agent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type State = "init" | "off" | "permission" | "listening" | "thinking" | "speaking" | "paused" | "unavailable" | "denied" | "errors";
type Prefs = { enabled?: boolean; denied?: boolean; muted?: boolean; rate?: number; glow?: boolean };
const PREF_KEY = "tg-voice-agent-v1";
const DISMISS_KEY = "tg-voice-agent-dismissed";
const MAX_ERRORS = 5;
const WATER: Record<Lang, string> = { en: "drinking water", te: "తాగునీరు", ta: "குடிநீர்", kn: "ಕುಡಿಯುವ ನೀರು", ml: "കുടിവെള്ളം", hi: "पीने का पानी", or: "ପାନୀୟ ଜଳ" };
const STATE_KEY = { init: "agentStateInit", off: "agentStateOff", permission: "agentStatePermission", listening: "agentStateListening", thinking: "agentStateThinking", speaking: "agentStateSpeaking", paused: "agentStatePaused", unavailable: "agentStateUnavailable", denied: "agentMicDenied", errors: "agentTooManyErrors" } as const;

type Rec = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; abort: () => void; onstart: (() => void) | null; onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null; onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null };
type RecCtor = new () => Rec;
const getCtor = () => { const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor }; return w.SpeechRecognition ?? w.webkitSpeechRecognition; };
const readPrefs = (): Prefs => { try { return JSON.parse(localStorage.getItem(PREF_KEY) ?? "{}") as Prefs; } catch { return {}; } };
const writePrefs = (p: Prefs) => { try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch { /* storage blocked: session only */ } };

/** One persistent, non-modal voice helper for every public page. Browser speech only; no audio is stored or sent by this app. */
export function VoiceAgent() {
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: s => s.location.pathname });
  // Fetched on demand (not during hydration) so live published data is used without disturbing page rendering.
  const qc = useQueryClient();
  const load = async <T,>(opts: { queryKey: readonly unknown[]; queryFn?: unknown }, fallback: T): Promise<T> => {
    try { return (await qc.fetchQuery({ ...(opts as object), staleTime: 60_000 } as Parameters<typeof qc.fetchQuery>[0])) as T; } catch { return fallback; }
  };

  const [state, setStateRaw] = useState<State>("init");
  const [open, setOpen] = useState(false);
  const [prefs, setPrefsState] = useState<Prefs>({});
  const [heard, setHeard] = useState("");
  const [interim, setInterim] = useState("");
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [typed, setTyped] = useState("");
  const [reducedMotion, setReducedMotion] = useState(false);

  const stateRef = useRef<State>("init");
  const setState = (s: State) => { stateRef.current = s; setStateRaw(s); };
  const prefsRef = useRef<Prefs>({});
  const langRef = useRef(lang); langRef.current = lang;
  const recRef = useRef<Rec | null>(null);
  const errorsRef = useRef(0);
  const pausedRef = useRef(false);
  const speakingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastReplyRef = useRef("");
  const choicesRef = useRef<Place[]>([]);
  const fixRef = useRef<LatLng | null>(null);
  const handleRef = useRef<(text: string) => void>(() => {});

  const setPrefs = (p: Prefs) => { prefsRef.current = p; setPrefsState(p); writePrefs(p); };

  const shouldListen = () => !!prefsRef.current.enabled && !prefsRef.current.denied && !pausedRef.current && !speakingRef.current && document.visibilityState === "visible" && !!getCtor() && stateRef.current !== "errors";

  const stopRec = () => { clearTimeout(timerRef.current); const r = recRef.current; recRef.current = null; if (r) { r.onend = null; r.onerror = null; r.onresult = null; try { r.abort(); } catch { /* already stopped */ } } };

  const startRec = useCallback(() => {
    clearTimeout(timerRef.current);
    if (recRef.current || !shouldListen()) return;
    const Ctor = getCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    recRef.current = rec;
    rec.lang = `${langRef.current}-IN`;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onstart = () => { if (!speakingRef.current) setState("listening"); };
    rec.onresult = e => {
      errorsRef.current = 0;
      let partial = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (!r) continue;
        if (r.isFinal) { setInterim(""); handleRef.current(r[0].transcript); } else partial += r[0].transcript;
      }
      if (partial) setInterim(partial);
    };
    rec.onerror = e => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setPrefs({ ...prefsRef.current, denied: true });
        setState("denied");
      } else if (e.error !== "no-speech" && e.error !== "aborted") errorsRef.current++;
    };
    rec.onend = () => {
      recRef.current = null;
      if (prefsRef.current.denied) return;
      if (errorsRef.current >= MAX_ERRORS) { pausedRef.current = true; setState("errors"); return; }
      if (!shouldListen()) { if (!speakingRef.current && stateRef.current === "listening") setState(pausedRef.current ? "paused" : "off"); return; }
      // Back off on errors so a failing service never spins in a tight loop.
      const delay = errorsRef.current ? Math.min(1000 * 2 ** errorsRef.current, 15_000) : 300;
      timerRef.current = setTimeout(startRec, delay);
    };
    try { rec.start(); if (stateRef.current !== "listening") setState("permission"); }
    catch { recRef.current = null; errorsRef.current++; }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const speak = useCallback((text: string) => {
    setReply(text);
    lastReplyRef.current = text;
    setNote("");
    const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    const done = () => {
      speakingRef.current = false;
      window.dispatchEvent(new CustomEvent("tg-agent-speaking", { detail: false }));
      if (shouldListen()) { setState("listening"); startRec(); }
      else if (stateRef.current === "speaking" || stateRef.current === "thinking") setState(pausedRef.current ? "paused" : prefsRef.current.enabled ? "listening" : "off");
    };
    if (!text || prefsRef.current.muted || !synth || typeof SpeechSynthesisUtterance !== "function") return done();
    const voice = selectSpeechVoice(synth.getVoices(), langRef.current);
    if (!voice) { setNote(t("agentNoVoice")); return done(); }
    synth.cancel();
    stopRec(); // Never listen to our own voice.
    speakingRef.current = true;
    setState("speaking");
    window.dispatchEvent(new CustomEvent("tg-agent-speaking", { detail: true }));
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice; u.lang = voice.lang; u.rate = prefsRef.current.rate ?? 1;
    let finished = false;
    const finish = () => { if (finished) return; finished = true; clearTimeout(guard); done(); };
    u.onend = finish; u.onerror = finish;
    const guard = setTimeout(finish, Math.max(10_000, text.length * 150));
    try { synth.resume(); synth.speak(u); } catch { finish(); }
  }, [t, startRec]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopSpeaking = () => { window.speechSynthesis?.cancel(); };

  const goMap = (d: { slug?: string; category?: string; action?: string }) => {
    if (window.innerWidth < 640) setOpen(false); // Reveal the map card on phones; the reply is still spoken.
    if (pathname === "/map") window.dispatchEvent(new CustomEvent("tg-agent-map", { detail: d }));
    else void navigate({ to: "/map", search: { place: d.slug, category: d.category, action: d.action } });
  };

  const getFix = () => new Promise<LatLng | null>(resolve => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(p => { fixRef.current = [p.coords.latitude, p.coords.longitude]; resolve(fixRef.current); }, () => resolve(null), { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 });
  });

  const describe = (p: Place) => {
    const name = pickLocalized(p.name, langRef.current);
    const desc = localizedWithFlag(p.description, langRef.current);
    const parts = [`${name} — ${t(catKey(p.category))}.`, desc.text ? `${desc.text}${desc.fallback ? ` ${t("agentOtherLang")}` : ""}` : t("agentNoDescription")];
    if (!hasCoords(p)) parts.push(fill(t("agentNoCoords"), { name }));
    goMap({ slug: p.slug });
    speak(parts.join(" "));
  };

  const openPlace = (p: Place) => {
    const name = pickLocalized(p.name, langRef.current);
    if (!hasCoords(p)) { goMap({ slug: p.slug }); return speak(fill(t("agentNoCoords"), { name })); }
    goMap({ slug: p.slug, action: "navigate" });
    speak(fill(t("agentOpening"), { name }));
  };

  const offerChoices = (options: Place[]) => {
    choicesRef.current = options;
    speak(fill(t("agentChoose"), { list: options.map((p, i) => `${i + 1}. ${pickLocalized(p.name, langRef.current)}`).join(", ") }));
  };

  const matchTransport = async (q: string) => (await load(transportListQuery(), [] as { slug: string; title: Record<string, string | undefined> }[])).map(c => ({ c, s: nameScore(q, [...Object.values(c.title), c.slug.replaceAll("-", " ")]) })).filter(x => x.s >= 0.6).sort((a, b) => b.s - a.s)[0]?.c;

  const run = async (intent: AgentIntent, raw: string) => {
    const list = await load(placesQuery(), [] as Place[]);
    switch (intent.kind) {
      case "stopSpeaking": stopSpeaking(); return;
      case "repeat": return speak(lastReplyRef.current || t("agentWelcome"));
      case "slower": case "faster": {
        const rate = Math.min(1.4, Math.max(0.6, (prefsRef.current.rate ?? 1) + (intent.kind === "slower" ? -0.15 : 0.15)));
        setPrefs({ ...prefsRef.current, rate: Math.round(rate * 100) / 100 });
        return speak(lastReplyRef.current || t("agentDone"));
      }
      case "pause": pausedRef.current = true; stopRec(); setState("paused"); return;
      case "help": return speak(t("agentHelp"));
      case "scrollDown": case "scrollUp":
        window.scrollBy({ top: (intent.kind === "scrollDown" ? 1 : -1) * window.innerHeight * 0.7, behavior: reducedMotion ? "auto" : "smooth" });
        return speak(t("agentDone"));
      case "back": window.history.back(); return speak(t("agentDone"));
      case "readPage": {
        const nodes = Array.from(document.querySelectorAll<HTMLElement>("main h1, main h2, main h3, main p, main li, [role=region] h2, [role=status]"))
          .filter(el => !el.closest("[data-voice-agent]") && el.offsetParent !== null);
        const text = nodes.map(n => n.innerText.trim()).filter(Boolean).join(". ").slice(0, 900);
        return speak(text || t("agentEmpty"));
      }
      case "announcement": {
        const items = (await load(announcementsQuery(), [] as { active: boolean; text: unknown }[])).filter(a => a.active).map(a => pickLocalized(a.text, langRef.current)).filter(Boolean);
        return speak(items.length ? items.join(". ") : t("agentNoAnnouncement"));
      }
      case "outside": return speak(t("agentOutside"));
      case "locate": goMap({ action: "location" }); return speak(t("agentDone"));
      case "nearbyAll": goMap({ action: "nearby" }); return speak(t("agentDone"));
      case "stopNav": goMap({ action: "stop" }); return speak(t("agentDone"));
      case "open": void navigate({ to: intent.page }); return speak(t("agentDone"));
      case "language": setLang(intent.language); setReply(DICTS[intent.language].agentDone); return;
      case "nearest": {
        const label = intent.category === "water" ? WATER[langRef.current] : t(catKey(intent.category));
        const first = nearestPlaces(intent.category, list, null);
        if (!first.mapped.length) return speak(fill(t("agentNoCategory"), { cat: label }));
        setState("thinking");
        const fix = await getFix();
        if (!fix) { if (intent.category !== "water") goMap({ category: intent.category }); return speak(fill(t("agentNoGps"), { cat: label })); }
        const best = nearestPlaces(intent.category, list, fix).mapped[0];
        if (!best || best.meters == null) return speak(fill(t("agentNoCategory"), { cat: label }));
        goMap({ slug: best.place.slug, action: "navigate" });
        return speak(fill(t("agentNearest"), { cat: label, name: pickLocalized(best.place.name, langRef.current), dist: formatDistance(best.meters) }));
      }
      case "navigate": case "info": {
        const r = findPlaces(intent.query, list);
        if (r.match) return intent.kind === "navigate" ? openPlace(r.match) : describe(r.match);
        if (r.options.length) return offerChoices(r.options);
        const tc = await matchTransport(intent.query);
        if (tc) { void navigate({ to: "/transport/$slug", params: { slug: tc.slug } }); return speak(fill(t("agentTransport"), { name: pickLocalized(tc.title, langRef.current) })); }
        if (intent.kind === "info") return run({ kind: "query", text: intent.query }, raw);
        return speak(fill(t("agentNoPlace"), { q: intent.query }));
      }
      case "query": {
        const k = findKnowledge(intent.text, await load(knowledgeQuery(), []));
        if (k) {
          const a = localizedWithFlag(k.answer, langRef.current);
          const extra = [a.fallback ? t("agentOtherLang") : "", k.source_label ? fill(t("agentSource"), { src: k.source_label }) : "", k.ttd_verified ? "" : t("agentUnverified")].filter(Boolean).join(" ");
          return speak(`${a.text} ${extra}`.trim());
        }
        const r = findPlaces(intent.text, list);
        if (r.match) return describe(r.match);
        if (r.options.length) return offerChoices(r.options);
        const tc = await matchTransport(intent.text);
        if (tc) { void navigate({ to: "/transport/$slug", params: { slug: tc.slug } }); return speak(fill(t("agentTransport"), { name: pickLocalized(tc.title, langRef.current) })); }
        return speak(t("agentNotUnderstood"));
      }
    }
  };

  handleRef.current = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setHeard(clean);
    if (choicesRef.current.length) {
      const options = choicesRef.current;
      choicesRef.current = [];
      const n = Number(clean.match(/\d+/)?.[0]);
      const pick = Number.isInteger(n) && options[n - 1] ? options[n - 1] : findPlaces(clean, options).match;
      if (pick) { openPlace(pick); return; }
    }
    const intent = parseIntent(clean);
    if (!intent) return;
    setState("thinking");
    void run(intent, clean).catch(() => speak(t("agentNotUnderstood")));
  };

  const enable = () => {
    pausedRef.current = false;
    errorsRef.current = 0;
    if (stateRef.current === "errors") setState("off");
    setPrefs({ ...prefsRef.current, enabled: true });
    if (!getCtor()) { setState("unavailable"); return speak(t("agentWelcome")); }
    // Speak within the tap so mobile browsers allow audio; listening resumes after speech ends.
    speak(t("agentWelcome"));
    if (!speakingRef.current) startRec();
  };
  const pause = () => { pausedRef.current = true; stopRec(); stopSpeaking(); setState("paused"); };
  const resume = () => { if (!prefsRef.current.enabled || stateRef.current === "errors") return enable(); pausedRef.current = false; errorsRef.current = 0; startRec(); };

  // Initial load: restore preferences; auto-start only when the microphone is already granted.
  useEffect(() => {
    const p = readPrefs();
    prefsRef.current = p; setPrefsState(p);
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    setReducedMotion(!!mq?.matches);
    const supported = !!getCtor();
    if (!supported) setState("unavailable");
    else if (p.denied) setState("denied");
    else setState("off");
    let dismissed = false;
    try { dismissed = sessionStorage.getItem(DISMISS_KEY) === "1"; } catch { /* ignore */ }
    if (!p.enabled && !p.denied && !dismissed) setOpen(true);
    let status: PermissionStatus | undefined;
    const onChange = () => {
      if (status?.state === "denied") { stopRec(); setPrefs({ ...prefsRef.current, denied: true }); setState("denied"); }
      else if (status?.state === "granted" && prefsRef.current.denied) { setPrefs({ ...prefsRef.current, denied: false }); setState("off"); }
    };
    if (supported && navigator.permissions?.query) {
      navigator.permissions.query({ name: "microphone" as PermissionName }).then(s => {
        status = s; s.addEventListener("change", onChange);
        if (s.state === "denied") { setPrefs({ ...prefsRef.current, denied: true }); setState("denied"); }
        else if (s.state === "granted") { if (prefsRef.current.denied) setPrefs({ ...prefsRef.current, denied: false }); if (prefsRef.current.enabled) startRec(); }
      }).catch(() => { /* permission API unsupported: wait for Enable */ });
    }
    const onVisibility = () => { if (document.visibilityState === "hidden") { stopRec(); window.speechSynthesis?.cancel(); } else startRec(); };
    const onOpen = () => { setOpen(true); if (stateRef.current === "off") enable(); };
    const onKey = (e: KeyboardEvent) => { if (e.altKey && e.key.toLowerCase() === "v") { e.preventDefault(); if (pausedRef.current || stateRef.current === "off" || stateRef.current === "errors") resume(); else pause(); } };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("tg-agent-open", onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      stopRec(); window.speechSynthesis?.cancel();
      status?.removeEventListener("change", onChange);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("tg-agent-open", onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Language change: recognition, voice and replies follow the site language.
  useEffect(() => {
    if (stateRef.current === "init") return;
    window.speechSynthesis?.cancel();
    if (recRef.current) { stopRec(); startRec(); }
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitTyped = (e: React.FormEvent) => { e.preventDefault(); const v = typed; setTyped(""); handleRef.current(v); };
  const active = state === "listening" || state === "speaking" || state === "thinking" || state === "permission";
  const glow = prefs.glow !== false && active;
  const isPaused = state === "paused" || state === "errors" || state === "off";
  const rate = prefs.rate ?? 1;
  const supported = state !== "unavailable";
  const showEnable = (state === "off" || state === "errors") && supported;

  return (
    <>
      {glow ? <div aria-hidden className={cn("agent-glow", (reducedMotion) && "agent-glow-still")} data-state={state} /> : null}
      <div data-voice-agent className="fixed left-3 z-[1250] print:hidden" style={{ bottom: "calc(var(--bottom-nav-height, 0px) + 0.75rem)" }}>
        {open ? (
          <section role="region" aria-label={t("agentName")} className="absolute bottom-16 left-0 max-h-[60svh] w-[min(22rem,calc(100vw-1.5rem))] space-y-3 overflow-y-auto rounded-xl bg-card p-3 text-sm text-card-foreground shadow-lift ring-1 ring-gold/50">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-primary">{t("agentName")}</h2>
                <p role="status" aria-live="polite" className="text-xs text-muted-foreground">{t(STATE_KEY[state])}</p>
              </div>
              <Button variant="ghost" size="icon" className="size-10 shrink-0" aria-label={t("close")} onClick={() => { setOpen(false); try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ } }}><X className="size-4" /></Button>
            </div>
            {showEnable ? (
              <div className="space-y-2 rounded-lg bg-secondary p-3">
                <p className="text-xs leading-relaxed">{t("agentEnableWhy")}</p>
                <div className="flex flex-wrap gap-2">
                  <Button className="min-h-11 flex-1" onClick={enable}><Mic className="size-4" />{t("agentEnable")}</Button>
                  {state === "off" ? <Button variant="outline" className="min-h-11" onClick={() => { setOpen(false); try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ } }}>{t("agentNotNow")}</Button> : null}
                </div>
              </div>
            ) : null}
            {(heard || interim) ? <p className="rounded-md bg-muted p-2"><span className="font-semibold">{t("agentYou")}: </span>{interim || heard}</p> : null}
            {reply ? <p aria-live="polite" className="rounded-md border-l-2 border-gold p-2 leading-relaxed">{reply}</p> : null}
            {note ? <p role="note" className="text-xs text-muted-foreground">{note}</p> : null}
            <div className="flex flex-wrap gap-2">
              {supported && state !== "denied" && state !== "off" ? (
                isPaused ? <Button variant="secondary" className="min-h-11" onClick={resume} aria-keyshortcuts="Alt+V"><Play className="size-4" />{t("agentResume")}</Button>
                  : <Button variant="secondary" className="min-h-11" onClick={pause} aria-keyshortcuts="Alt+V"><Pause className="size-4" />{t("agentPause")}</Button>
              ) : null}
              <Button variant="outline" size="icon" className="size-11" aria-pressed={!!prefs.muted} aria-label={prefs.muted ? t("agentUnmute") : t("agentMute")} title={prefs.muted ? t("agentUnmute") : t("agentMute")} onClick={() => { if (!prefs.muted) stopSpeaking(); setPrefs({ ...prefsRef.current, muted: !prefsRef.current.muted }); }}>{prefs.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}</Button>
              <Button variant="outline" size="icon" className="size-11" aria-label={t("agentRepeat")} title={t("agentRepeat")} disabled={!reply} onClick={() => speak(lastReplyRef.current)}><Repeat className="size-4" /></Button>
              <Button variant="outline" size="icon" className="size-11" aria-label={t("agentStop")} title={t("agentStop")} onClick={stopSpeaking}><Square className="size-4" /></Button>
              <Button variant="outline" size="icon" className="size-11" aria-label={t("agentSlower")} title={t("agentSlower")} disabled={rate <= 0.6} onClick={() => setPrefs({ ...prefsRef.current, rate: Math.max(0.6, Math.round((rate - 0.15) * 100) / 100) })}><Minus className="size-4" /></Button>
              <span className="self-center text-xs tabular-nums text-muted-foreground" aria-hidden>{rate.toFixed(2)}×</span>
              <Button variant="outline" size="icon" className="size-11" aria-label={t("agentFaster")} title={t("agentFaster")} disabled={rate >= 1.4} onClick={() => setPrefs({ ...prefsRef.current, rate: Math.min(1.4, Math.round((rate + 0.15) * 100) / 100) })}><Plus className="size-4" /></Button>
            </div>
            <label className="flex min-h-11 items-center justify-between gap-3 text-xs">
              {t("agentGlow")}
              <Switch checked={prefs.glow !== false} onCheckedChange={v => setPrefs({ ...prefsRef.current, glow: v })} />
            </label>
            <form onSubmit={submitTyped} className="flex gap-2">
              <Input value={typed} onChange={e => setTyped(e.target.value)} placeholder={t("agentTypeHere")} aria-label={t("agentTypeHere")} className="min-h-11 text-base" lang={lang} />
              <Button type="submit" size="icon" className="size-11 shrink-0" aria-label={t("agentSend")} disabled={!typed.trim()}><Send className="size-4" /></Button>
            </form>
          </section>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-label={`${t("agentName")}: ${t(STATE_KEY[state])}`}
          title={t(STATE_KEY[state])}
          className={cn("agent-orb relative grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lift ring-2 ring-gold/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring", glow && !reducedMotion && "agent-orb-active")}
          data-state={state}
        >
          {state === "denied" || state === "unavailable" ? <MicOff className="size-6" aria-hidden /> : state === "speaking" ? <Volume2 className="size-6" aria-hidden /> : isPaused ? <Mic className="size-6 opacity-70" aria-hidden /> : <Mic className="size-6" aria-hidden />}
          {state === "listening" ? <span aria-hidden className="absolute right-1 top-1 size-3 rounded-full bg-accent ring-2 ring-primary" /> : null}
        </button>
      </div>
    </>
  );
}
