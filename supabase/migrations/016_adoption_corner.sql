-- ============================================
-- Adoption Corner Migration
-- Creates all tables for pet adoption listings,
-- messaging, favorites, and shelter verification
-- ============================================

-- =========================
-- Extend profiles table for shelter info
-- =========================
alter table public.profiles 
  add column if not exists is_shelter boolean default false,
  add column if not exists shelter_name text,
  add column if not exists shelter_verified_at timestamptz;

-- =========================
-- Adoption Listings Table
-- =========================
create table if not exists public.adoption_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null,
  pet_name text not null,
  species text not null check (species in ('dog', 'cat', 'other')),
  breed text,
  age_years integer default 0,
  age_months integer default 0,
  gender text check (gender in ('male', 'female', 'unknown')),
  size text check (size in ('small', 'medium', 'large')),
  location_city text,
  location_country text,
  story text,
  status text not null default 'available' check (status in ('available', 'pending', 'adopted')),
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for adoption_listings
create index if not exists idx_adoption_listings_user_id on public.adoption_listings(user_id);
create index if not exists idx_adoption_listings_species on public.adoption_listings(species);
create index if not exists idx_adoption_listings_status on public.adoption_listings(status);
create index if not exists idx_adoption_listings_is_approved on public.adoption_listings(is_approved);
create index if not exists idx_adoption_listings_created_at on public.adoption_listings(created_at desc);
create index if not exists idx_adoption_listings_location on public.adoption_listings(location_country, location_city);

-- Enable RLS
alter table public.adoption_listings enable row level security;

-- RLS Policies for adoption_listings
drop policy if exists "Public can view approved available listings" on public.adoption_listings;
create policy "Public can view approved available listings" on public.adoption_listings
  for select using (is_approved = true);

drop policy if exists "Users can view own listings" on public.adoption_listings;
create policy "Users can view own listings" on public.adoption_listings
  for select using (auth.uid() = user_id);

drop policy if exists "Authenticated users can create listings" on public.adoption_listings;
create policy "Authenticated users can create listings" on public.adoption_listings
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own listings" on public.adoption_listings;
create policy "Users can update own listings" on public.adoption_listings
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own listings" on public.adoption_listings;
create policy "Users can delete own listings" on public.adoption_listings
  for delete using (auth.uid() = user_id);

-- Updated_at trigger for adoption_listings
create or replace function public.adoption_listings_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists adoption_listings_updated_at on public.adoption_listings;
create trigger adoption_listings_updated_at
  before update on public.adoption_listings
  for each row execute function public.adoption_listings_set_updated_at();

-- =========================
-- Adoption Images Table
-- =========================
create table if not exists public.adoption_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.adoption_listings(id) on delete cascade,
  image_url text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Index for adoption_images
create index if not exists idx_adoption_images_listing_id on public.adoption_images(listing_id);

-- Enable RLS
alter table public.adoption_images enable row level security;

-- RLS Policies for adoption_images
drop policy if exists "Public can view images of approved listings" on public.adoption_images;
create policy "Public can view images of approved listings" on public.adoption_images
  for select using (
    exists (
      select 1 from public.adoption_listings 
      where id = listing_id and is_approved = true
    )
  );

drop policy if exists "Users can view images of own listings" on public.adoption_images;
create policy "Users can view images of own listings" on public.adoption_images
  for select using (
    exists (
      select 1 from public.adoption_listings 
      where id = listing_id and user_id = auth.uid()
    )
  );

drop policy if exists "Users can add images to own listings" on public.adoption_images;
create policy "Users can add images to own listings" on public.adoption_images
  for insert with check (
    exists (
      select 1 from public.adoption_listings 
      where id = listing_id and user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete images from own listings" on public.adoption_images;
create policy "Users can delete images from own listings" on public.adoption_images
  for delete using (
    exists (
      select 1 from public.adoption_listings 
      where id = listing_id and user_id = auth.uid()
    )
  );

-- =========================
-- Adoption Favorites Table
-- =========================
create table if not exists public.adoption_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.adoption_listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, listing_id)
);

-- Indexes for adoption_favorites
create index if not exists idx_adoption_favorites_user_id on public.adoption_favorites(user_id);
create index if not exists idx_adoption_favorites_listing_id on public.adoption_favorites(listing_id);

-- Enable RLS
alter table public.adoption_favorites enable row level security;

-- RLS Policies for adoption_favorites
drop policy if exists "Users can view own favorites" on public.adoption_favorites;
create policy "Users can view own favorites" on public.adoption_favorites
  for select using (auth.uid() = user_id);

drop policy if exists "Users can add favorites" on public.adoption_favorites;
create policy "Users can add favorites" on public.adoption_favorites
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can remove own favorites" on public.adoption_favorites;
create policy "Users can remove own favorites" on public.adoption_favorites
  for delete using (auth.uid() = user_id);

-- =========================
-- Conversations Table
-- =========================
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.adoption_listings(id) on delete cascade,
  adopter_id uuid not null references auth.users(id) on delete cascade,
  poster_id uuid not null references auth.users(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(listing_id, adopter_id)
);

-- Indexes for conversations
create index if not exists idx_conversations_adopter_id on public.conversations(adopter_id);
create index if not exists idx_conversations_poster_id on public.conversations(poster_id);
create index if not exists idx_conversations_listing_id on public.conversations(listing_id);
create index if not exists idx_conversations_last_message on public.conversations(last_message_at desc);

-- Enable RLS
alter table public.conversations enable row level security;

-- RLS Policies for conversations
drop policy if exists "Users can view own conversations" on public.conversations;
create policy "Users can view own conversations" on public.conversations
  for select using (auth.uid() = adopter_id or auth.uid() = poster_id);

drop policy if exists "Adopters can create conversations" on public.conversations;
create policy "Adopters can create conversations" on public.conversations
  for insert with check (auth.uid() = adopter_id);

drop policy if exists "Participants can update conversation" on public.conversations;
create policy "Participants can update conversation" on public.conversations
  for update using (auth.uid() = adopter_id or auth.uid() = poster_id);

-- =========================
-- Messages Table
-- =========================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Indexes for messages
create index if not exists idx_messages_conversation_id on public.messages(conversation_id);
create index if not exists idx_messages_sender_id on public.messages(sender_id);
create index if not exists idx_messages_created_at on public.messages(created_at desc);
create index if not exists idx_messages_is_read on public.messages(is_read) where is_read = false;

-- Enable RLS
alter table public.messages enable row level security;

-- RLS Policies for messages
drop policy if exists "Conversation participants can view messages" on public.messages;
create policy "Conversation participants can view messages" on public.messages
  for select using (
    exists (
      select 1 from public.conversations 
      where id = conversation_id 
      and (adopter_id = auth.uid() or poster_id = auth.uid())
    )
  );

drop policy if exists "Conversation participants can send messages" on public.messages;
create policy "Conversation participants can send messages" on public.messages
  for insert with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.conversations 
      where id = conversation_id 
      and (adopter_id = auth.uid() or poster_id = auth.uid())
    )
  );

drop policy if exists "Recipients can mark messages as read" on public.messages;
create policy "Recipients can mark messages as read" on public.messages
  for update using (
    exists (
      select 1 from public.conversations 
      where id = conversation_id 
      and (adopter_id = auth.uid() or poster_id = auth.uid())
    )
    and sender_id != auth.uid()
  );

-- =========================
-- Shelter Applications Table
-- =========================
create table if not exists public.shelter_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_name text not null,
  registration_number text,
  address text,
  phone text,
  website text,
  description text,
  document_urls jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_notes text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for shelter_applications
create index if not exists idx_shelter_applications_user_id on public.shelter_applications(user_id);
create index if not exists idx_shelter_applications_status on public.shelter_applications(status);
create index if not exists idx_shelter_applications_created_at on public.shelter_applications(created_at desc);

-- Enable RLS
alter table public.shelter_applications enable row level security;

-- RLS Policies for shelter_applications
drop policy if exists "Users can view own applications" on public.shelter_applications;
create policy "Users can view own applications" on public.shelter_applications
  for select using (auth.uid() = user_id);

drop policy if exists "Users can create applications" on public.shelter_applications;
create policy "Users can create applications" on public.shelter_applications
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update pending applications" on public.shelter_applications;
create policy "Users can update pending applications" on public.shelter_applications
  for update using (auth.uid() = user_id and status = 'pending');

-- Updated_at trigger for shelter_applications
create or replace function public.shelter_applications_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists shelter_applications_updated_at on public.shelter_applications;
create trigger shelter_applications_updated_at
  before update on public.shelter_applications
  for each row execute function public.shelter_applications_set_updated_at();

-- =========================
-- Enable Realtime for Messages
-- =========================
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;

-- =========================
-- Comments
-- =========================
comment on table public.adoption_listings is 'Pet adoption listings from users and shelters';
comment on column public.adoption_listings.is_approved is 'Whether the listing has been approved by admin';
comment on column public.adoption_listings.status is 'Adoption status: available, pending, or adopted';

comment on table public.adoption_images is 'Images for adoption listings (up to 5 per listing)';
comment on table public.adoption_favorites is 'User wishlists for favorite adoption listings';

comment on table public.conversations is 'Chat threads between potential adopters and listing posters';
comment on column public.conversations.adopter_id is 'User who initiated contact about adopting';
comment on column public.conversations.poster_id is 'User who posted the listing';

comment on table public.messages is 'Individual chat messages within conversations';
comment on column public.messages.is_read is 'Whether the recipient has read this message';

comment on table public.shelter_applications is 'Applications from organizations to become verified shelters';
comment on column public.shelter_applications.document_urls is 'JSONB array of uploaded verification document URLs';
comment on column public.shelter_applications.status is 'Application status: pending, approved, or rejected';
