alter table public.places
  add column if not exists osm_id text,
  add column if not exists osm_tags jsonb not null default '{}'::jsonb,
  add column if not exists coords_source text,
  add column if not exists needs_review boolean not null default false;
alter table public.places add constraint places_osm_id_key unique (osm_id);