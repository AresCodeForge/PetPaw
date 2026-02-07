-- Journal and calendar: only PRO tier can read/write (RLS by owner tier).

-- Helper: true if the pet's owner has tier = 'pro'.
create or replace function public.pet_owner_is_pro(pet_uuid uuid)
returns boolean as $$
  select (select tier from public.profiles where id = (select owner_id from public.pets where id = pet_uuid)) = 'pro';
$$ language sql security definer stable;

-- pet_journal_entries: drop old policies, add PRO-only.
drop policy if exists "Owners can manage journal for own pets" on public.pet_journal_entries;
drop policy if exists "Owners can view journal for own pets" on public.pet_journal_entries;

create policy "Pro owners can manage journal entries" on public.pet_journal_entries
  for all using (
    auth.uid() = owner_id and public.pet_owner_is_pro(pet_id)
  );

-- pet_journal_day_colors: drop old policy, add PRO-only.
drop policy if exists "Owners can manage day colors for own pets" on public.pet_journal_day_colors;

create policy "Pro owners can manage day colors" on public.pet_journal_day_colors
  for all using (
    exists (
      select 1 from public.pets p
      where p.id = pet_journal_day_colors.pet_id
        and p.owner_id = auth.uid()
        and public.pet_owner_is_pro(p.id)
    )
  );
