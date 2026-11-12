import { createServerFn } from '@tanstack/react-start';
export const ecoPublic = createServerFn({method:'GET'}).handler(async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const url=process.env['SUPABASE_URL'] || import.meta.env['VITE_SUPABASE_URL'];
  const key=process.env['SUPABASE_PUBLISHABLE_KEY'] || import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'];
  if(!url||!key)throw new Error('Public contributions unavailable');
  const db=createClient(url,key,{auth:{persistSession:false},global:{fetch:(input,init)=>{const h=new Headers(init?.headers);if(key.startsWith('sb_')&&h.get('Authorization')===`Bearer ${key}`)h.delete('Authorization');h.set('apikey',key);return fetch(input,{...init,headers:h});}}});
  const [leaders,recent]=await Promise.all([db.rpc('eco_public_contributors'),db.rpc('eco_public_recent')]);
  if(leaders.error||recent.error)throw new Error('Public contributions unavailable');
  const people=await Promise.all((leaders.data as {display_id:string;name:string;profile_path:string|null;approved:number;cleaning:number;plastic_kg:number;saplings:number;photos:number}[]).map(async p=>{
    const photo=p.profile_path?await db.storage.from('eco-staging').createSignedUrl(p.profile_path,300):null;
    return {displayId:p.display_id,name:p.name,photo:photo?.data?.signedUrl??null,totals:{approved:Number(p.approved),cleaning:Number(p.cleaning),plasticKg:Number(p.plastic_kg),saplings:Number(p.saplings),photos:Number(p.photos)}};
  }));
  return {leaders:people,recent:(recent.data as {id:string;category:string;activity_date:string;name:string}[]).map(c=>({id:c.id,category:c.category,date:c.activity_date,name:c.name}))};
});
