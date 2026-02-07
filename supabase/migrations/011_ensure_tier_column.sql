-- Ensure tier column exists on profiles with proper defaults
-- This migration ensures the tier column is present and can be updated by admin

-- Add column if not exists
alter table public.profiles add column if not exists tier text;

-- Set default value
alter table public.profiles alter column tier set default 'free';

-- Update any NULL values to 'free'
update public.profiles set tier = 'free' where tier is null;

-- IMPORTANT: Drop the old trigger that may be blocking admin updates
drop trigger if exists profiles_keep_tier_trigger on public.profiles;
drop function if exists public.profiles_keep_tier_on_self_update();

-- DO NOT create a trigger that blocks tier updates
-- The tier should only be updatable by service role (admin), which bypasses RLS anyway
-- RLS policy already prevents users from updating other users' profiles
-- If you want extra protection, use RLS policies instead of triggers

-- Alternative: Create a simple function that only blocks if using anon key
-- But for now, we rely on RLS + service role for admin operations
