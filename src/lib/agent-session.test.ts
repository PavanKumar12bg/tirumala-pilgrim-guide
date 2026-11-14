import { describe, expect, it, vi } from "vitest";
import { createCommandGate, createDispatcher, type CommandCtx } from "./agent-session";
import { parseIntent, findFreeFood } from "./voice-agent";
import type { Place } from "./places";

const flush = () => new Promise(r => setTimeout(r, 0));
function setup(handle: (ctx: CommandCtx) => void | Promise<void>) {
  let clock = 0;
  const gate = createCommandGate({ now: () => clock });
  const spoken: string[] = [];
  const cancelSpeech = vi.fn();
  const dispatch = createDispatcher({ gate, cancelSpeech, speak: s => spoken.push(s), handle });
  return { gate, spoken, cancelSpeech, dispatch, tick: (ms: number) => { clock += ms; } };
}

describe("food / annasatram intent", () => {
  it.each(["అన్నసత్రం", "అన్న సత్రం", "అన్నదానం", "ఉచిత భోజనం", "ఉచిత అన్నదానం", "free food", "free meals", "annasatram", "annadanam", "అన్నసత్రం ఎక్కడ ఉంది?", "ఉచిత భోజనం ఎక్కడ దొరుకుతుంది?", "అన్నదానం చూపించు"])("%s → freeFood", q => {
    expect(parseIntent(q)).toEqual({ kind: "freeFood" });
  });
  it("finds only real listings that mention free meals", () => {
    const p = (slug: string, name: Record<string, string>) => ({ slug, name, description: {}, visible: true, category: "food" }) as unknown as Place;
    const list = [p("annaprasadam-bhavan", { en: "Vengamamba Annaprasada Bhavan", te: "వెంగమాంబ అన్నప్రసాద భవనం" }), p("laddu", { en: "Laddu Stalls" })];
    expect(findFreeFood(list).map(x => x.slug)).toEqual(["annaprasadam-bhavan"]);
    expect(findFreeFood([list[1]!])).toEqual([]);
  });
});

describe("page commands", () => {
  it.each([["మ్యాప్ ఓపెన్ చేయి", "/map"], ["మ్యాప్స్ ఓపెన్ చేయి", "/map"], ["ట్రాన్స్‌పోర్ట్ ఓపెన్ చేయి", "/transport"], ["ట్రాన్స్పోర్ట్ ఓపెన్ చేయి", "/transport"], ["open transport", "/transport"], ["open the map", "/map"]])("%s → %s", (q, page) => {
    expect(parseIntent(q)).toEqual({ kind: "open", page });
  });
});

describe("command lifecycle", () => {
  it("accepts a short destination and numbered choice mentioned in the preceding reply", () => {
    const gate = createCommandGate();
    gate.speechStarted("I found 1. Temple, 2. Hotel. Which one?"); gate.speechEnded();
    expect(gate.accept("temple", "voice", "1:0")).not.toBeNull();
    expect(gate.accept("2", "voice", "2:0")).not.toBeNull();
  });
  it("speaks an unknown-query fallback exactly once", async () => {
    const s = setup(ctx => ctx.say("FALLBACK"));
    s.dispatch("gibberish words", "voice", "1:0");
    await flush();
    s.dispatch("gibberish words", "voice", "1:0"); // re-delivered same result
    s.dispatch("gibberish words", "voice", "2:0"); // restart re-emits same text
    await flush();
    expect(s.spoken).toEqual(["FALLBACK"]);
  });
  it("runs duplicate final results only once", async () => {
    const handle = vi.fn();
    const s = setup(handle);
    s.dispatch("open map", "voice", "3:0");
    s.dispatch("open map", "voice", "3:0");
    s.tick(500);
    s.dispatch("open map", "voice", "4:0");
    await flush();
    expect(handle).toHaveBeenCalledTimes(1);
  });
  it("allows the same words again after the duplicate window", async () => {
    const handle = vi.fn();
    const s = setup(handle);
    s.dispatch("help", "voice", "1:0"); s.tick(5000); s.dispatch("help", "voice", "2:0");
    await flush();
    expect(handle).toHaveBeenCalledTimes(2);
  });
  it("a new command cancels speech and silences the stale async reply", async () => {
    let release!: () => void;
    const s = setup(async ctx => {
      if (ctx.text === "slow") { await new Promise<void>(r => { release = r; }); ctx.say("OLD"); }
      else ctx.say("NEW");
    });
    s.dispatch("slow", "voice", "1:0");
    await flush();
    s.dispatch("fresh", "voice", "2:0");
    await flush();
    release(); await flush();
    expect(s.cancelSpeech).toHaveBeenCalledTimes(2);
    expect(s.spoken).toEqual(["NEW"]);
  });
  it("ignores the helper's own speech as input", async () => {
    const handle = vi.fn();
    const s = setup(handle);
    s.gate.speechStarted("Sorry, I did not understand. Please say it another way");
    s.dispatch("sorry I did not understand", "voice", "1:0");
    s.gate.speechEnded(); s.tick(1000);
    s.dispatch("please say it another way", "voice", "2:0");
    s.tick(5000);
    s.dispatch("free food", "voice", "3:0");
    await flush();
    expect(handle).toHaveBeenCalledTimes(1);
    expect(handle.mock.calls[0]![0].text).toBe("free food");
  });
  it("navigation runs once and a route change invalidates the earlier reply", async () => {
    const nav = vi.fn();
    let release!: () => void;
    const s = setup(async ctx => {
      if (ctx.text === "unknown") { await new Promise<void>(r => { release = r; }); ctx.say("FALLBACK"); }
      else { nav(); ctx.say("Done."); }
    });
    s.dispatch("unknown", "voice", "1:0"); await flush();
    s.dispatch("open map", "voice", "2:0"); s.dispatch("open map", "voice", "2:0"); await flush();
    s.gate.invalidate(); // visitor navigated / route changed
    release(); await flush();
    expect(nav).toHaveBeenCalledTimes(1);
    expect(s.spoken).toEqual(["Done."]);
  });
  it("typed input always runs, even if identical", async () => {
    const handle = vi.fn();
    const s = setup(handle);
    s.dispatch("help", "typed"); s.dispatch("help", "typed");
    await flush();
    expect(handle).toHaveBeenCalledTimes(2);
  });
});
