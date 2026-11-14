CREATE TABLE public.status_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 entry_date date NOT NULL,
 darshan_wait_hours numeric,
 crowd_level text,
 darshan_note jsonb NOT NULL DEFAULT '{}'::jsonb,
 recorded_at timestamptz NOT NULL DEFAULT now(),
 recorded_by uuid,
 CONSTRAINT status_history_wait_valid CHECK (darshan_wait_hours IS NULL OR darshan_wait_hours >= 0),
 CONSTRAINT status_history_crowd_valid CHECK (crowd_level IS NULL OR crowd_level IN ('low','moderate','high','very_high'))
);
GRANT SELECT ON public.status_history TO authenticated;
GRANT ALL ON public.status_history TO service_role;
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read status history" ON public.status_history FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX status_history_date_idx ON public.status_history(entry_date DESC, recorded_at DESC);
CREATE OR REPLACE FUNCTION public.record_status_history() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.status_history(entry_date,darshan_wait_hours,crowd_level,darshan_note,recorded_at,recorded_by)
 VALUES ((NEW.updated_at AT TIME ZONE 'Asia/Kolkata')::date,NEW.darshan_wait_hours,NEW.crowd_level,NEW.darshan_note,NEW.updated_at,auth.uid());
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.record_status_history() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER site_status_history AFTER UPDATE OF darshan_wait_hours,crowd_level,darshan_note ON public.site_status FOR EACH ROW EXECUTE FUNCTION public.record_status_history();
INSERT INTO public.status_history(entry_date,darshan_wait_hours,crowd_level,darshan_note,recorded_at)
 SELECT (updated_at AT TIME ZONE 'Asia/Kolkata')::date,darshan_wait_hours,crowd_level,darshan_note,updated_at FROM public.site_status WHERE darshan_wait_hours IS NOT NULL OR crowd_level IS NOT NULL;