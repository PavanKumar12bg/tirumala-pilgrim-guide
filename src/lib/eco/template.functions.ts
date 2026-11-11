import {createServerFn} from '@tanstack/react-start';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {z} from 'zod';
import {validateImage} from './rules';
export const saveEcoTemplate=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>z.instanceof(FormData).parse(v)).handler(async({data,context})=>{
  const {data:admin,error}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'}); if(error||!admin) throw new Error('Forbidden');
  const title=z.string().trim().min(1).max(120).parse(data.get('title'));
  const {supabaseAdmin:db}=await import('@/integrations/supabase/client.server');
  const images:Record<string,string>={};
  for(const key of ['devotional','temple']){
    const file=data.get(key); if(file instanceof File && file.size){
      validateImage(new Uint8Array(await file.arrayBuffer()),file.type);
      const path=`templates/${crypto.randomUUID()}.webp`;
      const {error:ue}=await db.storage.from('eco-staging').upload(path,file,{contentType:file.type});if(ue)throw new Error('Template photo upload failed'); images[key]=path;
    }
  }
  const {data:previous}=await context.supabase.from('eco_template_versions').select('settings').eq('published',true).order('version',{ascending:false}).limit(1).maybeSingle();
  const {data:saved,error:se}=await context.supabase.from('eco_template_versions').insert({settings:{...(previous?.settings as Record<string,unknown>??{}),...images,title},published:true,created_by:context.userId}).select('id').single();
  if(se||!saved)throw new Error('Template publication not confirmed');return {ok:true};
});