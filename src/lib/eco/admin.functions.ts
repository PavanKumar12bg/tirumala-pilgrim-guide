import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { activitySchema, eligibilitySchema } from "./rules";
export const ecoAdminData = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }); if (!admin) throw new Error("Forbidden");
  const results = await Promise.all([context.supabase.from("eco_participants").select("*").order("created_at", { ascending: false }), context.supabase.from("eco_submission_outbox").select("*").order("created_at", { ascending: false }), context.supabase.from("eco_contribution_snapshots").select("*"), context.supabase.from("eco_review_events").select("*").order("created_at", { ascending: false }).limit(100), context.supabase.from("eco_eligibility_settings").select("*").eq("id", 1).maybeSingle()]);
  for (const result of results) if (result.error) throw new Error(result.error.message);
  return { participants: results[0].data ?? [], submissions: results[1].data ?? [], contributions: results[2].data ?? [], events: results[3].data ?? [], settings: results[4].data };
});
export const syncEcoSubmission = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input)).handler(async ({ data, context }) => {
  const { data: admin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }); if (roleError || !admin) throw new Error("Forbidden");
  const { syncSubmission } = await import('./sync.server');
  return syncSubmission(data.id);
});
export const reviewEcoActivity = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ id: z.string().uuid(), status: z.enum(["pending", "approved", "rejected"]), plastic: z.number().min(0).max(1000000), saplings: z.number().int().min(0).max(1000000), comments: z.string().max(2000), version: z.number().int().min(0) }).parse(input)).handler(async ({ data, context }) => {
  const { error } = await context.supabase.rpc("eco_review_activity", { _id: data.id, _status: data.status, _plastic: data.plastic, _saplings: data.saplings, _comments: data.comments, _expected_version: data.version }); if (error) throw new Error(error.message);
  const { data: snapshot } = await context.supabase.from('eco_contribution_snapshots').select('participant_id').eq('activity_id',data.id).single();
  if (!snapshot) throw new Error('Review saved; card recalculation needs retry');
  const { recalculateCard } = await import('./cards.server');
  await recalculateCard(snapshot.participant_id, context.userId);
  const { syncSubmission } = await import('./sync.server');
  const sync = await syncSubmission(data.id);
  return { ok: true, sync };
});
export const saveEcoRules = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => eligibilitySchema.parse(input)).handler(async ({ data, context }) => {
  const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }); if (!admin) throw new Error("Forbidden");
  const { error } = await context.supabase.from("eco_eligibility_settings").upsert({ id: 1, rules: data, published: true, updated_by: context.userId, updated_at: new Date().toISOString() }); if (error) throw new Error(error.message); return { ok: true };
});
export const hideEcoParticipant = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ id: z.string().uuid(), hidden: z.boolean() }).parse(input)).handler(async ({ data, context }) => { const { error } = await context.supabase.from("eco_participants").update({ hidden: data.hidden }).eq("id", data.id); if (error) throw new Error(error.message); return { ok: true }; });