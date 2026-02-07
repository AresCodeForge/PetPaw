-- ============================================
-- User Blocks & Chat Consent Migration
-- Creates tables for user blocking and
-- adds chat consent tracking to profiles
-- ============================================

-- =========================
-- User Blocks Table
-- =========================
create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(blocker_id, blocked_id),
  constraint no_self_block check (blocker_id != blocked_id)
);

-- Indexes for user_blocks
create index if not exists idx_user_blocks_blocker on public.user_blocks(blocker_id);
create index if not exists idx_user_blocks_blocked on public.user_blocks(blocked_id);

-- Enable RLS
alter table public.user_blocks enable row level security;

-- RLS Policies for user_blocks
drop policy if exists "Users can view own blocks" on public.user_blocks;
create policy "Users can view own blocks" on public.user_blocks
  for select using (auth.uid() = blocker_id);

drop policy if exists "Users can create blocks" on public.user_blocks;
create policy "Users can create blocks" on public.user_blocks
  for insert with check (auth.uid() = blocker_id);

drop policy if exists "Users can delete own blocks" on public.user_blocks;
create policy "Users can delete own blocks" on public.user_blocks
  for delete using (auth.uid() = blocker_id);

-- =========================
-- Chat Consent on Profiles
-- =========================
alter table public.profiles 
  add column if not exists chat_consent_at timestamptz,
  add column if not exists birth_year integer;

comment on column public.profiles.chat_consent_at is 'Timestamp when user accepted chat terms of service';
comment on column public.profiles.birth_year is 'User birth year for age verification';

-- =========================
-- Comments
-- =========================
comment on table public.user_blocks is 'User-to-user blocks for hiding messages and preventing DMs';
comment on column public.user_blocks.blocker_id is 'The user who initiated the block';
comment on column public.user_blocks.blocked_id is 'The user who is blocked';
