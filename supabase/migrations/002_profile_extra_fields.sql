-- ============================================================
-- MUSLI MAP — Migration 002: extra profile fields
-- Run AFTER 001_initial_schema.sql
-- ============================================================

-- Band-specific fields
alter table public.profiles
  add column if not exists genre        text,
  add column if not exists social_links jsonb default '{}'::jsonb;

-- Fan-specific field (store geocoded place name for display)
alter table public.profiles
  add column if not exists home_location_name text;

-- Replace the signup trigger to also populate the new fields
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    role,
    display_name,
    genre,
    social_links,
    home_lat,
    home_lng,
    home_location_name
  ) values (
    new.id,
    (new.raw_user_meta_data ->> 'role')::public.user_role,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email),
    new.raw_user_meta_data ->> 'genre',
    coalesce(
      (new.raw_user_meta_data -> 'social_links'),
      '{}'::jsonb
    ),
    nullif(new.raw_user_meta_data ->> 'home_lat', '')::double precision,
    nullif(new.raw_user_meta_data ->> 'home_lng', '')::double precision,
    new.raw_user_meta_data ->> 'home_location_name'
  );
  return new;
end;
$$;
