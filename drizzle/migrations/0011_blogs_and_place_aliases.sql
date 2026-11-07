ALTER TABLE public.places ADD COLUMN IF NOT EXISTS aliases text[] NOT NULL DEFAULT '{}';

CREATE TABLE public.blogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  lang text NOT NULL DEFAULT 'te',
  title text NOT NULL,
  excerpt text NOT NULL DEFAULT '',
  content jsonb NOT NULL DEFAULT '[]'::jsonb,
  category text NOT NULL DEFAULT 'general',
  tags text[] NOT NULL DEFAULT '{}',
  keywords text[] NOT NULL DEFAULT '{}',
  seo_title text,
  seo_description text,
  featured_image_path text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT blogs_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT blogs_lang CHECK (lang IN ('te','en','ta','kn','ml','hi','or'))
);
GRANT SELECT ON public.blogs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blogs TO authenticated;
GRANT ALL ON public.blogs TO service_role;
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published blogs are public" ON public.blogs FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "Admins read all blogs" ON public.blogs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert blogs" ON public.blogs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update blogs" ON public.blogs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete blogs" ON public.blogs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.blogs_validate()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status = 'published' THEN
    IF NEW.featured_image_path IS NULL OR length(trim(NEW.title)) = 0 OR length(trim(NEW.excerpt)) = 0 THEN
      RAISE EXCEPTION 'A published blog needs a title, short description and featured image';
    END IF;
    IF NEW.published_at IS NULL THEN NEW.published_at := now(); END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER blogs_validate BEFORE INSERT OR UPDATE ON public.blogs FOR EACH ROW EXECUTE FUNCTION public.blogs_validate();

CREATE OR REPLACE FUNCTION public.blog_image_is_public(_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM blogs WHERE featured_image_path = _path AND status = 'published')
$$;

CREATE POLICY "Published blog images readable" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'blog-images' AND public.blog_image_is_public(name));
CREATE POLICY "Admins read blog images" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins upload blog images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update blog images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete blog images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'));