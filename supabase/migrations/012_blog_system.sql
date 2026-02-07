-- ============================================
-- Blog System Migration
-- Creates blog_categories and blog_posts tables
-- ============================================

-- =========================
-- Blog Categories Table
-- =========================
create table if not exists public.blog_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_el text not null,
  description_en text,
  description_el text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Enable RLS on blog_categories
alter table public.blog_categories enable row level security;

-- Public can view all categories
drop policy if exists "Public can view categories" on public.blog_categories;
create policy "Public can view categories" on public.blog_categories
  for select using (true);

-- =========================
-- Blog Posts Table
-- =========================
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.blog_categories(id) on delete set null,
  slug text not null unique,
  title_en text not null,
  title_el text not null,
  content_en text not null default '',
  content_el text not null default '',
  excerpt_en text,
  excerpt_el text,
  featured_image text,
  meta_description_en text,
  meta_description_el text,
  writer_name text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS on blog_posts
alter table public.blog_posts enable row level security;

-- Public can view published posts only
drop policy if exists "Public can view published posts" on public.blog_posts;
create policy "Public can view published posts" on public.blog_posts
  for select using (status = 'published' and published_at is not null and published_at <= now());

-- =========================
-- Updated_at Trigger
-- =========================
create or replace function public.blog_posts_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists blog_posts_updated_at on public.blog_posts;
create trigger blog_posts_updated_at
  before update on public.blog_posts
  for each row execute function public.blog_posts_set_updated_at();

-- =========================
-- Indexes for Performance
-- =========================
create index if not exists idx_blog_posts_status on public.blog_posts(status);
create index if not exists idx_blog_posts_published_at on public.blog_posts(published_at desc);
create index if not exists idx_blog_posts_category_id on public.blog_posts(category_id);
create index if not exists idx_blog_posts_slug on public.blog_posts(slug);

-- =========================
-- Seed Categories
-- =========================
insert into public.blog_categories (slug, name_en, name_el, description_en, description_el, sort_order)
values
  ('pet-care', 'Pet Care Tips', 'Συμβουλές Φροντίδας', 'Tips and advice for taking care of your pets', 'Συμβουλές για τη φροντίδα των κατοικιδίων σας', 1),
  ('health', 'Health & Wellness', 'Υγεία & Ευεξία', 'Health tips and wellness advice for pets', 'Συμβουλές υγείας και ευεξίας για κατοικίδια', 2),
  ('news', 'PetPaw News', 'Νέα PetPaw', 'Latest news and updates from PetPaw', 'Τα τελευταία νέα και ενημερώσεις από την PetPaw', 3),
  ('stories', 'Pet Stories', 'Ιστορίες Κατοικιδίων', 'Heartwarming stories from our community', 'Συγκινητικές ιστορίες από την κοινότητά μας', 4),
  ('training', 'Training & Behavior', 'Εκπαίδευση & Συμπεριφορά', 'Training tips and behavior guidance', 'Συμβουλές εκπαίδευσης και καθοδήγηση συμπεριφοράς', 5)
on conflict (slug) do nothing;
