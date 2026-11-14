CREATE TABLE public.voice_query_training (intent_id text PRIMARY KEY, payload jsonb NOT NULL, active boolean NOT NULL DEFAULT true, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.voice_query_training TO anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.voice_query_training TO authenticated;
GRANT ALL ON public.voice_query_training TO service_role;
ALTER TABLE public.voice_query_training ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published training reads" ON public.voice_query_training FOR SELECT TO anon,authenticated USING (active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin training writes" ON public.voice_query_training FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TABLE public.voice_training_sync (id integer PRIMARY KEY DEFAULT 1 CHECK (id=1), spreadsheet_id text, sheet_range text NOT NULL DEFAULT 'Queries!A1:T1001', last_synced_at timestamptz, last_error text, row_count integer NOT NULL DEFAULT 0);
GRANT SELECT,INSERT,UPDATE ON public.voice_training_sync TO authenticated;
GRANT ALL ON public.voice_training_sync TO service_role;
ALTER TABLE public.voice_training_sync ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin sync settings" ON public.voice_training_sync FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE FUNCTION public.replace_voice_training(_rows jsonb) RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE n integer;
BEGIN
IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
UPDATE public.voice_query_training SET active=false;
INSERT INTO public.voice_query_training(intent_id,payload,active,updated_at) SELECT x->>'intentId',x,(x->>'active')::boolean,now() FROM jsonb_array_elements(_rows) x ON CONFLICT(intent_id) DO UPDATE SET payload=excluded.payload,active=excluded.active,updated_at=excluded.updated_at;
GET DIAGNOSTICS n=ROW_COUNT;
INSERT INTO public.voice_training_sync(id,last_synced_at,last_error,row_count) VALUES(1,now(),null,n) ON CONFLICT(id) DO UPDATE SET last_synced_at=excluded.last_synced_at,last_error=null,row_count=n;
RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.replace_voice_training(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_voice_training(jsonb) TO authenticated,service_role;