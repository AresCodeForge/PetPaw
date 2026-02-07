-- ============================================
-- End-to-End Encryption & Moderation Support
-- ============================================

-- =========================
-- Add public key to profiles for E2EE
-- =========================
alter table public.profiles 
  add column if not exists public_key text;

-- Add role column if it doesn't exist
alter table public.profiles 
  add column if not exists role text not null default 'user';

comment on column public.profiles.public_key is 'ECDH public key for end-to-end encrypted DMs';
comment on column public.profiles.role is 'User role: user or admin';

-- =========================
-- Add encrypted content to DM messages
-- =========================
alter table public.dm_messages 
  add column if not exists encrypted_content text;

comment on column public.dm_messages.encrypted_content is 'E2EE encrypted message content (base64)';

-- =========================
-- Moderation log table
-- =========================
create table if not exists public.moderation_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_type text not null check (content_type in ('text', 'image')),
  content_preview text,
  flags text[] not null default '{}',
  action_taken text check (action_taken in ('allowed', 'filtered', 'blocked', 'pending_review')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Index for moderation log
create index if not exists idx_moderation_log_user on public.moderation_log(user_id);
create index if not exists idx_moderation_log_pending on public.moderation_log(action_taken) 
  where action_taken = 'pending_review';

-- Enable RLS
alter table public.moderation_log enable row level security;

-- Only admins can view moderation log
drop policy if exists "Admins can view moderation log" on public.moderation_log;
create policy "Admins can view moderation log" on public.moderation_log
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- System can insert moderation log entries
drop policy if exists "System can insert moderation log" on public.moderation_log;
create policy "System can insert moderation log" on public.moderation_log
  for insert with check (true);

-- Admins can update moderation log (review)
drop policy if exists "Admins can update moderation log" on public.moderation_log;
create policy "Admins can update moderation log" on public.moderation_log
  for update using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- =========================
-- Reported content table
-- =========================
create table if not exists public.reported_content (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  content_type text not null check (content_type in ('chat_message', 'dm_message', 'profile', 'image')),
  content_id uuid,
  reason text not null,
  description text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'resolved', 'dismissed')),
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_reported_content_status on public.reported_content(status);
create index if not exists idx_reported_content_reporter on public.reported_content(reporter_id);
create index if not exists idx_reported_content_reported on public.reported_content(reported_user_id);

-- Enable RLS
alter table public.reported_content enable row level security;

-- Users can submit reports
drop policy if exists "Users can submit reports" on public.reported_content;
create policy "Users can submit reports" on public.reported_content
  for insert with check (auth.uid() = reporter_id);

-- Users can view their own reports
drop policy if exists "Users can view own reports" on public.reported_content;
create policy "Users can view own reports" on public.reported_content
  for select using (auth.uid() = reporter_id);

-- Admins can view all reports
drop policy if exists "Admins can view all reports" on public.reported_content;
create policy "Admins can view all reports" on public.reported_content
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admins can update reports
drop policy if exists "Admins can update reports" on public.reported_content;
create policy "Admins can update reports" on public.reported_content
  for update using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- =========================
-- Comments
-- =========================
comment on table public.moderation_log is 'Log of content moderation actions';
comment on table public.reported_content is 'User-reported content for admin review';
