-- ============================================
-- Add profiles foreign keys for PostgREST joins
-- Tables reference auth.users(id) but API queries
-- need to join with profiles — PostgREST requires
-- explicit FKs to resolve these relationships
-- ============================================

-- conversations.adopter_id -> profiles
alter table public.conversations
  add constraint conversations_adopter_id_profiles_fkey
  foreign key (adopter_id) references public.profiles(id) on delete cascade;

-- conversations.poster_id -> profiles
alter table public.conversations
  add constraint conversations_poster_id_profiles_fkey
  foreign key (poster_id) references public.profiles(id) on delete cascade;

-- adoption_listings.user_id -> profiles
alter table public.adoption_listings
  add constraint adoption_listings_user_id_profiles_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

-- messages.sender_id -> profiles
alter table public.messages
  add constraint messages_sender_id_profiles_fkey
  foreign key (sender_id) references public.profiles(id) on delete cascade;

-- shelter_applications.user_id -> profiles
alter table public.shelter_applications
  add constraint shelter_applications_user_id_profiles_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;
