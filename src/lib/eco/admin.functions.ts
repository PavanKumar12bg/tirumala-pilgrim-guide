import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { activitySchema, eligibilitySchema } from "./rules";
export const ecoAdminData = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }); if (!admin) throw new Error("Forbidden");
  const results = await Promise.all([context.supabase.from("eco_participants").select("*").order("created_at", { ascending: false }), context.supabase.from("eco_submission_outbox").select("*").order("created_at", { ascending: false }), context.supabase.from("eco_contribution_snapshots").select("*"), context.supabase.from("eco_review_events").select("*").order("created_at", { ascending: false }).limit(100), context.supabase.from("eco_eligibility_settings").select("*").eq("id", 1).maybeSingle(), context.supabase.from("eco_template_versions").select("*\fill").limit(1)]);
  for (const result of results) if (result.error) throw new Error(result.error.message);
  return { participants: results[0].data ?? [], submissions: results[1].data ?? [], contributions: results[2].data ?? [], events: results[3].data ?? [], settings: results[4].data };
});
export const syncEcoSubmission = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input)).handler(async ({ data, context }) => {
  const { data: admin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }); if (roleError || !admin) throw new Error("Forbidden");
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { data: job, error } = await db.from("eco_submission_outbox").select("*").eq("id", data.id).single(); if (error || !job) throw new Error("Submission not found");
  try {
    const input = activitySchema.parse(job.payload);
    const { data: participant, error: participantError } = await db.from("eco_participants").select("display_id,name,email").eq("id", job.participant_id).single(); if (participantError || !participant) throw new Error("Participant missing");
    const { uploadDrive, writeActivityRow } = await import("./google.server"); const ids = [...job.drive_ids];
    for (let i = ids.length; i < job.staged_paths.length; i++) { const path = job.staged_paths[i]; if (!path) throw new Error("Missing staged image"); const { data: blob, error: fileError } = await db.storage.from("eco-staging").download(path); if (fileError || !blob) throw new Error("Staged photo unavailable"); ids.push(await uploadDrive(blob, `${job.id}-${i}.webp`)); const { error: saveError } = await db.from("eco_submission_outbox").update({ drive_ids: ids }).eq("id", job.id); if (saveError) throw new Error("Photo sync confirmation failed"); }
    let { data: snapshot } = await db.from("eco_contribution_snapshots").select("*").eq("activity_id", job.id).maybeSingle();
    if (!snapshot) { const result = await db.from("eco_contribution_snapshots").insert({ activity_id: job.id, participant_id: job.participant_id, category: input.category, activity_date: input.date, photo_count: job.staged_paths.length }).select().single(); if (result.error) throw new Error("Review setup failed"); snapshot = result.data; }
    if (!snapshot) throw new Error("Missing review snapshot");
    await writeActivityRow(job.id, [participant.display_id, participant.name, participant.email, job.id, input.category, input.description, input.date, input.location, ids[0] ?? "", ids[1] ?? "", JSON.stringify(ids.slice(2)), snapshot.status, snapshot.status, snapshot.comments, job.created_at, snapshot.version, snapshot.plastic_kg, snapshot.saplings, snapshot.photo_count]);
    const { error: ackError } = await db.from("eco_submission_outbox").update({ sheet_ack: true, sync_status: "synced", last_error: null, payload: { ...input, description: "", location: "" }, updated_at: new Date().toISOString() }).eq("id", job.id); if (ackError) throw new Error("Sheet saved but acknowledgement failed");
    return { ok: true, error: null };
  } catch (error) { const message = error instanceof Error ? error.message : "Sync failed"; await db.from("eco_submission_outbox").update({ sync_status: "error", last_error: message }).eq("id", job.id); return { ok: false, error: message }; }
});
export const reviewEcoActivity = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ id: z.string().uuid(), status: z.enum(["pending", "approved", "rejected"]), plastic: z.number().min(0).max(1000000), saplings: z.number().int().min(0).max(1000000), comments: z.string().max(2000), version: z.number().int().min(0) }).parse(input)).handler(async ({ data, context }) => {
  const { error } = await context.supabase.rpc("eco_review_activity", { _id: data.id, _status: data.status, _plastic: data.plastic, _saplings: data.saplings, _comments: data.comments, _expected_version: data.version }); if (error) throw new Error(error.message); return { ok: true };
});
export const saveEcoRules = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => eligibilitySchema.parse(input)).handler(async ({ data, context }) => {
  const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }); if (!admin) throw new Error("Forbidden");
  const { error } = await context.supabase.from("eco_eligibility_settings").upsert({ id: 1, rules: data, published: true, updated_by: context.userId, updated_at: new Date().toISOString() }); if (error) throw new Error(error.message); return { ok: true };
});
export const hideEcoParticipant = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ id: z.string().uuid(), hidden: z.boolean() }).parse(input)).handler(async ({ data, context }) => { const { error } = await context.supabase.from("eco_participants").update({ hidden: data.hidden }).eq("id", data.id); if (error) throw new Error(error.message); return { ok: true }; });