import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AUDIO_BUCKET, numbersPreserved, textHash, validateSource, VOICE_LANGS, type VoiceLang } from "./voice-announcement";

type Client = SupabaseClient<Database>;
export type VoiceResult = { ok: true; id?: string; cleanupError?: string } | { ok: false; error: string; id?: string; deleted?: boolean };

function failure(e: unknown): string {
  console.error("voice announcement operation failed", e);
  const name = e instanceof Error ? e.name : "";
  if (name === "PaymentRequiredError") return "AI credits are used up. Add credits in Settings → Plans & credits.";
  // Unknown outcomes must not be automatically replayed.
  return e instanceof Error ? e.message.slice(0, 400) : "Announcement operation failed";
}
function check(error: { message: string } | null, step: string) {
  if (error) throw new Error(`${step}: ${error.message}`);
}
async function assertAdmin(ctx: { supabase: Client; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  check(error, "Check administrator access");
  if (!data) throw new Error("Only administrators can manage announcements.");
}
function validId(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error("Invalid announcement ID");
  return id;
}
async function filesFor(sb: Client, id: string): Promise<string[]> {
  const paths: string[] = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await sb.storage.from(AUDIO_BUCKET).list(id, { limit: 100, offset });
    check(error, "List announcement audio");
    const rows = data ?? [];
    paths.push(...rows.map((f) => `${id}/${f.name}`));
    if (rows.length < 100) return paths;
  }
}
async function removeFiles(sb: Client, paths: string[]) {
  if (!paths.length) return;
  const { error } = await sb.storage.from(AUDIO_BUCKET).remove(paths);
  check(error, "Remove announcement audio");
}
async function verifyAudio(sb: Client, path: string) {
  const { data, error } = await sb.storage.from(AUDIO_BUCKET).download(path);
  check(error, "Verify stored audio");
  if (!data || data.size < 1000) throw new Error("Stored audio is missing or empty");
}

/** Delete only the selected announcement. Keep the folder recoverable if cleanup fails. */
async function removeAnnouncement(sb: Client, id: string): Promise<VoiceResult> {
  let deleted = false;
  try {
    const paths = await filesFor(sb, id);
    const result = await sb.from("voice_announcements").delete().eq("id", id).select("id");
    check(result.error, "Delete announcement");
    const remaining = await sb.from("voice_announcements").select("id").eq("id", id).maybeSingle();
    check(remaining.error, "Confirm announcement deletion");
    if (remaining.data) throw new Error("Announcement was not deleted");
    const children = await sb.from("voice_announcement_langs").select("id").eq("announcement_id", id);
    check(children.error, "Confirm language deletion");
    if (children.data?.length) throw new Error("Announcement language rows were not deleted");
    deleted = true;
    await removeFiles(sb, paths);
    if ((await filesFor(sb, id)).length) throw new Error("Audio objects remain in the announcement folder");
    return { ok: true };
  } catch (e) {
    return { ok: false, deleted, error: `${deleted ? `Announcement deleted; audio cleanup failed (${id}): ` : ""}${failure(e)}` };
  }
}

/** Translate a draft; retryLang preserves successful languages and their audio. */
export const createAndTranslate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { text: string; sourceLang?: string; draftId?: string; retryLang?: VoiceLang }) => ({
    text: validateSource(d?.text),
    sourceLang: (VOICE_LANGS as readonly string[]).includes(d?.sourceLang ?? "") ? (d.sourceLang as VoiceLang) : "te",
    draftId: d?.draftId ? validId(d.draftId) : undefined,
    retryLang: d?.retryLang && VOICE_LANGS.includes(d.retryLang) ? d.retryLang : undefined,
  }))
  .handler(async ({ data, context }): Promise<VoiceResult> => {
    await assertAdmin(context);
    const sb = context.supabase;
    let id = data.draftId;
    try {
      if (id) {
        const draft = await sb.from("voice_announcements").select("source_text,source_lang").eq("id", id).eq("status", "draft").single();
        check(draft.error, "Read draft");
        if (data.retryLang && (draft.data?.source_text !== data.text || draft.data.source_lang !== data.sourceLang)) throw new Error("Retry must use the saved draft text and language");
        const updated = await sb.from("voice_announcements").update({ source_text: data.text, source_lang: data.sourceLang }).eq("id", id).eq("status", "draft").select("id").single();
        check(updated.error, "Update draft");
        if (!updated.data) throw new Error("Draft was not updated");
      } else {
        const olds = await sb.from("voice_announcements").select("id").eq("status", "draft");
        check(olds.error, "Read older drafts");
        for (const old of olds.data ?? []) {
          const removed = await removeAnnouncement(sb, old.id);
          if (!removed.ok) throw new Error(removed.error);
        }
        const row = await sb.from("voice_announcements").insert({ source_text: data.text, source_lang: data.sourceLang, created_by: context.userId }).select("id").single();
        check(row.error, "Create draft");
        if (!row.data) throw new Error("Draft was not created");
        id = row.data.id;
      }
      const langs = data.retryLang ? [data.retryLang] : [...VOICE_LANGS];
      const oldRows = await sb.from("voice_announcement_langs").select("*").eq("announcement_id", id);
      check(oldRows.error, "Read draft languages");
      const started = await sb.from("voice_announcement_langs").upsert(langs.map((lang) => ({ announcement_id: id as string, lang, text_status: "working", error: null })), { onConflict: "announcement_id,lang" }).select("lang");
      check(started.error, "Prepare translation rows");
      if (started.data?.length !== langs.length) throw new Error("Translation rows were not created");
      const { translateAll } = await import("./voice-announcement.server");
      const tr = await translateAll(data.text);
      tr[data.sourceLang] = data.text;
      const errors: string[] = [];
      for (const lang of langs) {
        try {
          const text = tr[lang];
          const hash = text ? textHash(text) : null;
          const good = !!text && numbersPreserved(data.text, text);
          const old = oldRows.data?.find((r) => r.lang === lang);
          const changed = !good || old?.text !== text || old.text_hash !== hash;
          const msg = good ? null : text ? "A number changed or went missing in translation. Press Retry." : "No translation returned";
          const saved = await sb.from("voice_announcement_langs").update({
            text: text || null, text_hash: hash, text_status: good ? "ready" : "failed", error: msg,
            ...(changed ? { audio_status: "pending", audio_path: null, audio_hash: null } : {}),
          }).eq("announcement_id", id).eq("lang", lang).select("id").single();
          check(saved.error, `Save ${lang} translation`);
          if (!saved.data) throw new Error(`Missing ${lang} translation row`);
          if (changed && old?.audio_path) await removeFiles(sb, [old.audio_path]);
          if (!good) errors.push(`${lang}: ${msg}`);
        } catch (e) { errors.push(`${lang}: ${failure(e)}`); }
      }
      return errors.length ? { ok: false, id, error: errors.join("; ") } : { ok: true, id };
    } catch (e) {
      let msg = failure(e);
      if (id) {
        let update = sb.from("voice_announcement_langs").update({ text_status: "failed", audio_status: "pending", error: msg }).eq("announcement_id", id);
        if (data.retryLang) update = update.eq("lang", data.retryLang);
        const recorded = await update;
        if (recorded.error) msg += `; Save failure status: ${recorded.error.message}`;
      }
      return { ok: false, id, error: msg };
    }
  });

export const generateVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; lang: string }) => {
    validId(d?.id);
    if (!(VOICE_LANGS as readonly string[]).includes(d?.lang)) throw new Error("Invalid language");
    return { id: d.id, lang: d.lang as VoiceLang };
  })
  .handler(async ({ data, context }): Promise<VoiceResult> => {
    await assertAdmin(context);
    const sb = context.supabase;
    let rowId: string | undefined;
    let hash: string | null = null;
    try {
      const parent = await sb.from("voice_announcements").select("status").eq("id", data.id).single();
      check(parent.error, "Read announcement");
      if (parent.data?.status !== "draft") throw new Error("Only draft voices can be generated");
      const read = await sb.from("voice_announcement_langs").select("*").eq("announcement_id", data.id).eq("lang", data.lang).single();
      check(read.error, "Read translation");
      const row = read.data;
      if (!row || row.text_status !== "ready" || !row.text || row.text_hash !== textHash(row.text)) throw new Error("Translation is not ready");
      rowId = row.id; hash = row.text_hash;
      if (row.audio_status === "ready" && row.audio_hash === hash && row.audio_path) {
        try { await verifyAudio(sb, row.audio_path); return { ok: true }; } catch { /* Explicit retry repairs a missing object. */ }
      }
      if (row.audio_status === "working" && Date.now() - new Date(row.updated_at).getTime() < 90_000) throw new Error("Already generating");
      const claim = await sb.from("voice_announcement_langs").update({ audio_status: "working", audio_hash: null, error: null }).eq("id", row.id).eq("text_hash", hash).eq("updated_at", row.updated_at).eq("text_status", "ready").select("id").single();
      check(claim.error, "Start voice generation");
      if (!claim.data) throw new Error("Translation changed or generation is already running");
      const { speak } = await import("./voice-announcement.server");
      const audio = await speak(row.text, data.lang);
      const ext = audio.contentType.includes("mpeg") ? "mp3" : audio.contentType.includes("ogg") ? "ogg" : "wav";
      const path = `${data.id}/${data.lang}-${hash}.${ext}`;
      const upload = await sb.storage.from(AUDIO_BUCKET).upload(path, new Blob([audio.bytes], { type: audio.contentType }), { upsert: true, contentType: audio.contentType, cacheControl: "31536000" });
      check(upload.error, "Upload voice audio");
      await verifyAudio(sb, path);
      if (row.audio_path && row.audio_path !== path) await removeFiles(sb, [row.audio_path]);
      const saved = await sb.from("voice_announcement_langs").update({ audio_status: "ready", audio_path: path, audio_hash: hash, error: null }).eq("id", row.id).eq("text_hash", hash).eq("text", row.text).eq("text_status", "ready").eq("audio_status", "working").select("audio_path,audio_hash,text_hash,audio_status").single();
      if (saved.error || saved.data?.audio_hash !== hash || saved.data.text_hash !== hash || saved.data.audio_path !== path || saved.data.audio_status !== "ready") {
        await removeFiles(sb, [path]);
        check(saved.error, "Save generated voice");
        throw new Error("Translation changed while generating; voice was not marked ready");
      }
      console.info("voice announcement audio verified", { id: data.id, lang: data.lang, path, contentType: audio.contentType, bytes: audio.bytes.byteLength });
      return { ok: true };
    } catch (e) {
      let msg = failure(e);
      if (rowId && hash) {
        const recorded = await sb.from("voice_announcement_langs").update({ audio_status: "failed", audio_hash: null, error: msg }).eq("id", rowId).eq("text_hash", hash);
        if (recorded.error) msg += `; Save failure status: ${recorded.error.message}`;
      }
      return { ok: false, error: msg };
    }
  });

export const publishAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: validId(d?.id) }))
  .handler(async ({ data, context }): Promise<VoiceResult> => {
    await assertAdmin(context);
    const sb = context.supabase;
    try {
      const rows = await sb.from("voice_announcement_langs").select("lang,text,text_status,audio_status,audio_path,audio_hash,text_hash").eq("announcement_id", data.id);
      check(rows.error, "Read publish languages");
      for (const lang of VOICE_LANGS) {
        const row = rows.data?.find((r) => r.lang === lang);
        if (!row?.text || !row.audio_path || row.text_status !== "ready" || row.audio_status !== "ready" || row.audio_hash !== row.text_hash || row.text_hash !== textHash(row.text)) throw new Error(`${lang}: text and matching audio must be ready`);
        await verifyAudio(sb, row.audio_path);
      }
      const published = await sb.rpc("publish_voice_announcement", { _id: data.id });
      check(published.error, "Publish announcement");
      if (published.data !== true) throw new Error("Announcement was not published");
    } catch (e) { return { ok: false, error: failure(e) }; }
    try {
      const retired = await sb.from("voice_announcements").select("id").eq("status", "retired");
      check(retired.error, "Read retired announcements");
      const errors: string[] = [];
      for (const r of retired.data ?? []) {
        const removed = await removeAnnouncement(sb, r.id);
        if (!removed.ok) errors.push(removed.error);
      }
      return { ok: true, ...(errors.length ? { cleanupError: errors.join("; ") } : {}) };
    } catch (e) { return { ok: true, cleanupError: failure(e) }; }
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: validId(d?.id) }))
  .handler(async ({ data, context }): Promise<VoiceResult> => {
    await assertAdmin(context);
    return removeAnnouncement(context.supabase, data.id);
  });
