import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { participantSchema, activitySchema, validateImage, validateActivityPhotos } from "./rules";
export const registerEco = createServerFn({ method: "POST" }).inputValidator((input: unknown) => z.instanceof(FormData).parse(input)).handler(async ({ data }) => {
  const input = participantSchema.parse({ name: data.get("name"), email: data.get("email"), consent: data.get("consent") === "true", publicConsent: data.get("publicConsent") === "true" });
  const { participantSession, issueParticipantSession } = await import("./session.server");
  const current = await participantSession(); if (current) return { ok: true, id: current, error: null };
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const image = data.get("photo"); if (!(image instanceof File)) throw new Error("Profile photo required");
  validateImage(new Uint8Array(await image.arrayBuffer()), image.type);
  const { data: existing, error: lookupError } = await db.from("eco_participants").select("id").eq("email", input.email).maybeSingle();
  if (lookupError) throw new Error("Registration unavailable");
  if (existing) return { ok: false, id: null, error: "Registration cannot be resumed by email alone. Use the original browser session or contact the guide owner for recovery." };
  const id = crypto.randomUUID(); const path = `${id}/profile.webp`;
  const { error: uploadError } = await db.storage.from("eco-staging").upload(path, image, { contentType: image.type }); if (uploadError) throw new Error("Profile upload failed; please retry");
  const { error } = await db.from("eco_participants").insert({ id, name: input.name, email: input.email, profile_path: path, public_consent: input.publicConsent });
  if (error) { await db.storage.from("eco-staging").remove([path]); return { ok: false, id: null, error: "Registration unavailable. Retry in the original browser or contact the guide owner." }; }
  await issueParticipantSession(id); return { ok: true, id, error: null };
});
export const ecoDashboard = createServerFn({ method: "GET" }).handler(async () => {
  const { participantSession } = await import("./session.server"); const id = await participantSession(); if (!id) return null;
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const [participant, contributions, cards, submissions] = await Promise.all([db.from("eco_participants").select("id,display_id,name,email,email_verified,public_consent,removal_requested_at,profile_path").eq("id", id).single(), db.from("eco_contribution_snapshots").select("*").eq("participant_id", id), db.from("eco_cards").select("*").eq("participant_id", id).order("created_at", { ascending: false }).limit(1), db.from("eco_submission_outbox").select("id,payload,sync_status,last_error,created_at").eq("participant_id", id).order("created_at", { ascending: false })]);
  for (const result of [participant, contributions, cards, submissions]) if (result.error) throw new Error("Participant information could not be loaded");
  const p = participant.data;
  const profile = p?.profile_path ? await db.storage.from('eco-staging').createSignedUrl(p.profile_path,300) : null;
  const card = cards.data?.[0] ?? null;
  const template = card ? (card.snapshot as Record<string,unknown>)['template'] as Record<string,unknown> : null;
  const cardImages: Record<string,string> = {};
  for (const key of ['devotional','temple']) {
    const path = template?.[key];
    if(typeof path === 'string') { const {data:url}=await db.storage.from('eco-staging').createSignedUrl(path,300); if(url) cardImages[key]=url.signedUrl; }
  }
  return { participant: p, profile:profile?.data?.signedUrl ?? null, contributions: contributions.data ?? [], card, cardImages, submissions: submissions.data ?? [] };
});
export const submitEcoActivity = createServerFn({ method: "POST" }).inputValidator((input: unknown) => z.instanceof(FormData).parse(input)).handler(async ({ data }) => {
  const { requireParticipant } = await import("./session.server"); const participantId = await requireParticipant();
  const input = activitySchema.parse({ category: data.get("category"), description: data.get("description"), date: data.get("date"), location: data.get("location"), idempotencyKey: data.get("idempotencyKey") });
  if (input.date > new Date().toISOString().slice(0, 10)) throw new Error("Future activities cannot be submitted");
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { data: previous, error: previousError } = await db.from("eco_submission_outbox").select("id,participant_id").eq("idempotency_key", input.idempotencyKey).maybeSingle();
  if (previousError) throw new Error("Could not check submission"); if (previous) { if (previous.participant_id !== participantId) throw new Error("Invalid submission"); return { id: previous.id, synced: false }; }
  const files = validateActivityPhotos(data.getAll('photos'));
  const id = crypto.randomUUID(); const paths: string[] = [];
  for (const [index, file] of files.entries()) { if (!(file instanceof File)) throw new Error("Photo required"); validateImage(new Uint8Array(await file.arrayBuffer()), file.type); const path = `${participantId}/${id}/${index}.webp`; const { error } = await db.storage.from("eco-staging").upload(path, file, { contentType: file.type }); if (error) throw new Error("Image upload failed; your form remains available to retry"); paths.push(path); }
  const { error } = await db.from("eco_submission_outbox").insert({ id, participant_id: participantId, idempotency_key: input.idempotencyKey, payload: input, staged_paths: paths }); if (error) throw new Error("Submission not confirmed; retry with the same form");
  const { error: snapshotError } = await db.from("eco_contribution_snapshots").insert({ activity_id: id, participant_id: participantId, category: input.category, activity_date: input.date, photo_count: files.length }); if (snapshotError) throw new Error("Submission retained; review setup needs Admin retry");
  const { syncSubmission } = await import('./sync.server');
  const result = await syncSubmission(id);
  return { id, synced: result.ok };
});
export const endEcoSession = createServerFn({ method: "POST" }).handler(async () => { const { endParticipantSession } = await import("./session.server"); await endParticipantSession(); return { ok: true }; });
export const requestEcoRemoval = createServerFn({ method: "POST" }).handler(async () => { const { requireParticipant } = await import("./session.server"); const id = await requireParticipant(); const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server"); const { error } = await db.from("eco_participants").update({ public_consent: false, hidden: true, removal_requested_at: new Date().toISOString() }).eq("id", id); if (error) throw new Error("Removal request not confirmed"); return { ok: true }; });