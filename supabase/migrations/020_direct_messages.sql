-- ============================================
-- Direct Messages Migration
-- Creates tables for private messaging between users
-- ============================================

-- =========================
-- DM Conversations Table
-- =========================
create table if not exists public.dm_conversations (
  id uuid primary key default gen_random_uuid(),
  participant_1 uuid not null references auth.users(id) on delete cascade,
  participant_2 uuid not null references auth.users(id) on delete cascade,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  -- Prevent self-conversations
  constraint no_self_dm check (participant_1 != participant_2)
);

-- Ensure unique conversation between two users (order-independent) using a unique index
create unique index if not exists idx_dm_unique_participants 
  on public.dm_conversations (least(participant_1, participant_2), greatest(participant_1, participant_2));

-- Indexes for dm_conversations
create index if not exists idx_dm_conversations_participant_1 on public.dm_conversations(participant_1);
create index if not exists idx_dm_conversations_participant_2 on public.dm_conversations(participant_2);
create index if not exists idx_dm_conversations_last_message on public.dm_conversations(last_message_at desc nulls last);

-- Enable RLS
alter table public.dm_conversations enable row level security;

-- RLS Policies for dm_conversations
drop policy if exists "Users can view own conversations" on public.dm_conversations;
create policy "Users can view own conversations" on public.dm_conversations
  for select using (auth.uid() = participant_1 or auth.uid() = participant_2);

drop policy if exists "Users can create conversations" on public.dm_conversations;
create policy "Users can create conversations" on public.dm_conversations
  for insert with check (auth.uid() = participant_1 or auth.uid() = participant_2);

-- =========================
-- DM Messages Table
-- =========================
create table if not exists public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.dm_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  image_url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Indexes for dm_messages
create index if not exists idx_dm_messages_conversation on public.dm_messages(conversation_id, created_at desc);
create index if not exists idx_dm_messages_sender on public.dm_messages(sender_id);
create index if not exists idx_dm_messages_unread on public.dm_messages(conversation_id, is_read) where is_read = false;

-- Enable RLS
alter table public.dm_messages enable row level security;

-- RLS Policies for dm_messages
drop policy if exists "Users can view messages in own conversations" on public.dm_messages;
create policy "Users can view messages in own conversations" on public.dm_messages
  for select using (
    exists (
      select 1 from public.dm_conversations c
      where c.id = conversation_id
      and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
  );

drop policy if exists "Users can send messages to own conversations" on public.dm_messages;
create policy "Users can send messages to own conversations" on public.dm_messages
  for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.dm_conversations c
      where c.id = conversation_id
      and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
  );

drop policy if exists "Users can mark messages as read" on public.dm_messages;
create policy "Users can mark messages as read" on public.dm_messages
  for update using (
    exists (
      select 1 from public.dm_conversations c
      where c.id = conversation_id
      and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
  );

-- =========================
-- Function to update last_message_at
-- =========================
create or replace function update_dm_last_message_at()
returns trigger as $$
begin
  update public.dm_conversations
  set last_message_at = NEW.created_at
  where id = NEW.conversation_id;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trigger_update_dm_last_message on public.dm_messages;
create trigger trigger_update_dm_last_message
  after insert on public.dm_messages
  for each row
  execute function update_dm_last_message_at();

-- =========================
-- Enable Realtime
-- =========================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' 
    and schemaname = 'public' 
    and tablename = 'dm_messages'
  ) then
    alter publication supabase_realtime add table public.dm_messages;
  end if;
end $$;

-- =========================
-- Comments
-- =========================
comment on table public.dm_conversations is 'Private DM conversations between two users';
comment on column public.dm_conversations.participant_1 is 'First participant (order determined by constraint)';
comment on column public.dm_conversations.participant_2 is 'Second participant';
comment on column public.dm_conversations.last_message_at is 'Timestamp of last message for sorting';

comment on table public.dm_messages is 'Individual messages in DM conversations';
comment on column public.dm_messages.is_read is 'Whether the recipient has read the message';
