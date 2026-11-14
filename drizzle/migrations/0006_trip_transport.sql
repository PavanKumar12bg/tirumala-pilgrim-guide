CREATE TABLE public.transport_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  template text NOT NULL CHECK (template IN ('package','route_guide','bus_routes','pickup','help_info')),
  title jsonb NOT NULL DEFAULT '{}'::jsonb,
  description jsonb NOT NULL DEFAULT '{}'::jsonb,
  icon text NOT NULL DEFAULT '🚌',
  image_path text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  sort_order integer NOT NULL DEFAULT 100,
  sections jsonb NOT NULL DEFAULT '{}'::jsonb,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_verified_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.transport_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.transport_categories(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('destination','route_option','bus_route','pickup_point','help_note')),
  title jsonb NOT NULL DEFAULT '{}'::jsonb,
  body jsonb NOT NULL DEFAULT '{}'::jsonb,
  photo_paths text[] NOT NULL DEFAULT '{}',
  place_id uuid REFERENCES public.places(id) ON DELETE SET NULL,
  duration_text text,
  notes jsonb NOT NULL DEFAULT '{}'::jsonb,
  fare_text text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_url text,
  last_verified_on date,
  sort_order integer NOT NULL DEFAULT 100,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX transport_items_category_idx ON public.transport_items(category_id, sort_order);
CREATE TABLE public.transport_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  vehicle_type text,
  capacity integer CHECK (capacity IS NULL OR capacity > 0),
  public_phone text CHECK (public_phone IS NULL OR public_phone ~ '^\+?[0-9 -]{6,20}$'),
  service_area text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','suspended')),
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.transport_provider_private (
  provider_id uuid PRIMARY KEY REFERENCES public.transport_providers(id) ON DELETE CASCADE,
  commission text,
  agreement_notes text,
  private_phone text,
  internal_notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.transport_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.transport_providers(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.transport_categories(id) ON DELETE CASCADE,
  price_text text,
  included_places text,
  duration_text text,
  inclusions text,
  exclusions text,
  extra_charges text,
  published boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, category_id)
);

GRANT SELECT ON public.transport_categories, public.transport_items, public.transport_providers, public.transport_offers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_categories, public.transport_items, public.transport_providers, public.transport_offers, public.transport_provider_private TO authenticated;
GRANT ALL ON public.transport_categories, public.transport_items, public.transport_providers, public.transport_offers, public.transport_provider_private TO service_role;

ALTER TABLE public.transport_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_provider_private ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_offers ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.transport_offer_is_live(_offer_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM transport_offers o
    JOIN transport_providers p ON p.id = o.provider_id
    JOIN transport_categories c ON c.id = o.category_id
    WHERE o.id = _offer_id AND o.published AND p.status = 'approved' AND p.active AND c.status = 'published'
  )
$$;
CREATE OR REPLACE FUNCTION public.transport_provider_is_public(_provider_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM transport_offers o
    JOIN transport_providers p ON p.id = o.provider_id
    JOIN transport_categories c ON c.id = o.category_id
    WHERE o.provider_id = _provider_id AND o.published AND p.status = 'approved' AND p.active AND c.status = 'published'
  )
$$;
CREATE OR REPLACE FUNCTION public.transport_category_is_published(_category_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM transport_categories WHERE id = _category_id AND status = 'published')
$$;

CREATE POLICY "Public reads published transport categories" ON public.transport_categories FOR SELECT TO anon, authenticated
  USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert transport categories" ON public.transport_categories FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update transport categories" ON public.transport_categories FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete transport categories" ON public.transport_categories FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public reads published transport items" ON public.transport_items FOR SELECT TO anon, authenticated
  USING ((published AND public.transport_category_is_published(category_id)) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert transport items" ON public.transport_items FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update transport items" ON public.transport_items FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete transport items" ON public.transport_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public reads live transport providers" ON public.transport_providers FOR SELECT TO anon, authenticated
  USING (public.transport_provider_is_public(id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert transport providers" ON public.transport_providers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update transport providers" ON public.transport_providers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete transport providers" ON public.transport_providers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins read provider private data" ON public.transport_provider_private FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert provider private data" ON public.transport_provider_private FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update provider private data" ON public.transport_provider_private FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete provider private data" ON public.transport_provider_private FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public reads live transport offers" ON public.transport_offers FOR SELECT TO anon, authenticated
  USING (public.transport_offer_is_live(id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert transport offers" ON public.transport_offers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update transport offers" ON public.transport_offers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete transport offers" ON public.transport_offers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.transport_offer_requires_approved()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.published AND NOT EXISTS (SELECT 1 FROM transport_providers WHERE id = NEW.provider_id AND status = 'approved') THEN
    RAISE EXCEPTION 'Provider must be approved before an offer is published';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER transport_offers_validate BEFORE INSERT OR UPDATE ON public.transport_offers FOR EACH ROW EXECUTE FUNCTION public.transport_offer_requires_approved();
CREATE TRIGGER transport_categories_touch BEFORE UPDATE ON public.transport_categories FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER transport_items_touch BEFORE UPDATE ON public.transport_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER transport_providers_touch BEFORE UPDATE ON public.transport_providers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.transport_categories (slug, template, title, description, icon, sort_order, sources, last_verified_on) VALUES
('tirupati-temple-packages','package','{"en":"Tirupati Temple Packages","te":"తిరుపతి ఆలయ ప్యాకేజీలు"}','{"en":"Local sightseeing packages. Destinations and providers are added by the admin after checking."}','🛕',10,'[]','2026-11-02'),
('tirupati-to-tirumala','route_guide','{"en":"Tirupati to Tirumala","te":"తిరుపతి నుండి తిరుమల"}','{"en":"Road and footpath options between Tirupati and Tirumala."}','⛰️',20,'[{"label":"TTD – Tirupati to Tirumala","url":"https://www.tirumala.org/TravellingfromTirupatitoTirumala.aspx"}]','2026-11-02'),
('free-bus-routes','bus_routes','{"en":"Free Bus Routes","te":"ఉచిత బస్సు మార్గాలు"}','{"en":"TTD free buses at Tirumala and Tirupati. No live bus positions or arrival times are available."}','🚌',30,'[{"label":"TTD – Free buses at Tirumala","url":"https://www.tirumala.org/FreeBusServiceAtTirumala.aspx"},{"label":"TTD – Free buses at Tirupati","url":"https://www.tirumala.org/FreeBusServiceTirupathi.aspx"}]','2026-11-02'),
('station-pickup','pickup','{"en":"Bus Stand / Railway Station Pickup","te":"బస్ స్టాండ్ / రైల్వే స్టేషన్ పికప్"}','{"en":"Pickup options from Tirupati bus stand and railway station."}','🚉',40,'[{"label":"TTD – Transport facilities","url":"https://www.tirumala.org/TransportFacilities.aspx"}]','2026-11-02'),
('senior-citizen-assistance','help_info','{"en":"Senior Citizen Travel Assistance","te":"వృద్ధుల ప్రయాణ సహాయం"}','{"en":"Help information for elderly pilgrims. Details are added only from official sources."}','🧓',50,'[]',NULL);

INSERT INTO public.transport_items (category_id, kind, title, body, source_url, last_verified_on, sort_order, published, details)
SELECT c.id, v.kind, v.title::jsonb, v.body::jsonb, v.src, '2026-11-02', v.ord, true, v.details::jsonb
FROM public.transport_categories c JOIN (VALUES
 ('tirupati-to-tirumala','route_option','{"en":"Ghat roads"}','{"en":"Two all-weather ghat roads link Tirupati and Tirumala. The up ghat road is about 17.80 km; the down ghat road is about 18.00 km."}','https://www.tirumala.org/TravellingfromTirupatitoTirumala.aspx',10,'{"mode":"road"}'),
 ('tirupati-to-tirumala','route_option','{"en":"Footpaths (Sopanamargas)"}','{"en":"Two stone footpaths reach Tirumala on foot: one starts at Alipiri, the other at Srivari Mettu."}','https://www.tirumala.org/TravellingfromTirupatitoTirumala.aspx',20,'{"mode":"footpath","boarding_points":["Alipiri","Srivari Mettu"]}'),
 ('free-bus-routes','bus_route','{"en":"Dharmarathams at Tirumala"}','{"en":"TTD free buses inside Tirumala, about every 8 minutes, clockwise and anticlockwise on a circular route covering cottage areas."}','https://www.tirumala.org/FreeBusServiceAtTirumala.aspx',10,'{}'),
 ('free-bus-routes','bus_route','{"en":"Railway Station to Srivari Mettu (Tirupati)"}','{"en":"3 TTD free buses, 18 trips every 45 minutes from 5 am to 6:15 pm. Last trip from Srivari Mettu starts at 7:15 pm."}','https://www.tirumala.org/FreeBusServiceTirupathi.aspx',20,'{"stops":["Tirupati Railway Station","Srivari Mettu"]}')
) AS v(slug, kind, title, body, src, ord, details) ON v.slug = c.slug;