-- ============================================
-- Community Chat Migration
-- Creates tables for real-time chat rooms,
-- messages, reactions, presence, and moderation
-- ============================================

-- =========================
-- Chat Rooms Table
-- =========================
create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_en text not null,
  name_el text not null,
  description_en text,
  description_el text,
  type text not null default 'topic' check (type in ('global', 'topic', 'location')),
  icon text, -- emoji or lucide icon name
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Index for chat_rooms
create index if not exists idx_chat_rooms_slug on public.chat_rooms(slug);
create index if not exists idx_chat_rooms_active on public.chat_rooms(is_active, display_order);

-- Enable RLS
alter table public.chat_rooms enable row level security;

-- RLS Policies for chat_rooms
drop policy if exists "Anyone can view active rooms" on public.chat_rooms;
create policy "Anyone can view active rooms" on public.chat_rooms
  for select using (is_active = true);

-- =========================
-- Chat Messages Table
-- =========================
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  image_url text,
  reply_to_id uuid references public.chat_messages(id) on delete set null,
  mentions jsonb not null default '[]'::jsonb, -- Array of user IDs mentioned
  is_deleted boolean not null default false,
  deleted_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- Indexes for chat_messages
create index if not exists idx_chat_messages_room_id on public.chat_messages(room_id);
create index if not exists idx_chat_messages_user_id on public.chat_messages(user_id);
create index if not exists idx_chat_messages_created_at on public.chat_messages(room_id, created_at desc);
create index if not exists idx_chat_messages_reply_to on public.chat_messages(reply_to_id) where reply_to_id is not null;

-- Enable RLS
alter table public.chat_messages enable row level security;

-- RLS Policies for chat_messages
drop policy if exists "Anyone can view non-deleted messages" on public.chat_messages;
create policy "Anyone can view non-deleted messages" on public.chat_messages
  for select using (is_deleted = false);

drop policy if exists "Authenticated users can send messages" on public.chat_messages;
create policy "Authenticated users can send messages" on public.chat_messages
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can soft-delete own messages" on public.chat_messages;
create policy "Users can soft-delete own messages" on public.chat_messages
  for update using (auth.uid() = user_id);

-- =========================
-- Chat Reactions Table
-- =========================
create table if not exists public.chat_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique(message_id, user_id, emoji)
);

-- Indexes for chat_reactions
create index if not exists idx_chat_reactions_message_id on public.chat_reactions(message_id);
create index if not exists idx_chat_reactions_user_id on public.chat_reactions(user_id);

-- Enable RLS
alter table public.chat_reactions enable row level security;

-- RLS Policies for chat_reactions
drop policy if exists "Anyone can view reactions" on public.chat_reactions;
create policy "Anyone can view reactions" on public.chat_reactions
  for select using (true);

drop policy if exists "Authenticated users can add reactions" on public.chat_reactions;
create policy "Authenticated users can add reactions" on public.chat_reactions
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can remove own reactions" on public.chat_reactions;
create policy "Users can remove own reactions" on public.chat_reactions
  for delete using (auth.uid() = user_id);

-- =========================
-- Chat Presence Table
-- =========================
create table if not exists public.chat_presence (
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  last_seen timestamptz not null default now(),
  is_online boolean not null default true,
  primary key (user_id, room_id)
);

-- Indexes for chat_presence
create index if not exists idx_chat_presence_room_online on public.chat_presence(room_id, is_online) where is_online = true;
create index if not exists idx_chat_presence_last_seen on public.chat_presence(last_seen);

-- Enable RLS
alter table public.chat_presence enable row level security;

-- RLS Policies for chat_presence
drop policy if exists "Anyone can view presence" on public.chat_presence;
create policy "Anyone can view presence" on public.chat_presence
  for select using (true);

drop policy if exists "Users can update own presence" on public.chat_presence;
create policy "Users can update own presence" on public.chat_presence
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own presence status" on public.chat_presence;
create policy "Users can update own presence status" on public.chat_presence
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own presence" on public.chat_presence;
create policy "Users can delete own presence" on public.chat_presence
  for delete using (auth.uid() = user_id);

-- =========================
-- Chat Bans Table
-- =========================
create table if not exists public.chat_bans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid references public.chat_rooms(id) on delete cascade, -- null = global ban
  banned_by uuid not null references auth.users(id),
  reason text,
  expires_at timestamptz, -- null = permanent
  created_at timestamptz not null default now()
);

-- Indexes for chat_bans
create index if not exists idx_chat_bans_user_id on public.chat_bans(user_id);
create index if not exists idx_chat_bans_room_id on public.chat_bans(room_id);
create index if not exists idx_chat_bans_expires on public.chat_bans(expires_at) where expires_at is not null;

-- Enable RLS
alter table public.chat_bans enable row level security;

-- RLS Policies for chat_bans
drop policy if exists "Users can view own bans" on public.chat_bans;
create policy "Users can view own bans" on public.chat_bans
  for select using (auth.uid() = user_id);

-- =========================
-- User Last Read Tracking
-- =========================
create table if not exists public.chat_last_read (
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, room_id)
);

-- Enable RLS
alter table public.chat_last_read enable row level security;

-- RLS Policies for chat_last_read
drop policy if exists "Users can view own last read" on public.chat_last_read;
create policy "Users can view own last read" on public.chat_last_read
  for select using (auth.uid() = user_id);

drop policy if exists "Users can update own last read" on public.chat_last_read;
create policy "Users can update own last read" on public.chat_last_read
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can upsert own last read" on public.chat_last_read;
create policy "Users can upsert own last read" on public.chat_last_read
  for update using (auth.uid() = user_id);

-- =========================
-- Enable Realtime
-- =========================
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.chat_reactions;
alter publication supabase_realtime add table public.chat_presence;

-- =========================
-- Seed Default Rooms
-- =========================
insert into public.chat_rooms (slug, name_en, name_el, description_en, description_el, type, icon, display_order) values
  ('general', 'General', 'Γενικά', 'General discussion for all pet lovers', 'Γενική συζήτηση για όλους τους λάτρεις των ζώων', 'global', 'MessageCircle', 1),
  ('dogs', 'Dog Lovers', 'Λάτρεις Σκύλων', 'Everything about dogs!', 'Τα πάντα για σκύλους!', 'topic', 'Dog', 2),
  ('cats', 'Cat Lovers', 'Λάτρεις Γατών', 'Everything about cats!', 'Τα πάντα για γάτες!', 'topic', 'Cat', 3),
  ('health', 'Health & Care', 'Υγεία & Φροντίδα', 'Pet health tips and advice', 'Συμβουλές για την υγεία των κατοικιδίων', 'topic', 'Heart', 4),
  ('training', 'Training Tips', 'Συμβουλές Εκπαίδευσης', 'Training and behavior tips', 'Συμβουλές εκπαίδευσης και συμπεριφοράς', 'topic', 'GraduationCap', 5),
  ('adoption-chat', 'Adoption Talk', 'Συζήτηση Υιοθεσίας', 'Discuss pet adoption experiences', 'Συζητήστε εμπειρίες υιοθεσίας κατοικιδίων', 'topic', 'Heart', 6)
on conflict (slug) do nothing;

-- =========================
-- Comments
-- =========================
comment on table public.chat_rooms is 'Predefined chat rooms for community discussion';
comment on column public.chat_rooms.type is 'Room type: global (main), topic (subject-based), location (city-based)';
comment on column public.chat_rooms.icon is 'Lucide icon name or emoji for the room';

comment on table public.chat_messages is 'Individual chat messages in rooms';
comment on column public.chat_messages.mentions is 'JSONB array of user IDs mentioned in the message';
comment on column public.chat_messages.is_deleted is 'Soft delete flag - content hidden but record kept';

comment on table public.chat_reactions is 'Emoji reactions on chat messages';

comment on table public.chat_presence is 'Real-time presence tracking for users in rooms';
comment on column public.chat_presence.is_online is 'Whether user is currently active in the room';

comment on table public.chat_bans is 'User bans/mutes from chat rooms';
comment on column public.chat_bans.room_id is 'Null means global ban from all rooms';
comment on column public.chat_bans.expires_at is 'Null means permanent ban';

comment on table public.chat_last_read is 'Tracks last read message timestamp per user per room for unread counts';
