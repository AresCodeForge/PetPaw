-- Add avatar URL to profiles (single profile photo per user)
alter table public.profiles add column if not exists avatar_url text;

-- Storage bucket for user avatars: path {user_id}/avatar (one file per user, overwrite)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do nothing;

-- Only the authenticated user can upload/update/delete their own avatar (path: {user_id}/avatar)
drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public can view avatars
drop policy if exists "Public can view avatars" on storage.objects;
create policy "Public can view avatars" on storage.objects
  for select to public
  using (bucket_id = 'avatars');
