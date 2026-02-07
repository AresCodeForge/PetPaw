-- Πίνακας χρωμάτων ημερών για το ημερολόγιο κατοικίδιου (διάθεση/μέρα).
-- Αν βλέπετε "Could not find the table 'public.pet_journal_day_colors'" τρέξτε αυτό στο
-- Supabase Dashboard → SQL Editor → New query → Paste → Run.

create table if not exists public.pet_journal_day_colors (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  day date not null,
  color text not null check (color in ('green', 'yellow', 'orange')),
  created_at timestamptz default now(),
  unique(pet_id, day)
);

alter table public.pet_journal_day_colors enable row level security;

drop policy if exists "Owners can manage day colors for own pets" on public.pet_journal_day_colors;
create policy "Owners can manage day colors for own pets" on public.pet_journal_day_colors for all using (
  exists (select 1 from public.pets where pets.id = pet_journal_day_colors.pet_id and pets.owner_id = auth.uid())
);
