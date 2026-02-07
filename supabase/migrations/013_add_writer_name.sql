-- =========================
-- Add writer_name column to blog_posts
-- =========================
-- This allows specifying a custom writer name for each blog post,
-- separate from the admin user who created it

alter table public.blog_posts
  add column if not exists writer_name text;

comment on column public.blog_posts.writer_name is 'Custom writer/author name displayed on the post';
