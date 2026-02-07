-- Migration: Fix foreign key constraints to allow complete user deletion
-- Ensures ALL user data is removed when a user is deleted from auth.users

-- ============================================
-- PART 1: Fix constraints that were missing ON DELETE CASCADE
-- ============================================

-- Fix pets.owner_id - CASCADE delete (delete user's pets when user is deleted)
alter table public.pets drop constraint if exists pets_owner_id_fkey;
alter table public.pets add constraint pets_owner_id_fkey 
  foreign key (owner_id) references auth.users(id) on delete cascade;

-- ============================================
-- PART 2: Fix "action by" columns to SET NULL (preserve records but clear reference)
-- These are cases where another user performed an action on something
-- ============================================

-- Fix chat_bans.banned_by - set to null when banning admin is deleted
alter table public.chat_bans alter column banned_by drop not null;
alter table public.chat_bans drop constraint if exists chat_bans_banned_by_fkey;
alter table public.chat_bans add constraint chat_bans_banned_by_fkey 
  foreign key (banned_by) references auth.users(id) on delete set null;

-- Fix chat_messages.deleted_by - set to null when moderator who deleted is deleted
alter table public.chat_messages drop constraint if exists chat_messages_deleted_by_fkey;
alter table public.chat_messages add constraint chat_messages_deleted_by_fkey 
  foreign key (deleted_by) references auth.users(id) on delete set null;

-- Fix shelter_applications.reviewed_by - set to null when reviewer is deleted
alter table public.shelter_applications drop constraint if exists shelter_applications_reviewed_by_fkey;
alter table public.shelter_applications add constraint shelter_applications_reviewed_by_fkey 
  foreign key (reviewed_by) references auth.users(id) on delete set null;

-- Fix moderation_log.reviewed_by - set to null when reviewer is deleted
alter table public.moderation_log drop constraint if exists moderation_log_reviewed_by_fkey;
alter table public.moderation_log add constraint moderation_log_reviewed_by_fkey 
  foreign key (reviewed_by) references auth.users(id) on delete set null;

-- Fix reported_content.resolved_by - set to null when resolver is deleted
alter table public.reported_content drop constraint if exists reported_content_resolved_by_fkey;
alter table public.reported_content add constraint reported_content_resolved_by_fkey 
  foreign key (resolved_by) references auth.users(id) on delete set null;

-- Fix blog_posts.author_id - set to null to preserve posts but show "deleted author"
alter table public.blog_posts alter column author_id drop not null;
alter table public.blog_posts drop constraint if exists blog_posts_author_id_fkey;
alter table public.blog_posts add constraint blog_posts_author_id_fkey 
  foreign key (author_id) references auth.users(id) on delete set null;
