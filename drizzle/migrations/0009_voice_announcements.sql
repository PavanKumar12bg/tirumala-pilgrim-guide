CREATE TABLE public.voice_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_text text NOT NULL CHECK (char_length(source_text) BETWEEN 3 AND 1500),
  source_lang text NOT NULL DEFAULT 'te' CHECK (source_lang IN ('te','en','hi','ta','kn','ml','or')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','retired')),
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX voice_announcements_one_published ON public.voice_announcements ((true)) WHERE status = 'published';
CREATE TABLE public.voice_announcement_langs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.voice_announcements(id) ON DELETE CASCADE,
  lang text NOT NULL CHECK (lang IN ('te','en','hi','ta','kn','ml','or')),
  text text,
  text_status text NOT NULL DEFAULT 'pending' CHECK (text_status IN ('pending','working','ready','failed')),
  text_hash text,
  audio_path text,
  audio_hash text,
  audio_status text NOT NULL DEFAULT 'pending' CHECK (audio_status IN ('pending','working','ready','failed')),
  error text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, lang)
);
CREATE TABLE public.voice_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  autoplay_enabled boolean NOT NULL DEFAULT true,
  repeat_enabled boolean NOT NULL DEFAULT true,
  repeat_minutes integer NOT NULL DEFAULT 5 CHECK (repeat_minutes IN (1,3,5,10,15)),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.voice_settings (id) VALUES (1);

GRANT SELECT ON public.voice_announcements, public.voice_announcement_langs, public.voice_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_announcements, public.voice_announcement_langs TO authenticated;
GRANT SELECT, UPDATE ON public.voice_settings TO authenticated;
GRANT ALL ON public.voice_announcements, public.voice_announcement_langs, public.voice_settings TO service_role;

ALTER TABLE public.voice_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_announcement_langs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_settings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.voice_announcement_is_published(_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM voice_announcements WHERE id = _id AND status = 'published')
$$;

CREATE POLICY "Public reads published voice announcement" ON public.voice_announcements FOR SELECT TO anon, authenticated
  USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert voice announcements" ON public.voice_announcements FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update voice announcements" ON public.voice_announcements FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete voice announcements" ON public.voice_announcements FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public reads published voice langs" ON public.voice_announcement_langs FOR SELECT TO anon, authenticated
  USING (public.voice_announcement_is_published(announcement_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert voice langs" ON public.voice_announcement_langs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update voice langs" ON public.voice_announcement_langs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete voice langs" ON public.voice_announcement_langs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public reads voice settings" ON public.voice_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins update voice settings" ON public.voice_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER voice_announcements_touch BEFORE UPDATE ON public.voice_announcements FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER voice_announcement_langs_touch BEFORE UPDATE ON public.voice_announcement_langs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER voice_settings_touch BEFORE UPDATE ON public.voice_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.publish_voice_announcement(_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only administrators can publish'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('voice_announcement_publish'));
  PERFORM 1 FROM voice_announcements WHERE id = _id AND status = 'draft' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Announcement is not a draft'; END IF;
  IF (SELECT count(*) FROM voice_announcement_langs WHERE announcement_id = _id AND text_status = 'ready' AND audio_status = 'ready' AND audio_path IS NOT NULL AND audio_hash = text_hash) <> 7 THEN
    RAISE EXCEPTION 'All seven languages must have text and voice ready';
  END IF;
  UPDATE voice_announcements SET status = 'retired' WHERE status = 'published';
  UPDATE voice_announcements SET status = 'published', published_at = now() WHERE id = _id;
  RETURN true;
END $$;
REVOKE EXECUTE ON FUNCTION public.publish_voice_announcement(uuid) FROM anon;

CREATE POLICY "Admins manage announcement audio" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'announcement-audio' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'announcement-audio' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public reads published announcement audio" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'announcement-audio' AND public.voice_announcement_is_published(((storage.foldername(name))[1])::uuid));