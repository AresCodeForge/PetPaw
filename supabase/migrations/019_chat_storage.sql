-- ============================================
-- Community Chat Storage Bucket
-- Creates storage bucket and policies for
-- chat image sharing
-- ============================================

-- NOTE: The bucket must be created manually in Supabase Dashboard
-- Go to Storage > New bucket > Name: "chat-images" > Public: Yes

-- =========================
-- Storage policies for chat-images
-- =========================

-- Anyone can view chat images (public bucket)
drop policy if exists "Anyone can view chat images" on storage.objects;
create policy "Anyone can view chat images" on storage.objects
  for select using (bucket_id = 'chat-images');

-- Authenticated users can upload to their own folder
drop policy if exists "Users can upload chat images" on storage.objects;
create policy "Users can upload chat images" on storage.objects
  for insert with check (
    bucket_id = 'chat-images' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can update their own images
drop policy if exists "Users can update own chat images" on storage.objects;
create policy "Users can update own chat images" on storage.objects
  for update using (
    bucket_id = 'chat-images' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own images
drop policy if exists "Users can delete own chat images" on storage.objects;
create policy "Users can delete own chat images" on storage.objects
  for delete using (
    bucket_id = 'chat-images' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );
