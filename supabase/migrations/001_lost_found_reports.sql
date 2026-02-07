-- Πίνακας για αναφορές "Χάθηκα!" (report found).
-- Τρέξτε αυτό το αρχείο στο Supabase Dashboard → SQL Editor → New query → Paste → Run.

create table if not exists public.lost_found_reports (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  reporter_phone text not null,
  created_at timestamptz default now()
);

alter table public.lost_found_reports enable row level security;

-- Ο ιδιοκτήτης βλέπει τις αναφορές για τα δικά του κατοικίδια στο dashboard.
drop policy if exists "Owners can view reports for own pets" on public.lost_found_reports;
create policy "Owners can view reports for own pets" on public.lost_found_reports for select using (
  exists (select 1 from public.pets where pets.id = lost_found_reports.pet_id and pets.owner_id = auth.uid())
);
drop policy if exists "Owners can delete reports for own pets" on public.lost_found_reports;
create policy "Owners can delete reports for own pets" on public.lost_found_reports for delete using (
  exists (select 1 from public.pets where pets.id = lost_found_reports.pet_id and pets.owner_id = auth.uid())
);
