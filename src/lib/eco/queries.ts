import {queryOptions} from '@tanstack/react-query';
import {ecoPublic} from './public.functions';
import {ecoDashboard} from './participant.functions';
export const ecoPublicQuery=()=>queryOptions({queryKey:['eco','public'],queryFn:()=>ecoPublic(),staleTime:0});
export const ecoDashboardQuery=()=>queryOptions({queryKey:['eco','dashboard'],queryFn:()=>ecoDashboard(),staleTime:0});