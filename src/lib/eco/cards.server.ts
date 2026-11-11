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
  if(old.data?.status === 'generated' || old.data?.status === 'under_review') {
    const {error} = await db.from('eco_cards').update({status: qualifies ? 'superseded' : 'revoked'}).eq('id',old.data.id); if(error) throw error;
    const {error: ee} = await db.from('eco_card_events').insert({card_id:old.data.id,event:qualifies?'superseded':'revoked',actor_id:actorId}); if(ee) throw ee;
  }
  if(!qualifies || !rules.success || !p.data || !t.data) return;
  const {data: card,error} = await db.from('eco_cards').insert({participant_id:participantId,template_id:t.data.id,snapshot:{...p.data,totals:summarize(rows),template:t.data.settings},rules_snapshot:rules.data}).select('id').single();
  if(error || !card) throw new Error('Card generation not confirmed');
  const {error: ee} = await db.from('eco_card_events').insert({card_id:card.id,event:'generated',actor_id:actorId}); if(ee) throw ee;
}