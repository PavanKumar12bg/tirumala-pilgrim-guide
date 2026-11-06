import { beforeEach, describe, expect, it, vi } from "vitest";
import { textHash, VOICE_LANGS } from "./voice-announcement";
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => { const chain = { middleware: () => chain, inputValidator: () => chain, handler: (fn: unknown) => fn }; return chain; } }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
const ai = vi.hoisted(() => ({ speak: vi.fn(), translate: vi.fn() }));
vi.mock("./voice-announcement.server", () => ({ speak: ai.speak, translateAll: ai.translate }));
import { createAndTranslate, deleteAnnouncement, generateVoice, publishAnnouncement } from "./voice-announcement.functions";
const id = "11111111-1111-4111-8111-111111111111";
const text = "Wait 6 hours";
type Op = { table: string; action: string; patch?: any; filters: Record<string, unknown> };
let ops: Op[], fail: (op: Op) => string | null, rows: any[], parent: any, storage: any;
function client() {
  return { rpc: vi.fn(async (name) => ({ data: true, error: null })), storage: { from: () => storage }, from: (table: string) => {
    const op: Op = { table, action: "select", filters: {} };
    const chain: any = {
      select: () => chain, eq: (k: string, v: unknown) => { op.filters[k] = v; return chain; },
      update: (patch: any) => { op.action = "update"; op.patch = patch; return chain; },
      delete: () => { op.action = "delete"; return chain; },
      upsert: (patch: any) => { op.action = "upsert"; op.patch = patch; return chain; },
      single: () => execute(true), maybeSingle: () => execute(true), then: (resolve: any, reject: any) => execute(false).then(resolve, reject),
    };
    async function execute(single: boolean) {
      ops.push(structuredClone(op));
      const message = fail(op); if (message) return { data: null, error: { message } };
      if (table === "voice_announcements") {
        if (op.action === "delete") { parent = null; rows = []; return { data: [{ id }], error: null }; }
        if (op.action === "update") Object.assign(parent, op.patch);
        if (op.filters.status === "retired") return { data: [], error: null };
        return { data: single ? parent : parent ? [parent] : [], error: null };
      }
      if (op.action === "upsert") {
        for (const patch of op.patch) { const row = rows.find((r) => r.lang === patch.lang); if (row) Object.assign(row, patch); else rows.push({ id: patch.lang, ...patch }); }
        return { data: op.patch, error: null };
      }
      const selected = rows.filter((row) => Object.entries(op.filters).every(([k,v]) => row[k] === v));
      if (op.action === "update") selected.forEach((r) => Object.assign(r, op.patch));
      return { data: single ? selected[0] ?? null : selected, error: null };
    }
    return chain;
  } };
}
async function invoke(fn: unknown, data: unknown, sb = client()) { return (fn as (input: any) => Promise<any>)({ data, context: { supabase: sb, userId: "admin" } }); }
beforeEach(() => {
  vi.clearAllMocks(); vi.spyOn(console, "error").mockImplementation(() => {});
  ops = []; fail = () => null; parent = { id, status: "draft", source_text: text, source_lang: "en" };
  rows = VOICE_LANGS.map((lang) => ({ id: lang, announcement_id: id, lang, text, text_hash: textHash(text), text_status: "ready", audio_status: "pending", audio_hash: null, audio_path: null, updated_at: "2020-01-01" }));
  storage = { list: vi.fn().mockResolvedValue({ data: [], error: null }), remove: vi.fn().mockResolvedValue({ error: null }), upload: vi.fn().mockResolvedValue({ data: { path: "file" }, error: null }), download: vi.fn().mockResolvedValue({ data: { size: 2048 }, error: null }) };
  ai.speak.mockResolvedValue({ bytes: new ArrayBuffer(2048), contentType: "audio/wav" });
  ai.translate.mockResolvedValue(Object.fromEntries(VOICE_LANGS.map((l) => [l, text])));
});
describe("checked announcement generation", () => {
  it.each(VOICE_LANGS)("saves matching ready audio for %s", async (lang) => {
    expect(await invoke(generateVoice, { id, lang })).toEqual({ ok: true });
    expect(rows.find((r) => r.lang === lang)).toMatchObject({ audio_status: "ready", audio_hash: textHash(text), audio_path: `${id}/${lang}-${textHash(text)}.wav` });
    expect(storage.download).toHaveBeenCalled();
  });
  it("reports missing translation rows instead of success", async () => {
    fail = (op) => op.action === "upsert" ? "write denied" : null;
    expect(await invoke(createAndTranslate, { text, sourceLang: "en", draftId: id })).toMatchObject({ ok: false, error: expect.stringContaining("write denied") });
    expect(ai.translate).not.toHaveBeenCalled();
  });
  it("surfaces a failed language save", async () => {
    fail = (op) => op.action === "update" && op.patch?.text_status === "ready" && op.filters.lang === "or" ? "save denied" : null;
    expect(await invoke(createAndTranslate, { text, sourceLang: "en", draftId: id })).toMatchObject({ ok: false, error: expect.stringContaining("save denied") });
    expect(rows.find((r) => r.lang === "or").text_status).toBe("failed");
    expect(rows.find((r) => r.lang === "te").text_status).toBe("ready");
  });
  it("invalidates changed audio and checks its cleanup", async () => {
    rows[0].text = "Old"; rows[0].audio_path = `${id}/old.wav`; rows[0].audio_hash = "old"; rows[0].audio_status = "ready";
    storage.remove.mockResolvedValue({ error: { message: "cleanup denied" } });
    expect(await invoke(createAndTranslate, { text, sourceLang: "en", draftId: id })).toMatchObject({ ok: false, error: expect.stringContaining("cleanup denied") });
    expect(rows[0]).toMatchObject({ audio_path: null, audio_hash: null, audio_status: "pending" });
  });
  it("retry preserves successful languages", async () => {
    rows[0].audio_status = "ready"; rows[0].audio_hash = rows[0].text_hash; rows[0].audio_path = `${id}/te.wav`;
    const before = structuredClone(rows[0]);
    expect(await invoke(createAndTranslate, { text, sourceLang: "en", draftId: id, retryLang: "or" })).toMatchObject({ ok: true });
    expect(rows[0]).toEqual(before);
  });
  it.each(["upload", "download"])("reports %s failure and retry only repairs that language", async (operation) => {
    storage[operation].mockResolvedValueOnce({ data: null, error: { message: "storage denied" } });
    expect(await invoke(generateVoice, { id, lang: "or" })).toMatchObject({ ok: false, error: expect.stringContaining("storage denied") });
    expect(rows[6].audio_status).toBe("failed");
    expect(await invoke(generateVoice, { id, lang: "or" })).toEqual({ ok: true });
    expect(rows[0].audio_status).toBe("pending");
  });
  it("reports provider failure without marking audio ready", async () => {
    ai.speak.mockRejectedValue(new Error("Provider denied"));
    expect(await invoke(generateVoice, { id, lang: "te" })).toMatchObject({ ok: false, error: "Provider denied" });
    expect(rows[0].audio_hash).toBeNull();
  });
  it("reports final write failure and removes the uncommitted object", async () => {
    fail = (op) => op.patch?.audio_status === "ready" ? "final save denied" : null;
    expect(await invoke(generateVoice, { id, lang: "te" })).toMatchObject({ ok: false, error: expect.stringContaining("final save denied") });
    expect(storage.remove).toHaveBeenCalledWith([`${id}/te-${textHash(text)}.wav`]);
  });
  it("does not overwrite text changed during synthesis", async () => {
    ai.speak.mockImplementation(async () => { rows[0].text = "New"; rows[0].text_hash = textHash("New"); rows[0].audio_status = "pending"; return { bytes: new ArrayBuffer(2048), contentType: "audio/wav" }; });
    expect(await invoke(generateVoice, { id, lang: "te" })).toMatchObject({ ok: false });
    expect(rows[0]).toMatchObject({ text: "New", audio_status: "pending" });
  });
});
describe("checked deletion", () => {
  it("confirms database cascade and folder cleanup", async () => {
    storage.list.mockResolvedValueOnce({ data: [{ name: "te.wav" }], error: null });
    expect(await invoke(deleteAnnouncement, { id })).toEqual({ ok: true });
    expect(parent).toBeNull(); expect(rows).toHaveLength(0);
    expect(storage.remove).toHaveBeenCalledWith([`${id}/te.wav`]);
  });
  it("does not delete when folder listing fails", async () => {
    storage.list.mockResolvedValue({ error: { message: "list denied" } });
    expect(await invoke(deleteAnnouncement, { id })).toMatchObject({ ok: false, deleted: false }); expect(parent).not.toBeNull();
  });
  it("reports database delete denial without removing files", async () => {
    fail = (op) => op.action === "delete" ? "delete denied" : null;
    expect(await invoke(deleteAnnouncement, { id })).toMatchObject({ ok: false, deleted: false }); expect(storage.remove).not.toHaveBeenCalled();
  });
  it("distinguishes deleted row from failed audio cleanup", async () => {
    storage.list.mockResolvedValueOnce({ data: [{ name: "te.wav" }], error: null });
    storage.remove.mockResolvedValue({ error: { message: "remove denied" } });
    expect(await invoke(deleteAnnouncement, { id })).toMatchObject({ ok: false, deleted: true, error: expect.stringContaining("cleanup failed") });
    expect(parent).toBeNull();
    expect(await invoke(deleteAnnouncement, { id })).toEqual({ ok: true });
  });
  it("confirms absence rather than relying on delete response", async () => {
    const sb = client(); const orig = sb.from;
    sb.from = ((table: string) => { const c = orig(table); if (table === "voice_announcements") c.delete = () => c; return c; }) as typeof sb.from;
    expect(await invoke(deleteAnnouncement, { id }, sb)).toMatchObject({ ok: false, error: "Announcement was not deleted" });
  });
  it("distinguishes publication success from retirement listing failure", async () => {
    rows.forEach((r) => { r.audio_status = "ready"; r.audio_path = `${id}/${r.lang}.wav`; r.audio_hash = r.text_hash; });
    fail = (op) => op.filters.status === "retired" ? "retirement read denied" : null;
    expect(await invoke(publishAnnouncement, { id })).toMatchObject({ ok: true, cleanupError: expect.stringContaining("retirement read denied") });
  });
});
