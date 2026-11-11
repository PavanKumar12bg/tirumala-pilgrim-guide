import { createServerFn } from '@tanstack/react-start';
import { contributionRows } from './models';
import { summarize } from './rules';
export const ecoPublic = createServerFn({method:'GET'}).handler(async () => {
  // Privileged projection is necessary: participant tables are never publicly readable.
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
  const {data: people,error} = await db.from('eco_participants').select('id,display_id,name,profile_path').eq('public_consent',true).eq('hidden',false).is('removal_requested_at',null);
  if(error) throw new Error('Contributions unavailable');
  if(!people?.length) return {leaders:[],recent:[]};
  const {data: rows,error: ce} = await db.from('eco_contribution_snapshots').select('*').eq('status','approved').in('participant_id',people.map(p=>p.id));
  if(ce) throw new Error('Contributions unavailable');
  const leaders = await Promise.all(people.map(async p=>{
    const totals = summarize(contributionRows((rows ?? []).filter(c=>c.participant_id===p.id)));
    const photo = p.profile_path ? await db.storage.from('eco-staging').createSignedUrl(p.profile_path,300) : null;
    return {displayId:p.display_id,name:p.name,photo:photo?.data?.signedUrl ?? null,totals};
  }));
  const recent=(rows ?? []).sort((a,b)=>b.activity_date.localeCompare(a.activity_date)).slice(0,12).map(c=>({id:c.activity_id,category:c.category,date:c.activity_date,name:people.find(p=>p.id===c.participant_id)?.name ?? ''}));
  return {leaders:leaders.filter(p=>p.totals.approved>0).sort((a,b)=>b.totals.approved-a.totals.approved||a.displayId.localeCompare(b.displayId)),recent};
});