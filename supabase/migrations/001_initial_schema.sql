-- ============================================================
-- MUSLI MAP — Initial Schema
-- Run this in the Supabase SQL Editor (or via Supabase CLI)
-- ============================================================

-- Enable PostGIS for geo queries (pre-installed on Supabase)
create extension if not exists postgis;

-- ── Types ──────────────────────────────────────────────────
create type user_role as enum ('band', 'fan');

-- ── Profiles ───────────────────────────────────────────────
-- One row per auth user. Created automatically via trigger on signup.
create table public.profiles (
  id                        uuid primary key references auth.users(id) on delete cascade,
  role                      user_role not null,
  display_name              text not null,
  bio                       text,
  -- Fan-only location preferences
  home_lat                  double precision,
  home_lng                  double precision,
  notification_radius_miles integer default 25,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- Row-level security
alter table public.profiles enable row level security;

-- Anyone can read profiles (band pages, search, etc.)
create policy "Profiles are publicly readable"
  on public.profiles for select
  using (true);

-- Users can only update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ── Trigger: create profile row on signup ──────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    (new.raw_user_meta_data ->> 'role')::user_role,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Gigs ───────────────────────────────────────────────────
create table public.gigs (
  id           uuid primary key default gen_random_uuid(),
  band_id      uuid not null references public.profiles(id) on delete cascade,
  venue_name   text not null,
  lat          double precision not null,
  lng          double precision not null,
  genre        text,
  starts_at    timestamptz not null,
  description  text,
  created_at   timestamptz not null default now(),
  -- Enforce: gigs must be within 2 weeks of posting
  constraint gig_max_advance check (starts_at <= created_at + interval '14 days'),
  -- Enforce: gigs must be in the future at time of posting
  constraint gig_future check (starts_at > created_at)
);

-- Index for fast map queries (bounding-box + date filter)
create index gigs_location_idx on public.gigs (lat, lng);
create index gigs_starts_at_idx on public.gigs (starts_at);
create index gigs_band_id_idx   on public.gigs (band_id);

alter table public.gigs enable row level security;

-- Anyone can read active gigs (not yet expired)
create policy "Active gigs are publicly readable"
  on public.gigs for select
  using (starts_at > now() - interval '1 day');

-- Only the band that owns the gig can insert
create policy "Bands can post gigs"
  on public.gigs for insert
  with check (
    auth.uid() = band_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'band'
    )
  );

-- Bands can update/delete their own gigs
create policy "Bands can update own gigs"
  on public.gigs for update
  using (auth.uid() = band_id);

create policy "Bands can delete own gigs"
  on public.gigs for delete
  using (auth.uid() = band_id);

-- ── Follows ────────────────────────────────────────────────
create table public.follows (
  fan_id     uuid not null references public.profiles(id) on delete cascade,
  band_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (fan_id, band_id)
);

create index follows_band_id_idx on public.follows (band_id);

alter table public.follows enable row level security;

-- Fans can see who they follow
create policy "Fans can read own follows"
  on public.follows for select
  using (auth.uid() = fan_id);

-- Fans can follow bands
create policy "Fans can follow bands"
  on public.follows for insert
  with check (
    auth.uid() = fan_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'fan'
    )
    and exists (
      select 1 from public.profiles
      where id = band_id and role = 'band'
    )
  );

-- Fans can unfollow
create policy "Fans can unfollow bands"
  on public.follows for delete
  using (auth.uid() = fan_id);

-- ── Auto-update updated_at on profiles ────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();
