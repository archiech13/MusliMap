-- ============================================================
-- MUSLI MAP — Migration 003: gig image uploads
-- Run AFTER 002_profile_extra_fields.sql
-- ============================================================

-- Add image_url column to gigs
alter table public.gigs
  add column if not exists image_url text;

-- ── Storage: gig-images bucket ────────────────────────────
insert into storage.buckets (id, name, public)
values ('gig-images', 'gig-images', true)
on conflict (id) do nothing;

-- Public read access
create policy "Gig images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'gig-images');

-- Authenticated bands can upload (files stored under their user id prefix)
create policy "Bands can upload gig images"
  on storage.objects for insert
  with check (
    bucket_id = 'gig-images'
    and auth.role() = 'authenticated'
  );

-- Bands can update their own images
create policy "Bands can update own gig images"
  on storage.objects for update
  using (
    bucket_id = 'gig-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Bands can delete their own images
create policy "Bands can delete own gig images"
  on storage.objects for delete
  using (
    bucket_id = 'gig-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
