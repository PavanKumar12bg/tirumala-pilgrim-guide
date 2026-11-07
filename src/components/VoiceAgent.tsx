import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Mic, MicOff, Pause, Play, Repeat, Send, Square, Volume2, VolumeX, Minus, Plus, X } from "lucide-react";
import { DICTS, pickLocalized, useI18n, type Lang } from "@/lib/i18n";
import { announcementsQuery, catKey, placesQuery, type Place } from "@/lib/places";
import { transportListQuery } from "@/lib/transport";
import { knowledgeQuery } from "@/lib/knowledge";
import { blogPlainText, blogQuery, blogsQuery, searchBlogs, type Blog } from "@/lib/blogs";
import { createAgentSpeech } from "@/lib/agent-speech";
import { announcementAudio } from "@/lib/announcement-audio";
import { getPosition, nativeTextToSpeech } from "@/lib/platform";
import { formatDistance, type LatLng } from "@/lib/geo";
import { fill, findFreeFood, findKnowledge, findPlaces, hasCoords, localizedWithFlag, nameScore, nearestPlaces, parseIntent, type AgentIntent } from "@/lib/voice-agent";
import { createCommandGate, createDispatcher, type CommandCtx } from "@/lib/agent-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type State = "init" | "off" | "permission" | "listening" | "thinking" | "speaking" | "paused" | "unavailable" | "denied" | "errors";
type Prefs = { enabled?: boolean; denied?: boolean; muted?: boolean; rate?: number; glow?: boolean };
type Say = (text: string) => void;
const PREF_KEY = "tg-voice-agent-v1";
const MAX_ERRORS = 5;
const RESUME_AFTER_SPEECH_MS = 450;
const WATER: Record<Lang, string> = { en: "drinking water", te: "తాగునీరు", ta: "குடிநீர்", kn: "ಕುಡಿಯುವ ನೀರು", ml: "കുടിവെള്ളം", hi: "पीने का पानी", or: "ପାନୀୟ ଜଳ" };
const STATE_KEY = { init: "agentStateInit", off: "agentStateOff", permission: "agentStatePermission", listening: "agentStateListening", thinking: "agentStateThinking", speaking: "agentStateSpeaking", paused: "agentStatePaused", unavailable: "agentStateUnavailable", denied: "agentMicDenied", errors: "agentTooManyErrors" } as const;

type Rec = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; abort: () => void; onstart: (() => void) | null; onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null; onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null };
type RecCtor = new () => Rec;
const getCtor = () => { const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor }; return w.SpeechRecognition ?? w.webkitSpeechRecognition; };
const readPrefs = (): Prefs => { try { return JSON.parse(localStorage.getItem(PREF_KEY) ?? "{}") as Prefs; } catch { return {}; } };
const writePrefs = (p: Prefs) => { try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch { /* storage blocked: session only */ } };

/**
 * One persistent, compact voice helper for every page. Browser speech only; no audio is stored or sent by this app.
 * Each final recognition result is one command (see agent-session.ts); newer commands cancel older speech and replies.
 */
export function VoiceAgent() {
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: s => s.location.pathname });
  const qc = useQueryClient();
  const load = async <T,>(opts: { queryKey: readonly unknown[]; queryFn?: unknown }, fallback: T): Promise<T> => {
    try { return (await qc.fetchQuery({ ...(opts as object), staleTime: 60_000 } as Parameters<typeof qc.fetchQuery>[0])) as T; } catch { return fallback; }
  };

  const [state, setStateRaw] = useState<State>("init");
  const [open, setOpen] = useState(false);
  const [prefs, setPrefsState] = useState<Prefs>({});
  const [interim, setInterim] = useState("");
  const [reply, setReply] = useState("");
  const [history, setHistory] = useState<{ who: "you" | "agent"; text: string }[]>([]);
  const [note, setNote] = useState("");
  const [typed, setTyped] = useState("");
  const [reducedMotion, setReducedMotion] = useState(false);

  const stateRef = useRef<State>("init");
  const setState = (s: State) => { stateRef.current = s; setStateRaw(s); };
  const prefsRef = useRef<Prefs>({});
  const langRef = useRef(lang); langRef.current = lang;
  const recRef = useRef<Rec | null>(null);
  const sessionRef = useRef(0);
  const errorsRef = useRef(0);
  const pausedRef = useRef(false);
  const speakingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const utterRef = useRef(0);
  const speechRef = useRef<ReturnType<typeof createAgentSpeech> | null>(null);
  const lastReplyRef = useRef("");
  const choicesRef = useRef<Place[]>([]);
  const blogChoicesRef = useRef<Blog[]>([]);
  const agentNavRef = useRef(false);
  const gateRef = useRef(createCommandGate());
  const dispatchRef = useRef<ReturnType<typeof createDispatcher> | null>(null);

  const setPrefs = (p: Prefs) => { prefsRef.current = p; setPrefsState(p); writePrefs(p); };
  const log = (who: "you" | "agent", text: string) => setHistory(h => [...h.slice(-11), { who, text }]);

  const shouldListen = () => !!prefsRef.current.enabled && !prefsRef.current.denied && !pausedRef.current && !speakingRef.current && document.visibilityState === "visible" && !!getCtor() && stateRef.current !== "errors";

  const stopRec = () => { clearTimeout(timerRef.current); const r = recRef.current; recRef.current = null; if (r) { r.onend = null; r.onerror = null; r.onresult = null; r.onstart = null; try { r.abort(); } catch { /* already stopped */ } } };
  const settleIdle = () => { if (!speakingRef.current && (stateRef.current === "thinking" || stateRef.current === "speaking" || stateRef.current === "listening")) setState(pausedRef.current ? "paused" : prefsRef.current.enabled && getCtor() ? "listening" : "off"); };

  const startRec = useCallback(() => {
    clearTimeout(timerRef.current);
    if (recRef.current || !shouldListen()) return;
    const Ctor = getCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    const session = ++sessionRef.current;
    let consumed = false;
    recRef.current = rec;
    rec.lang = `${langRef.current}-IN`;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onstart = () => { if (!speakingRef.current && stateRef.current !== "thinking") setState("listening"); };
    rec.onresult = e => {
      if (consumed || speakingRef.current) return; // Never treat our own voice, or a re-delivered result, as a command.
      errorsRef.current = 0;
      let partial = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (!r) continue;
        if (r.isFinal) {
          // One final result = one command. End this session so Android cannot re-emit it cumulatively.
          consumed = true;
          setInterim("");
          stopRec();
          dispatchRef.current?.(r[0].transcript, "voice", `${session}:${i}`);
          return;
        }
        partial += r[0].transcript;
      }
      setInterim(partial);
    };
    rec.onerror = e => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setPrefs({ ...prefsRef.current, denied: true });
        setState("denied");
      } else if (e.error !== "no-speech" && e.error !== "aborted") errorsRef.current++;
    };
    rec.onend = () => {
      recRef.current = null;
      setInterim("");
      if (prefsRef.current.denied) return;
      if (errorsRef.current >= MAX_ERRORS) { pausedRef.current = true; setState("errors"); return; }
      if (!shouldListen()) { if (stateRef.current === "listening" || stateRef.current === "permission") setState(pausedRef.current ? "paused" : "off"); return; }
      const delay = errorsRef.current ? Math.min(1000 * 2 ** errorsRef.current, 15_000) : 300;
      timerRef.current = setTimeout(startRec, delay);
    };
    try { rec.start(); if (stateRef.current !== "listening" && stateRef.current !== "thinking") setState("permission"); }
    catch { recRef.current = null; errorsRef.current++; }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resumeSoon = () => { clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { if (shouldListen()) startRec(); }, RESUME_AFTER_SPEECH_MS); };

  /** Cancel any utterance in progress; its end callback is ignored. */
  const cancelSpeech = () => {
    utterRef.current++;
    const was = speakingRef.current;
    speakingRef.current = false;
    try { speechRef.current?.stop(); } catch { /* ignore */ }
    if (was) gateRef.current.speechEnded();
  };

  const speak = useCallback((text: string) => {
    cancelSpeech();
    const my = utterRef.current;
    setReply(text);
    if (text) { lastReplyRef.current = text; log("agent", text); }
    setNote("");
    const done = () => {
      if (my !== utterRef.current) return; // Superseded by a newer reply or command.
      speakingRef.current = false;
      gateRef.current.speechEnded();
      announcementAudio.setAgentActive(false);
      settleIdle();
      resumeSoon();
    };
    if (!text || prefsRef.current.muted) return done();
    stopRec(); // Never listen to our own voice.
    speakingRef.current = true;
    gateRef.current.speechStarted(text);
    setState("speaking");
    announcementAudio.setAgentActive(true);
    speechRef.current ??= createAgentSpeech({ synth: window.speechSynthesis, utterance: value => new SpeechSynthesisUtterance(value), native: nativeTextToSpeech() });
    speechRef.current.speak(text, langRef.current, prefsRef.current.rate ?? 1, result => {
      if (my !== utterRef.current) return;
      if (result !== "done") setNote(t("agentNoVoice"));
      done();
    });
  }, [t, startRec]); // eslint-disable-line react-hooks/exhaustive-deps

  const goTo = (to: string, opts: Record<string, unknown> = {}) => { agentNavRef.current = true; void navigate({ to, ...opts } as Parameters<typeof navigate>[0]); };
  const goMap = (d: { slug?: string; category?: string; action?: string }) => {
    if (window.innerWidth < 640) setOpen(false);
    if (pathname === "/map") window.dispatchEvent(new CustomEvent("tg-agent-map", { detail: d }));
    else goTo("/map", { search: { place: d.slug, category: d.category, action: d.action } });
  };

  const getFix = (): Promise<LatLng | null> => getPosition();

  const describe = (p: Place, say: Say) => {
    const name = pickLocalized(p.name, langRef.current);
    const desc = localizedWithFlag(p.description, langRef.current);
    const parts = [`${name} — ${t(catKey(p.category))}.`, desc.text ? `${desc.text}${desc.fallback ? ` ${t("agentOtherLang")}` : ""}` : t("agentNoDescription")];
    if (!hasCoords(p)) parts.push(fill(t("agentNoCoords"), { name }));
    goMap({ slug: p.slug });
    say(parts.join(" "));
  };
  const openPlace = (p: Place, say: Say) => {
    const name = pickLocalized(p.name, langRef.current);
    if (!hasCoords(p)) { goMap({ slug: p.slug }); return say(fill(t("agentNoCoords"), { name })); }
    goMap({ slug: p.slug, action: "navigate" });
    say(fill(t("agentOpening"), { name }));
  };
  const offerChoices = (options: Place[], say: Say) => {
    choicesRef.current = options;
    say(fill(t("agentChoose"), { list: options.map((p, i) => `${i + 1}. ${pickLocalized(p.name, langRef.current)}`).join(", ") }));
  };

  const matchTransport = async (q: string) => (await load(transportListQuery(), [] as { slug: string; title: Record<string, string | undefined> }[])).map(c => ({ c, s: nameScore(q, [...Object.values(c.title), c.slug.replaceAll("-", " ")]) })).filter(x => x.s >= 0.6).sort((a, b) => b.s - a.s)[0]?.c;

  const run = async (intent: AgentIntent, ctx: CommandCtx): Promise<void> => {
    const say = ctx.say;
    const list = await load(placesQuery(), [] as Place[]);
    if (!ctx.isCurrent()) return; // A newer command took over while data loaded.
    switch (intent.kind) {
      case "stopSpeaking": return;
      case "repeat": return say(lastReplyRef.current || t("agentWelcome"));
      case "slower": case "faster": {
        const rate = Math.min(1.4, Math.max(0.6, (prefsRef.current.rate ?? 1) + (intent.kind === "slower" ? -0.15 : 0.15)));
        setPrefs({ ...prefsRef.current, rate: Math.round(rate * 100) / 100 });
        return say(lastReplyRef.current || t("agentDone"));
      }
      case "pause": pausedRef.current = true; stopRec(); setState("paused"); return;
      case "help": return say(t("agentHelp"));
      case "scrollDown": case "scrollUp":
        window.scrollBy({ top: (intent.kind === "scrollDown" ? 1 : -1) * window.innerHeight * 0.7, behavior: reducedMotion ? "auto" : "smooth" });
        return say(t("agentDone"));
      case "back": agentNavRef.current = true; window.history.back(); return say(t("agentDone"));
      case "readPage": {
        const nodes = Array.from(document.querySelectorAll<HTMLElement>("main h1, main h2, main h3, main p, main li, [role=region] h2, [role=status]"))
          .filter(el => !el.closest("[data-voice-agent]") && el.offsetParent !== null);
        const text = nodes.map(n => n.innerText.trim()).filter(Boolean).join(". ").slice(0, 900);
        return say(text || t("agentEmpty"));
      }
      case "announcement": {
        const items = (await load(announcementsQuery(), [] as { active: boolean; text: unknown }[])).filter(a => a.active).map(a => pickLocalized(a.text, langRef.current)).filter(Boolean);
        return say(items.length ? items.join(". ") : t("agentNoAnnouncement"));
      }
      case "outside": return say(t("agentOutside"));
      case "locate": goMap({ action: "location" }); return say(t("agentDone"));
      case "nearbyAll": goMap({ action: "nearby" }); return say(t("agentDone"));
      case "stopNav": goMap({ action: "stop" }); return say(t("agentDone"));
      case "open": if (pathname !== intent.page) goTo(intent.page); return say(t("agentDone"));
      case "language": setLang(intent.language); langRef.current = intent.language; say(DICTS[intent.language].agentDone); return;
      case "blogsLatest": case "blogSearch": {
        const all = await load(blogsQuery(), [] as Blog[]);
        if (!ctx.isCurrent()) return;
        const found = (intent.kind === "blogSearch" ? searchBlogs(intent.query, all) : all).slice(0, 4);
        if (!found.length) { if (pathname !== "/blogs") goTo("/blogs"); return say(t("agentBlogsNone")); }
        if (found.length === 1) { goTo("/blogs/$slug", { params: { slug: found[0]!.slug } }); return say(fill(t("agentBlogOpening"), { name: found[0]!.title })); }
        blogChoicesRef.current = found;
        if (pathname !== "/blogs") goTo("/blogs");
        return say(fill(t(intent.kind === "blogsLatest" ? "agentBlogsLatest" : "agentBlogsFound"), { list: found.map((b, i) => `${i + 1}. ${b.title}`).join(", ") }));
      }
      case "readBlog": {
        const slug = pathname.startsWith("/blogs/") ? decodeURIComponent(pathname.slice(7)) : "";
        if (!slug) return run({ kind: "blogsLatest" }, ctx);
        const b = await load(blogQuery(slug), null as Blog | null);
        if (!ctx.isCurrent()) return;
        return say(b ? blogPlainText(b).slice(0, 3500) : t("agentBlogsNone"));
      }
      case "freeFood": {
        // Only real published listings; never an invented location.
        const found = findFreeFood(list);
        if (!found.length) return say(t("agentNoFreeFood"));
        if (found.length === 1) return describe(found[0]!, say);
        return offerChoices(found.slice(0, 4), say);
      }
      case "nearest": {
        const label = intent.category === "water" ? WATER[langRef.current] : t(catKey(intent.category));
        const first = nearestPlaces(intent.category, list, null);
        if (!first.mapped.length) return say(fill(t("agentNoCategory"), { cat: label }));
        const fix = await getFix();
        if (!ctx.isCurrent()) return;
        if (!fix) { if (intent.category !== "water") goMap({ category: intent.category }); return say(fill(t("agentNoGps"), { cat: label })); }
        const best = nearestPlaces(intent.category, list, fix).mapped[0];
        if (!best || best.meters == null) return say(fill(t("agentNoCategory"), { cat: label }));
        goMap({ slug: best.place.slug, action: "navigate" });
        return say(fill(t("agentNearest"), { cat: label, name: pickLocalized(best.place.name, langRef.current), dist: formatDistance(best.meters) }));
      }
      case "navigate": case "info": {
        const r = findPlaces(intent.query, list);
        if (r.match) return intent.kind === "navigate" ? openPlace(r.match, say) : describe(r.match, say);
        if (r.options.length) return offerChoices(r.options, say);
        const tc = await matchTransport(intent.query);
        if (!ctx.isCurrent()) return;
        if (tc) { goTo("/transport/$slug", { params: { slug: tc.slug } }); return say(fill(t("agentTransport"), { name: pickLocalized(tc.title, langRef.current) })); }
        if (intent.kind === "info") return run({ kind: "query", text: intent.query }, ctx);
        return say(fill(t("agentNoPlace"), { q: intent.query }));
      }
      case "query": {
        const k = findKnowledge(intent.text, await load(knowledgeQuery(), []));
        if (!ctx.isCurrent()) return;
        if (k) {
          const a = localizedWithFlag(k.answer, langRef.current);
          const extra = [a.fallback ? t("agentOtherLang") : "", k.source_label ? fill(t("agentSource"), { src: k.source_label }) : "", k.ttd_verified ? "" : t("agentUnverified")].filter(Boolean).join(" ");
          return say(`${a.text} ${extra}`.trim());
        }
        const r = findPlaces(intent.text, list);
        if (r.match) return describe(r.match, say);
        if (r.options.length) return offerChoices(r.options, say);
        const tc = await matchTransport(intent.text);
        if (!ctx.isCurrent()) return;
        if (tc) { goTo("/transport/$slug", { params: { slug: tc.slug } }); return say(fill(t("agentTransport"), { name: pickLocalized(tc.title, langRef.current) })); }
        return say(t("agentNotUnderstood")); // Spoken once; the helper then simply waits for the next command.
      }
    }
  };

  const handle = async (ctx: CommandCtx) => {
    const clean = ctx.text;
    log("you", clean);
    setState("thinking");
    try {
      if (blogChoicesRef.current.length) {
        const options = blogChoicesRef.current;
        blogChoicesRef.current = [];
        const n = Number(clean.match(/\d+/)?.[0]);
        const pick = Number.isInteger(n) ? options[n - 1] : searchBlogs(clean, options)[0];
        if (pick) { goTo("/blogs/$slug", { params: { slug: pick.slug } }); ctx.say(fill(t("agentBlogOpening"), { name: pick.title })); return; }
      }
      if (choicesRef.current.length) {
        const options = choicesRef.current;
        choicesRef.current = [];
        const n = Number(clean.match(/\d+/)?.[0]);
        const pick = Number.isInteger(n) && options[n - 1] ? options[n - 1] : findPlaces(clean, options).match;
        if (pick) { openPlace(pick, ctx.say); return; }
      }
      const intent = parseIntent(clean);
      if (!intent) return;
      await run(intent, ctx);
    } finally {
      if (ctx.isCurrent()) { settleIdle(); if (!speakingRef.current) { announcementAudio.setAgentActive(false); resumeSoon(); } }
    }
  };
  dispatchRef.current ??= createDispatcher({ gate: gateRef.current, cancelSpeech: () => { announcementAudio.setAgentActive(true); cancelSpeech(); }, speak: text => speakRef.current(text), handle: ctx => handleRef.current(ctx), onError: ctx => ctx.say(t("agentNotUnderstood")) });
  const speakRef = useRef(speak); speakRef.current = speak;
  const handleRef = useRef(handle); handleRef.current = handle;

  const enable = () => {
    pausedRef.current = false;
    errorsRef.current = 0;
    if (stateRef.current === "errors") setState("off");
    setPrefs({ ...prefsRef.current, enabled: true });
    if (!getCtor()) { setState("unavailable"); return speak(t("agentWelcome")); }
    // Speak within the tap so mobile browsers allow audio; listening starts after speech ends.
    speak(t("agentWelcome"));
    if (!speakingRef.current) startRec();
  };
  const pause = () => { pausedRef.current = true; gateRef.current.invalidate(); stopRec(); cancelSpeech(); announcementAudio.setAgentActive(false); setState("paused"); };
  const resume = () => { if (!prefsRef.current.enabled || stateRef.current === "errors") return enable(); pausedRef.current = false; errorsRef.current = 0; setState("listening"); startRec(); };
  const stopTalking = () => { gateRef.current.invalidate(); cancelSpeech(); announcementAudio.setAgentActive(false); settleIdle(); resumeSoon(); };

  // Initial load: restore preferences; auto-start only when the microphone is already granted. Never auto-open the panel.
  useEffect(() => {
    const p = readPrefs();
    prefsRef.current = p; setPrefsState(p);
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    setReducedMotion(!!mq?.matches);
    const supported = !!getCtor();
    if (!supported) setState("unavailable");
    else if (p.denied) setState("denied");
    else setState("off");
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
    // Hidden page: stop everything; visible again: listen only — never replay a previous reply.
    const onVisibility = () => { if (document.visibilityState === "hidden") { gateRef.current.invalidate(); stopRec(); cancelSpeech(); announcementAudio.setAgentActive(false); } else startRec(); };
    const onOpen = () => { setOpen(true); if (stateRef.current === "off") enable(); };
    const onKey = (e: KeyboardEvent) => { if (e.altKey && e.key.toLowerCase() === "v") { e.preventDefault(); if (pausedRef.current || stateRef.current === "off" || stateRef.current === "errors") resume(); else pause(); } };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("tg-agent-open", onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      stopRec(); cancelSpeech(); announcementAudio.setAgentActive(false);
      status?.removeEventListener("change", onChange);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("tg-agent-open", onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Route change by the visitor (not by the helper): drop any pending reply from the previous page.
  useEffect(() => {
    if (agentNavRef.current) { agentNavRef.current = false; return; }
    if (stateRef.current === "init") return;
    gateRef.current.invalidate();
    choicesRef.current = [];
    announcementAudio.setAgentActive(false);
    if (speakingRef.current) { cancelSpeech(); settleIdle(); resumeSoon(); }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Language change: recognition and voice follow the site language; nothing is replayed.
  useEffect(() => {
    if (stateRef.current === "init") return;
    gateRef.current.invalidate();
    cancelSpeech();
    announcementAudio.setAgentActive(false);
    if (recRef.current) { stopRec(); startRec(); }
    else { settleIdle(); resumeSoon(); }
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitTyped = (e: React.FormEvent) => { e.preventDefault(); const v = typed; setTyped(""); dispatchRef.current?.(v, "typed"); };
  const active = state === "listening" || state === "speaking" || state === "thinking" || state === "permission";
  const glow = prefs.glow !== false && active;
  const isPaused = state === "paused" || state === "errors" || state === "off";
  const rate = prefs.rate ?? 1;
  const supported = state !== "unavailable";
  const showEnable = (state === "off" || state === "errors") && supported;

  return (
    <div data-voice-agent className="fixed left-3 z-[1250] print:hidden" style={{ bottom: "calc(var(--bottom-nav-height, 0px) + 0.75rem)" }}>
      {open ? (
        <section role="dialog" aria-modal="false" aria-label={t("agentName")} className="absolute bottom-14 left-0 flex max-h-[34svh] w-[min(19rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-xl bg-card text-sm text-card-foreground shadow-lift ring-1 ring-gold/50">
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5">
            <p role="status" aria-live="polite" className="min-w-0 truncate text-xs font-medium text-primary">{t("agentName")} · <span className="font-normal text-muted-foreground">{t(STATE_KEY[state])}</span></p>
            <Button variant="ghost" size="icon" className="size-9 shrink-0" aria-label={t("close")} onClick={() => setOpen(false)}><X className="size-4" /></Button>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2">
            {showEnable ? (
              <div className="space-y-2">
                <p className="text-xs leading-snug text-muted-foreground">{t("agentMicNote")}</p>
                <Button size="sm" className="min-h-10 w-full" onClick={enable}><Mic className="size-4" />{t("agentEnable")}</Button>
              </div>
            ) : null}
            {interim ? <p className="truncate text-xs text-muted-foreground"><span className="font-semibold">{t("agentYou")}: </span>{interim}</p> : null}
            {reply ? <p aria-live="polite" className="line-clamp-3 border-l-2 border-gold pl-2 text-xs leading-snug">{reply}</p> : null}
            {note ? <p role="note" className="text-xs text-muted-foreground">{note}</p> : null}
            <div className="flex flex-wrap items-center gap-1.5">
              {supported && state !== "denied" && state !== "off" ? (
                isPaused ? <Button variant="secondary" size="sm" className="min-h-10" onClick={resume} aria-keyshortcuts="Alt+V"><Play className="size-4" />{t("agentResume")}</Button>
                  : <Button variant="secondary" size="icon" className="size-10" onClick={pause} aria-keyshortcuts="Alt+V" aria-label={t("agentPause")} title={t("agentPause")}><Pause className="size-4" /></Button>
              ) : null}
              <Button variant="outline" size="icon" className="size-10" aria-label={t("agentStop")} title={t("agentStop")} onClick={stopTalking}><Square className="size-4" /></Button>
              <Button variant="outline" size="icon" className="size-10" aria-label={t("agentRepeat")} title={t("agentRepeat")} disabled={!lastReplyRef.current} onClick={() => { gateRef.current.invalidate(); speak(lastReplyRef.current); }}><Repeat className="size-4" /></Button>
              <Button variant="outline" size="icon" className="size-10" aria-pressed={!!prefs.muted} aria-label={prefs.muted ? t("agentUnmute") : t("agentMute")} title={prefs.muted ? t("agentUnmute") : t("agentMute")} onClick={() => { if (!prefs.muted) stopTalking(); setPrefs({ ...prefsRef.current, muted: !prefsRef.current.muted }); }}>{prefs.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}</Button>
            </div>
            <form onSubmit={submitTyped} className="flex gap-1.5">
              <Input value={typed} onChange={e => setTyped(e.target.value)} placeholder={t("agentTypeHere")} aria-label={t("agentTypeHere")} className="h-10 text-base" lang={lang} />
              <Button type="submit" size="icon" className="size-10 shrink-0" aria-label={t("agentSend")} disabled={!typed.trim()}><Send className="size-4" /></Button>
            </form>
            {history.length ? (
              <details className="text-xs">
                <summary className="cursor-pointer py-1 text-muted-foreground">{t("agentHistory")}</summary>
                <ol className="space-y-1">
                  {history.map((h, i) => <li key={i} className={h.who === "you" ? "font-medium" : "text-muted-foreground"}>{h.who === "you" ? `${t("agentYou")}: ` : ""}{h.text}</li>)}
                </ol>
              </details>
            ) : null}
            <details className="text-xs">
              <summary className="cursor-pointer py-1 text-muted-foreground">{t("agentMore")}</summary>
              <div className="flex items-center gap-1.5 py-1">
                <Button variant="outline" size="icon" className="size-9" aria-label={t("agentSlower")} title={t("agentSlower")} disabled={rate <= 0.6} onClick={() => setPrefs({ ...prefsRef.current, rate: Math.max(0.6, Math.round((rate - 0.15) * 100) / 100) })}><Minus className="size-4" /></Button>
                <span className="tabular-nums text-muted-foreground" aria-hidden>{rate.toFixed(2)}×</span>
                <Button variant="outline" size="icon" className="size-9" aria-label={t("agentFaster")} title={t("agentFaster")} disabled={rate >= 1.4} onClick={() => setPrefs({ ...prefsRef.current, rate: Math.min(1.4, Math.round((rate + 0.15) * 100) / 100) })}><Plus className="size-4" /></Button>
              </div>
              <label className="flex min-h-9 items-center justify-between gap-3">
                {t("agentGlow")}
                <Switch checked={prefs.glow !== false} onCheckedChange={v => setPrefs({ ...prefsRef.current, glow: v })} />
              </label>
            </details>
          </div>
        </section>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-label={`${t("agentName")}: ${t(STATE_KEY[state])}`}
        title={t(STATE_KEY[state])}
        className={cn("agent-orb relative grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lift ring-2 ring-gold/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring", glow && !reducedMotion && "agent-orb-active", glow && reducedMotion && "ring-4 ring-gold")}
        data-state={state}
      >
        {state === "denied" || state === "unavailable" ? <MicOff className="size-5" aria-hidden /> : state === "speaking" ? <Volume2 className="size-5" aria-hidden /> : isPaused ? <Mic className="size-5 opacity-70" aria-hidden /> : <Mic className="size-5" aria-hidden />}
        {state === "listening" ? <span aria-hidden className="absolute right-0.5 top-0.5 size-2.5 rounded-full bg-accent ring-2 ring-primary" /> : null}
      </button>
    </div>
  );
}
