create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- First signed-in user may claim admin only when no admin exists yet.
create or replace function public.claim_first_admin()
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  if exists (select 1 from public.user_roles where role = 'admin') then
    return public.has_role(auth.uid(), 'admin');
  end if;
  insert into public.user_roles(user_id, role) values (auth.uid(), 'admin');
  return true;
end $$;
revoke execute on function public.claim_first_admin() from anon, public;
grant execute on function public.claim_first_admin() to authenticated;

create or replace function public.admin_exists()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where role = 'admin')
$$;
grant execute on function public.admin_exists() to anon, authenticated;

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

create table public.places (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  category text not null default 'other',
  name jsonb not null default '{}'::jsonb,
  description jsonb not null default '{}'::jsonb,
  lat double precision,
  lng double precision,
  coords_verified boolean not null default false,
  visible boolean not null default true,
  featured boolean not null default false,
  sort_order int not null default 100,
  image_url text,
  image_path text,
  image_width int,
  image_height int,
  image_bytes int,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
grant select on public.places to anon, authenticated;
grant insert, update, delete on public.places to authenticated;
grant all on public.places to service_role;
alter table public.places enable row level security;
create policy "Public reads visible places" on public.places for select to anon, authenticated using (visible = true or public.has_role(auth.uid(), 'admin'));
create policy "Admins insert places" on public.places for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update places" on public.places for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete places" on public.places for delete to authenticated using (public.has_role(auth.uid(), 'admin'));
create trigger places_touch before update on public.places for each row execute function public.touch_updated_at();

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  text jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);
grant select on public.announcements to anon, authenticated;
grant insert, update, delete on public.announcements to authenticated;
grant all on public.announcements to service_role;
alter table public.announcements enable row level security;
create policy "Public reads active announcements" on public.announcements for select to anon, authenticated using (active = true or public.has_role(auth.uid(), 'admin'));
create policy "Admins insert announcements" on public.announcements for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update announcements" on public.announcements for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete announcements" on public.announcements for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create table public.site_status (
  id int primary key default 1 check (id = 1),
  darshan_wait_hours numeric,
  darshan_note jsonb not null default '{}'::jsonb,
  crowd_level text check (crowd_level in ('low','moderate','high','very_high')),
  updated_at timestamptz not null default now()
);
grant select on public.site_status to anon, authenticated;
grant update on public.site_status to authenticated;
grant all on public.site_status to service_role;
alter table public.site_status enable row level security;
create policy "Public reads status" on public.site_status for select to anon, authenticated using (true);
create policy "Admins update status" on public.site_status for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create trigger status_touch before update on public.site_status for each row execute function public.touch_updated_at();
insert into public.site_status(id) values (1);

-- Seed: only the main temple has published coordinates; all others await admin verification.
insert into public.places (slug, category, name, description, lat, lng, coords_verified, featured, sort_order) values
('sri-venkateswara-temple','temple','{"en":"Sri Venkateswara Swamy Temple","te":"శ్రీ వేంకటేశ్వర స్వామి ఆలయం"}','{"en":"The main shrine of Lord Venkateswara on the Tirumala hills.","te":"తిరుమల కొండపై శ్రీ వేంకటేశ్వర స్వామి ప్రధాన ఆలయం."}',13.68306,79.34694,true,true,1),
('adi-varahaswamy-temple','temple','{"en":"Sri Adi Varahaswamy Temple","te":"శ్రీ ఆది వరాహస్వామి ఆలయం"}','{"en":"Temple of Lord Varaha on the bank of Swami Pushkarini.","te":"స్వామి పుష్కరిణి ఒడ్డున ఉన్న శ్రీ వరాహస్వామి ఆలయం."}',null,null,false,true,2),
('swami-pushkarini','temple','{"en":"Swami Pushkarini","te":"స్వామి పుష్కరిణి"}','{"en":"The sacred temple tank beside the main temple.","te":"ప్రధాన ఆలయం పక్కన ఉన్న పవిత్ర పుష్కరిణి."}',null,null,false,true,3),
('annaprasadam-bhavan','food','{"en":"Matrusri Tarigonda Vengamamba Annaprasada Bhavan","te":"మాతృశ్రీ తరిగొండ వెంగమాంబ అన్నప్రసాద భవనం"}','{"en":"Free annaprasadam (meals) for pilgrims.","te":"భక్తులకు ఉచిత అన్నప్రసాదం."}',null,null,false,true,4),
('cro-office','office','{"en":"CRO Office (Central Reception Office)","te":"సీఆర్ఓ కార్యాలయం (కేంద్ర రిసెప్షన్ కార్యాలయం)"}','{"en":"Accommodation allotment and enquiries.","te":"వసతి కేటాయింపు మరియు విచారణలు."}',null,null,false,true,5),
('jeo-camp-office','office','{"en":"JEO Camp Office","te":"జేఈఓ క్యాంప్ కార్యాలయం"}','{"en":"TTD Joint Executive Officer camp office.","te":"టీటీడీ జాయింట్ ఎగ్జిక్యూటివ్ ఆఫీసర్ క్యాంప్ కార్యాలయం."}',null,null,false,false,6),
('atc-circle','landmark','{"en":"ATC Circle","te":"ఏటీసీ సర్కిల్"}','{"en":"A well-known junction in Tirumala town.","te":"తిరుమల పట్టణంలో ప్రసిద్ధ కూడలి."}',null,null,false,false,7),
('tirumala-bus-stand','transport','{"en":"Tirumala Bus Stand","te":"తిరుమల బస్ స్టాండ్"}','{"en":"APSRTC buses to and from Tirupati.","te":"తిరుపతికి వెళ్లే మరియు వచ్చే ఏపీఎస్ఆర్టీసీ బస్సులు."}',null,null,false,true,8);
