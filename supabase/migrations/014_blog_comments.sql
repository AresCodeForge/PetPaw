-- ============================================
-- Blog Comments Migration
-- Creates blog_comments table for native comments
-- ============================================

-- =========================
-- Blog Comments Table
-- =========================
create table if not exists public.blog_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.blog_comments(id) on delete cascade,
  content text not null,
  status text not null default 'approved' check (status in ('pending', 'approved', 'spam', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- Indexes for Performance
-- =========================
create index if not exists idx_blog_comments_post_id on public.blog_comments(post_id);
create index if not exists idx_blog_comments_user_id on public.blog_comments(user_id);
create index if not exists idx_blog_comments_parent_id on public.blog_comments(parent_id);
create index if not exists idx_blog_comments_status on public.blog_comments(status);
create index if not exists idx_blog_comments_created_at on public.blog_comments(created_at desc);

-- =========================
-- Enable RLS
-- =========================
alter table public.blog_comments enable row level security;

-- =========================
-- RLS Policies
-- =========================

-- Public can view approved comments
drop policy if exists "Public can view approved comments" on public.blog_comments;
create policy "Public can view approved comments" on public.blog_comments
  for select using (status = 'approved');

-- Authenticated users can create comments
drop policy if exists "Authenticated users can create comments" on public.blog_comments;
create policy "Authenticated users can create comments" on public.blog_comments
  for insert with check (auth.uid() = user_id);

-- Users can update their own comments
drop policy if exists "Users can update own comments" on public.blog_comments;
create policy "Users can update own comments" on public.blog_comments
  for update using (auth.uid() = user_id);

-- Users can delete their own comments
drop policy if exists "Users can delete own comments" on public.blog_comments;
create policy "Users can delete own comments" on public.blog_comments
  for delete using (auth.uid() = user_id);

-- =========================
-- Updated_at Trigger
-- =========================
create or replace function public.blog_comments_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists blog_comments_updated_at on public.blog_comments;
create trigger blog_comments_updated_at
  before update on public.blog_comments
  for each row execute function public.blog_comments_set_updated_at();

-- =========================
-- Comments
-- =========================
comment on table public.blog_comments is 'Blog post comments from authenticated users';
comment on column public.blog_comments.parent_id is 'Reference to parent comment for nested replies';
comment on column public.blog_comments.status is 'Comment moderation status: pending, approved, spam, deleted';
