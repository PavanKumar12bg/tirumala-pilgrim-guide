CREATE OR REPLACE FUNCTION public.replace_voice_training(_rows jsonb) RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE n integer;
BEGIN
IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
IF jsonb_typeof(_rows) <> 'array' OR jsonb_array_length(_rows)>1000 THEN RAISE EXCEPTION 'Invalid training snapshot'; END IF;
UPDATE public.voice_query_training SET active=false WHERE active=true;
INSERT INTO public.voice_query_training(intent_id,payload,active,updated_at) SELECT x->>'intentId',x,(x->>'active')::boolean,now() FROM jsonb_array_elements(_rows) x ON CONFLICT(intent_id) DO UPDATE SET payload=excluded.payload,active=excluded.active,updated_at=excluded.updated_at;
GET DIAGNOSTICS n=ROW_COUNT;
INSERT INTO public.voice_training_sync(id,last_synced_at,last_error,row_count) VALUES(1,now(),null,n) ON CONFLICT(id) DO UPDATE SET last_synced_at=excluded.last_synced_at,last_error=null,row_count=n;
RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.replace_voice_training(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_voice_training(jsonb) TO authenticated,service_role;