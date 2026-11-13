import { supabaseAdmin as db } from '@/integrations/supabase/client.server';
import { eligible, eligibilitySchema, summarize } from './rules';
import { contributionRows } from './models';
export async function recalculateCard(participantId: string, actorId: string) {
  const [p,c,r,t,old] = await Promise.all([
    db.from('eco_participants').select('name,display_id,profile_path').eq('id',participantId).single(),
    db.from('eco_contribution_snapshots').select('*').eq('participant_id',participantId),
    db.from('eco_eligibility_settings').select('*').eq('id',1).maybeSingle(),
    db.from('eco_template_versions').select('*').eq('published',true).order('version',{ascending:false}).limit(1).maybeSingle(),
    db.from('eco_cards').select('*').eq('participant_id',participantId).order('created_at',{ascending:false}).limit(1).maybeSingle(),
  ]);
  for(const result of [p,c,r,t,old]) if(result.error) throw new Error(result.error.message);
  const rules = eligibilitySchema.safeParse(r.data?.rules);
  const rows = contributionRows(c.data ?? []);
  const qualifies = r.data?.published && rules.success && eligible(rows,rules.data);
  const versions = Object.fromEntries((c.data ?? []).map(row=>[row.activity_id,row.version]));
  const historical = old.data && ['generated','under_review'].includes(old.data.status) ? old.data : null;
  const templateId = historical?.template_id ?? t.data?.id ?? null;
  const template = historical ? (historical.snapshot as Record<string,unknown>)['template'] : t.data?.settings;
  const snapshot = p.data ? {...p.data, totals:summarize(rows), template:template ?? {}} : {};
  const {data:result,error} = await db.rpc('eco_commit_card',{_participant:participantId,_versions:versions,_snapshot:snapshot,_rules:rules.success?rules.data:{},_template:templateId as string,_eligible:Boolean(qualifies),_actor:actorId});
  if(error)throw new Error(error.message);
  return result;
}
