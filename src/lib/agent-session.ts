import { normalize } from "./voice-agent";

/**
 * Command lifecycle for the voice helper: one final recognition result = one command.
 * - Duplicate final results (same result identity, or same text within a short window) are dropped.
 * - Every accepted command gets a new monotonically increasing id; older ids become stale,
 *   so late async replies from a superseded command are never spoken.
 * - Text heard right after (or while) the helper speaks that matches its own reply is treated as echo.
 */
export type CommandSource = "voice" | "typed";
export type CommandCtx = { id: number; text: string; isCurrent: () => boolean; say: (reply: string) => void };

export function createCommandGate(opts: { now?: () => number; dupWindowMs?: number; echoWindowMs?: number } = {}) {
  const now = opts.now ?? (() => Date.now());
  const dupWindow = opts.dupWindowMs ?? 2500;
  const echoWindow = opts.echoWindowMs ?? 2500;
  let seq = 0;
  let last = { text: "", at: -Infinity };
  const seenKeys = new Set<string>();
  let spoken = "";
  let speakingUntil = -Infinity; // Infinity while speaking; end time + window afterwards.
  let speaking = false;

  const isEcho = (text: string) => {
    if (!spoken) return false;
    if (!speaking && now() > speakingUntil) return false;
    const t = normalize(text);
    // Short choices/destinations are legitimate commands, not echoes merely because a reply mentioned them.
    return t === spoken || (t.length >= 20 && (spoken.includes(t) || t.includes(spoken)));
  };

  return {
    /** Returns a new command id, or null when the input must be ignored. */
    accept(text: string, source: CommandSource, resultKey?: string): number | null {
      const t = normalize(text);
      if (!t) return null;
      if (source === "voice") {
        if (resultKey) { if (seenKeys.has(resultKey)) return null; seenKeys.add(resultKey); if (seenKeys.size > 200) seenKeys.clear(); }
        if (speaking || isEcho(t)) return null;
        if (t === last.text && now() - last.at < dupWindow) return null;
      }
      last = { text: t, at: now() };
      return ++seq;
    },
    isCurrent: (id: number) => id === seq,
    /** Invalidate any in-flight command (user navigated, paused, closed). */
    invalidate: () => { seq++; },
    current: () => seq,
    speechStarted(reply: string) { spoken = normalize(reply); speaking = true; },
    speechEnded() { speaking = false; speakingUntil = now() + echoWindow; },
    get speaking() { return speaking; },
  };
}
export type CommandGate = ReturnType<typeof createCommandGate>;

/**
 * Runs commands through the gate. A new command cancels current speech first; replies are
 * spoken only while their command is still the newest.
 */
export function createDispatcher(deps: {
  gate: CommandGate;
  cancelSpeech: () => void;
  speak: (reply: string) => void;
  handle: (ctx: CommandCtx) => void | Promise<void>;
  onError?: (ctx: CommandCtx) => void;
}) {
  return (text: string, source: CommandSource, resultKey?: string) => {
    const id = deps.gate.accept(text, source, resultKey);
    if (id == null) return null;
    deps.cancelSpeech();
    const ctx: CommandCtx = {
      id, text: text.trim(),
      isCurrent: () => deps.gate.isCurrent(id),
      say: reply => { if (deps.gate.isCurrent(id) && reply) deps.speak(reply); },
    };
    void Promise.resolve().then(() => deps.handle(ctx)).catch(() => deps.onError?.(ctx));
    return id;
  };
}
