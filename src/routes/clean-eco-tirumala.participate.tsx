import {createFileRoute,useNavigate} from '@tanstack/react-router';
import {useSuspenseQuery,useQueryClient} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {useState,useEffect} from 'react';
import {EcoShell,ecoHead,preparePhoto} from '@/components/eco/EcoShared';
import {ecoDashboardQuery} from '@/lib/eco/queries';
import {registerEco} from '@/lib/eco/participant.functions';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {useI18n} from '@/lib/i18n';
export const Route=createFileRoute('/clean-eco-tirumala/participate')({head:()=>ecoHead('Join Clean & Eco Tirumala','Register a private browser-based participation session.'),loader:({context})=>context.queryClient.ensureQueryData(ecoDashboardQuery()),component:Join});
function Join(){const {t}=useI18n();const {data}=useSuspenseQuery(ecoDashboardQuery());const register=useServerFn(registerEco);const qc=useQueryClient();const navigate=useNavigate();const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [photo,setPhoto]=useState<File|null>(null);const [preview,setPreview]=useState('');const [consent,setConsent]=useState(false);
  useEffect(()=>{if(!photo){setPreview('');return;}const url=URL.createObjectURL(photo);setPreview(url);return()=>URL.revokeObjectURL(url);},[photo]);
  if(data)return <EcoShell><h1 className="text-xl">{t('ecoDashboard')}</h1><Button className="mt-4" onClick={()=>void navigate({to:'/clean-eco-tirumala/dashboard'})}>{t('ecoDashboard')}</Button></EcoShell>;
  return <EcoShell><h1 className="mb-4 text-xl text-primary">{t('ecoJoin')}</h1><p className="mb-5 max-w-xl text-sm text-muted-foreground">{t('ecoSessionNote')}</p><form className="max-w-xl space-y-4" onSubmit={async e=>{e.preventDefault();if(!photo)return;setBusy(true);setError('');const form=new FormData(e.currentTarget);form.set('consent',String(consent));form.set('publicConsent',String(form.get('publicConsent')==='on'));try{form.set('photo',await preparePhoto(photo));const result=await register({data:form});if(!result.ok){setError(t('ecoSessionNote'));return;}await qc.invalidateQueries({queryKey:['eco']});await navigate({to:'/clean-eco-tirumala/dashboard'});}catch{setError(t('ecoError'));}finally{setBusy(false);}}}>
    <label className="flex items-start gap-3 text-sm"><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-1 size-4"/>{t('ecoConsent')}</label>
    <fieldset disabled={!consent||busy} className="space-y-4"><label className="block space-y-1">{t('ecoName')}<Input name="name" required minLength={2} maxLength={100}/></label><label className="block space-y-1">{t('ecoEmail')}<Input name="email" type="email" required/></label><label className="block space-y-1">{t('ecoPhoto')}<Input type="file" accept="image/jpeg,image/png,image/webp" required onChange={e=>setPhoto(e.target.files?.[0]??null)}/></label>{preview?<img src={preview} alt={t('ecoPhoto')} className="size-24 rounded-md object-cover"/>:null}<label className="flex items-start gap-3 text-sm"><input name="publicConsent" type="checkbox" className="mt-1 size-4"/>{t('ecoPublicConsent')}</label><Button disabled={!photo||busy} type="submit">{busy?t('ecoLoading'):t('ecoJoin')}</Button></fieldset>{error?<p role="alert" className="text-sm text-destructive">{error}</p>:null}
  </form></EcoShell>;
}