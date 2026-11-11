import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
export const ecoAdminPhotos = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>z.object({id:z.string().uuid()}).parse(v)).handler(async({data,context})=>{
  const {data:admin,error} = await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'}); if(error||!admin) throw new Error('Forbidden');
  const {supabaseAdmin:db} = await import('@/integrations/supabase/client.server');
  const {data:job,error:je}=await db.from('eco_submission_outbox').select('staged_paths').eq('id',data.id).single(); if(je||!job) throw new Error('Submission unavailable');
  return Promise.all(job.staged_paths.map(async path=>{const {data:url,error:ue}=await db.storage.from('eco-staging').createSignedUrl(path,300); if(ue||!url) throw new Error('Photo unavailable');return url.signedUrl;}));
});