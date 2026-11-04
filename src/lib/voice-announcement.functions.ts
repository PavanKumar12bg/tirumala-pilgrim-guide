import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AUDIO_BUCKET, numbersPreserved, textHash, validateSource, VOICE_LANGS, type VoiceLang } from "./voice-announcement";

type Ok = { ok: true; id?: string } | { ok: false; error: string };

function aiError(e: unknown): string {
  const name = (e as { name?: string })?.name ?? "";
  console.error("voice announcement AI failed", e);
  if (name === "PaymentRequiredError") return "AI credits are used up. Add credits in Settings → Plans & credits.";
  if (name === "RateLimitError") return "AI is busy. Wait a minute, then press Retry.";
  if (name === "PermissionDeniedError") return "AI access is blocked for this workspace.";
  if (name === "NetworkError" || name === "TimeoutError") return "Connection to AI failed. Press Retry.";
  return e instanceof Error ? e.message.slice(0, 200) : "Generation failed";
}

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Only administrators can manage announcements.");
}

/** Create (or re-create) the single draft and translate it into all 7 languages. */
export const createAndTranslate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { text: string; sourceLang?: string; draftId?: string }) => ({
    text: validateSource(d?.text),
    sourceLang: (VOICE_LANGS as readonly string[]).includes(d?.sourceLang ?? "") ? (d.sourceLang as VoiceLang) : "te",
    draftId: typeof d?.draftId === "string" ? d.draftId : undefined,
  }))
  .handler(async ({ data, context }): Promise<Ok> => {
    await assertAdmin(context);
    const sb = context.supabase;
    let id = data.draftId;
    if (id) {
      const { error } = await sb.from("voice_announcements").update({ source_text: data.text, source_lang: data.sourceLang }).eq("id", id).eq("status", "draft");
      if (error) return { ok: false, error: "Could not update draft" };
    } else {
      // Remove older unpublished drafts and their audio so only one draft exists.
      const { data: olds } = await sb.from("voice_announcements").select("id").eq("status", "draft");
      for (const o of olds ?? []) await removeAnnouncement(sb, o.id);
      const { data: row, error } = await sb.from("voice_announcements").insert({ source_text: data.text, source_lang: data.sourceLang, created_by: context.userId }).select("id").single();
      if (error || !row) return { ok: false, error: "Could not create draft" };
      id = row.id as string;
    }
    await sb.from("voice_announcement_langs").upsert(VOICE_LANGS.map((lang) => ({ announcement_id: id, lang, text_status: "working", error: null })), { onConflict: "announcement_id,lang" });
    try {
      const { translateAll } = await import("./voice-announcement.server");
      const tr = await translateAll(data.text);
      tr[data.sourceLang] = data.text; // original is always preserved verbatim
      for (const lang of VOICE_LANGS) {
        const text = tr[lang];
        const good = !!text && numbersPreserved(data.text, text);
        await sb.from("voice_announcement_langs").update({
          text: text || null, text_hash: text ? textHash(text) : null,
          text_status: good ? "ready" : "failed",
          error: good ? null : text ? "A number changed or went missing in translation. Press Retry." : "No translation returned",
        }).eq("announcement_id", id).eq("lang", lang);
      }
      return { ok: true, id };
    } catch (e) {
      const msg = aiError(e);
      await sb.from("voice_announcement_langs").update({ text_status: "failed", error: msg }).eq("announcement_id", id);
      return { ok: false, error: msg, };
    }
  });

/** Generate one language's voice; skipped when audio already matches the text. */
export const generateVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; lang: string }) => {
    if (typeof d?.id !== "string" || !(VOICE_LANGS as readonly string[]).includes(d?.lang)) throw new Error("Invalid request");
    return d as { id: string; lang: VoiceLang };
  })
  .handler(async ({ data, context }): Promise<Ok> => {
    await assertAdmin(context);
    const sb = context.supabase;
    const { data: row } = await sb.from("voice_announcement_langs").select("*").eq("announcement_id", data.id).eq("lang", data.lang).maybeSingle();
    if (!row || row.text_status !== "ready" || !row.text) return { ok: false, error: "Translation is not ready" };
    if (row.audio_status === "ready" && row.audio_hash === row.text_hash && row.audio_path) return { ok: true };
    if (row.audio_status === "working" && Date.now() - new Date(row.updated_at).getTime() < 90_000) return { ok: false, error: "Already generating" };
    await sb.from("voice_announcement_langs").update({ audio_status: "working", error: null }).eq("id", row.id);
    try {
      const { speak } = await import("./voice-announcement.server");
      const audio = await speak(row.text, data.lang);
      const ext = audio.contentType.includes("mpeg") ? "mp3" : audio.contentType.includes("ogg") ? "ogg" : "wav";
      const path = `${data.id}/${data.lang}-${row.text_hash}.${ext}`;
      const up = await sb.storage.from(AUDIO_BUCKET).upload(path, new Blob([audio.bytes], { type: audio.contentType }), { upsert: true, contentType: audio.contentType, cacheControl: "31536000" });
      if (up.error) throw new Error("Could not save audio file");
      if (row.audio_path && row.audio_path !== path) await sb.storage.from(AUDIO_BUCKET).remove([row.audio_path]);
      await sb.from("voice_announcement_langs").update({ audio_status: "ready", audio_path: path, audio_hash: row.text_hash, error: null }).eq("id", row.id);
      return { ok: true };
    } catch (e) {
      const msg = aiError(e);
      await sb.from("voice_announcement_langs").update({ audio_status: "failed", error: msg }).eq("id", row.id);
      return { ok: false, error: msg };
    }
  });

/** Publish the draft atomically, then remove retired announcements and their audio. */
export const publishAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => { if (typeof d?.id !== "string") throw new Error("Invalid"); return d; })
  .handler(async ({ data, context }): Promise<Ok> => {
    await assertAdmin(context);
    const sb = context.supabase;
    const { error } = await sb.rpc("publish_voice_announcement", { _id: data.id });
    if (error) return { ok: false, error: error.message };
    const { data: retired } = await sb.from("voice_announcements").select("id").eq("status", "retired");
    for (const r of retired ?? []) await removeAnnouncement(sb, r.id);
    return { ok: true };
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => { if (typeof d?.id !== "string") throw new Error("Invalid"); return d; })
  .handler(async ({ data, context }): Promise<Ok> => {
    await assertAdmin(context);
    await removeAnnouncement(context.supabase, data.id);
    return { ok: true };
  });

async function removeAnnouncement(sb: any, id: string) {
  const { data: files } = await sb.storage.from(AUDIO_BUCKET).list(id);
  if (files?.length) await sb.storage.from(AUDIO_BUCKET).remove(files.map((f: { name: string }) => `${id}/${f.name}`));
  await sb.from("voice_announcements").delete().eq("id", id);
}
