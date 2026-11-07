-- Rollback: DROP TABLE public.knowledge_entries;
CREATE TABLE public.knowledge_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question jsonb NOT NULL DEFAULT '{}'::jsonb,
  answer jsonb NOT NULL DEFAULT '{}'::jsonb,
  keywords text[] NOT NULL DEFAULT '{}'::text[],
  category text NOT NULL DEFAULT 'general',
  source_label text,
  source_url text,
  ttd_verified boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft',
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT knowledge_status_check CHECK (status IN ('draft','published'))
);
GRANT SELECT ON public.knowledge_entries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_entries TO authenticated;
GRANT ALL ON public.knowledge_entries TO service_role;
ALTER TABLE public.knowledge_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads published knowledge" ON public.knowledge_entries FOR SELECT TO anon, authenticated USING (status = 'published' OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins insert knowledge" ON public.knowledge_entries FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins update knowledge" ON public.knowledge_entries FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins delete knowledge" ON public.knowledge_entries FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE TRIGGER knowledge_touch_updated_at BEFORE UPDATE ON public.knowledge_entries FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();