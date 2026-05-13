-- ============================================================
-- MUSLI MAP — Migration 004: band profile enhancements
-- Run AFTER 003_gig_images.sql
-- ============================================================

-- Profile picture for any user, city/region label for bands
alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists based_in   text;

-- ── Storage: band-avatars bucket ─────────────────────────────
insert into storage.buckets (id, name, public)
values ('band-avatars', 'band-avatars', true)
on conflict (id) do nothing;

-- Public read
create policy "Band avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'band-avatars');

-- Authenticated users can upload under their own user-id prefix
create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'band-avatars'
    and auth.role() = 'authenticated'
  );

-- Users can update / replace their own avatar
create policy "Users can update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'band-avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own avatar
create policy "Users can delete own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'band-avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
