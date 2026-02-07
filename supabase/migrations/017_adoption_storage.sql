-- ============================================
-- Adoption Corner Storage Buckets
-- Creates storage buckets and policies for
-- adoption images and shelter documents
-- ============================================

-- =========================
-- Create adoption-images bucket
-- =========================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'adoption-images',
  'adoption-images',
  true,
  5242880, -- 5MB
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do nothing;

-- =========================
-- Storage policies for adoption-images
-- =========================

-- Anyone can view adoption images (public bucket)
drop policy if exists "Anyone can view adoption images" on storage.objects;
create policy "Anyone can view adoption images" on storage.objects
  for select using (bucket_id = 'adoption-images');

-- Authenticated users can upload to their own folder
drop policy if exists "Users can upload adoption images" on storage.objects;
create policy "Users can upload adoption images" on storage.objects
  for insert with check (
    bucket_id = 'adoption-images' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can update their own images
drop policy if exists "Users can update own adoption images" on storage.objects;
create policy "Users can update own adoption images" on storage.objects
  for update using (
    bucket_id = 'adoption-images' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own images
drop policy if exists "Users can delete own adoption images" on storage.objects;
create policy "Users can delete own adoption images" on storage.objects
  for delete using (
    bucket_id = 'adoption-images' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- =========================
-- Create shelter-documents bucket (private)
-- =========================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shelter-documents',
  'shelter-documents',
  false,
  10485760, -- 10MB for documents
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do nothing;

-- =========================
-- Storage policies for shelter-documents
-- =========================

-- Users can upload to their own folder
drop policy if exists "Users can upload shelter documents" on storage.objects;
create policy "Users can upload shelter documents" on storage.objects
  for insert with check (
    bucket_id = 'shelter-documents' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can view their own documents
drop policy if exists "Users can view own shelter documents" on storage.objects;
create policy "Users can view own shelter documents" on storage.objects
  for select using (
    bucket_id = 'shelter-documents' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own documents
drop policy if exists "Users can delete own shelter documents" on storage.objects;
create policy "Users can delete own shelter documents" on storage.objects
  for delete using (
    bucket_id = 'shelter-documents' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- =========================
-- Comments
-- =========================
comment on column storage.buckets.id is 'adoption-images: Public bucket for pet photos. shelter-documents: Private bucket for verification docs.';
