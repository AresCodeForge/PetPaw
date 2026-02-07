-- Migration: Clean up orphaned data from deleted users
-- Run this ONCE to remove any leftover data from previously deleted users

-- ============================================
-- PART 1: Find and remove orphaned records
-- (Records where user_id/owner_id references a deleted user)
-- ============================================

-- Clean orphaned profiles (profile exists but auth.users doesn't)
DELETE FROM public.profiles 
WHERE id NOT IN (SELECT id FROM auth.users);

-- Clean orphaned pets
DELETE FROM public.pets 
WHERE owner_id NOT IN (SELECT id FROM auth.users);

-- Clean orphaned pet_journal_entries
DELETE FROM public.pet_journal_entries 
WHERE owner_id NOT IN (SELECT id FROM auth.users);

-- Clean orphaned shipping_addresses
DELETE FROM public.shipping_addresses 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Clean orphaned orders
DELETE FROM public.orders 
WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM auth.users);

-- Clean orphaned blog_comments
DELETE FROM public.blog_comments 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Clean orphaned adoption_listings
DELETE FROM public.adoption_listings 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Clean orphaned adoption_favorites
DELETE FROM public.adoption_favorites 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Clean orphaned conversations (both participants)
DELETE FROM public.conversations 
WHERE poster_id NOT IN (SELECT id FROM auth.users)
   OR adopter_id NOT IN (SELECT id FROM auth.users);

-- Clean orphaned messages
DELETE FROM public.messages 
WHERE sender_id NOT IN (SELECT id FROM auth.users);

-- Clean orphaned shelter_applications
DELETE FROM public.shelter_applications 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Clean orphaned chat_messages
DELETE FROM public.chat_messages 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Clean orphaned chat_reactions
DELETE FROM public.chat_reactions 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Clean orphaned chat_presence
DELETE FROM public.chat_presence 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Clean orphaned chat_bans (where banned user is deleted)
DELETE FROM public.chat_bans 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Clean orphaned chat_last_read
DELETE FROM public.chat_last_read 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Clean orphaned dm_conversations (both participants)
DELETE FROM public.dm_conversations 
WHERE participant_1 NOT IN (SELECT id FROM auth.users)
   OR participant_2 NOT IN (SELECT id FROM auth.users);

-- Clean orphaned dm_messages
DELETE FROM public.dm_messages 
WHERE sender_id NOT IN (SELECT id FROM auth.users);

-- Clean orphaned moderation_log
DELETE FROM public.moderation_log 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Clean orphaned reported_content (reporter or reported user deleted)
DELETE FROM public.reported_content 
WHERE reporter_id NOT IN (SELECT id FROM auth.users)
   OR reported_user_id NOT IN (SELECT id FROM auth.users);

-- ============================================
-- PART 2: Nullify "action by" references to deleted users
-- (Keep the records but clear the reference)
-- ============================================

-- Nullify banned_by references to deleted admins
UPDATE public.chat_bans 
SET banned_by = NULL 
WHERE banned_by IS NOT NULL AND banned_by NOT IN (SELECT id FROM auth.users);

-- Nullify deleted_by references to deleted moderators
UPDATE public.chat_messages 
SET deleted_by = NULL 
WHERE deleted_by IS NOT NULL AND deleted_by NOT IN (SELECT id FROM auth.users);

-- Nullify reviewed_by references to deleted reviewers
UPDATE public.shelter_applications 
SET reviewed_by = NULL 
WHERE reviewed_by IS NOT NULL AND reviewed_by NOT IN (SELECT id FROM auth.users);

UPDATE public.moderation_log 
SET reviewed_by = NULL 
WHERE reviewed_by IS NOT NULL AND reviewed_by NOT IN (SELECT id FROM auth.users);

UPDATE public.reported_content 
SET resolved_by = NULL 
WHERE resolved_by IS NOT NULL AND resolved_by NOT IN (SELECT id FROM auth.users);

-- Nullify author_id for blog posts by deleted users
UPDATE public.blog_posts 
SET author_id = NULL 
WHERE author_id IS NOT NULL AND author_id NOT IN (SELECT id FROM auth.users);

-- ============================================
-- PART 3: Clean orphaned child records
-- (Records where parent was deleted but cascade didn't run)
-- ============================================

-- Clean pet_images for deleted pets
DELETE FROM public.pet_images 
WHERE pet_id NOT IN (SELECT id FROM public.pets);

-- Clean vaccinations for deleted pets
DELETE FROM public.vaccinations 
WHERE pet_id NOT IN (SELECT id FROM public.pets);

-- Clean found_reports for deleted pets
DELETE FROM public.found_reports 
WHERE pet_id NOT IN (SELECT id FROM public.pets);

-- Clean pet_journal_entries for deleted pets
DELETE FROM public.pet_journal_entries 
WHERE pet_id NOT IN (SELECT id FROM public.pets);

-- Clean pet_journal_day_colors for deleted pets
DELETE FROM public.pet_journal_day_colors 
WHERE pet_id NOT IN (SELECT id FROM public.pets);

-- Clean lost_found_reports for deleted pets
DELETE FROM public.lost_found_reports 
WHERE pet_id NOT IN (SELECT id FROM public.pets);

-- Clean order_items for deleted orders
DELETE FROM public.order_items 
WHERE order_id NOT IN (SELECT id FROM public.orders);

-- Clean messages for deleted conversations
DELETE FROM public.messages 
WHERE conversation_id NOT IN (SELECT id FROM public.conversations);

-- Clean dm_messages for deleted dm_conversations
DELETE FROM public.dm_messages 
WHERE conversation_id NOT IN (SELECT id FROM public.dm_conversations);

-- Clean QR codes that reference deleted pets (optional - keep unclaimed ones)
-- Only delete if pet was deleted but QR still points to it
UPDATE public.qr_codes 
SET pet_id = NULL 
WHERE pet_id IS NOT NULL AND pet_id NOT IN (SELECT id FROM public.pets);

-- ============================================
-- Output summary
-- ============================================
SELECT 'Cleanup complete! All orphaned data has been removed.' as status;
