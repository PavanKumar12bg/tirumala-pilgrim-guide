import { supabaseAdmin as db } from '@/integrations/supabase/client.server';
import { activitySchema } from './rules';
import { sheetRows, uploadDrive, writeActivityRow } from './google.server';
export async function syncSubmission(id: string) {
  const { data: job, error } = await db.from('eco_submission_outbox').select('*').eq('id', id).single();
  if (error || !job) throw new Error('Submission not found');
  try {
    const stored = job.payload as Record<string, unknown>;
    const sheet = job.sheet_ack ? (await sheetRows()).find(row => row[3] === job.id) : null;
    if (job.sheet_ack && !sheet) throw new Error('Activity missing from Sheets; reconciliation required');
    const input = activitySchema.parse(sheet ? { ...stored, description: sheet[5], location: sheet[7] } : stored);
    const { data: participant, error: pe } = await db.from('eco_participants').select('display_id,name,email').eq('id', job.participant_id).single();
    if (pe || !participant) throw new Error('Participant missing');
    const ids = [...job.drive_ids];
    for (let i = ids.length; i < job.staged_paths.length; i++) {
      const path = job.staged_paths[i]; if (!path) throw new Error('Missing staged photo');
      const { data: blob, error: fe } = await db.storage.from('eco-staging').download(path);
      if (fe || !blob) throw new Error('Staged photo unavailable');
      ids.push(await uploadDrive(blob, `${job.id}-${i}.webp`));
      const { error: se } = await db.from('eco_submission_outbox').update({ drive_ids: ids }).eq('id', id); if (se) throw se;
    }
    let { data: snapshot } = await db.from('eco_contribution_snapshots').select('*').eq('activity_id', id).maybeSingle();
    if (!snapshot) {
      const result = await db.from('eco_contribution_snapshots').insert({ activity_id: id, participant_id: job.participant_id, category: input.category, activity_date: input.date, photo_count: job.staged_paths.length }).select().single();
      if (result.error) throw result.error; snapshot = result.data;
    }
    if (!snapshot) throw new Error('Review setup unavailable');
    const links = ids.map(value => `https://drive.google.com/file/d/${value}/view`);
    await writeActivityRow(id, [participant.display_id,participant.name,participant.email,id,input.category,input.description,input.date,input.location,links[0] ?? '',links[1] ?? '',JSON.stringify(links.slice(2)),snapshot.status,snapshot.status,snapshot.comments,job.created_at,snapshot.version,snapshot.plastic_kg,snapshot.saplings,snapshot.photo_count]);
    const { error: ack } = await db.from('eco_submission_outbox').update({ sheet_ack: true, sync_status: 'synced', last_error: null, updated_at: new Date().toISOString() }).eq('id', id);
    if (ack) throw ack;
    return { ok: true, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Google sync failed';
    await db.from('eco_submission_outbox').update({ sync_status:'error', last_error: message }).eq('id', id);
    return { ok: false, error: message };
  }
}