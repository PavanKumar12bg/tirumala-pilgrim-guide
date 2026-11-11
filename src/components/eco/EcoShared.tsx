import { Link } from '@tanstack/react-router';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { Leaf } from 'lucide-react';
import { compressToWebp } from '@/lib/image-compress';
import { ECO_LIMITS } from '@/lib/eco/rules';
export function EcoShell({children}:{children:React.ReactNode}) {
  const {t}=useI18n();
  return <AppShell><div className="eco-theme mx-auto max-w-5xl px-4 py-6"><div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-gold pb-4"><Link to="/clean-eco-tirumala" className="flex items-center gap-2 font-semibold text-primary"><Leaf className="size-5"/>{t('ecoTitle')}</Link><Button asChild variant="outline"><Link to="/clean-eco-tirumala/dashboard">{t('ecoDashboard')}</Link></Button></div>{children}</div></AppShell>;
}
export const categoryKeys={plastic:'ecoPlastic',cleaning:'ecoCleaning',dustbins:'ecoDustbins',plantation:'ecoPlantation',protection:'ecoProtection',other:'ecoOther'} as const;
export async function preparePhoto(file:File){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>ECO_LIMITS.incomingBytes)throw new Error('Unsupported photo');
  const out=await compressToWebp(file);if(out.blob.size>ECO_LIMITS.compressedBytes)throw new Error('Photo too large');
  return new File([out.blob],file.name+'.webp',{type:'image/webp'});
}
export function EcoPromo(){const {t}=useI18n();return <section className="eco-theme flex flex-wrap items-center justify-between gap-3 border-y border-gold py-4"><div><h2 className="flex items-center gap-2 text-lg text-primary"><Leaf className="size-5"/>{t('ecoTitle')}</h2><p className="mt-1 text-sm text-muted-foreground">{t('ecoIntro')}</p></div><div className="flex flex-wrap gap-2"><Button asChild><Link to="/clean-eco-tirumala/participate">{t('ecoJoin')}</Link></Button><Button asChild variant="outline"><Link to="/clean-eco-tirumala" hash="contributors">{t('ecoContributors')}</Link></Button></div></section>}
export function ecoHead(title:string,description:string){return {meta:[{title:`${title} — Tirumala Guide`},{name:'description',content:description},{property:'og:title',content:`${title} — Tirumala Guide`},{property:'og:description',content:description},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]};}