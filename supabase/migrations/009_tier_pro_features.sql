-- FREE vs PRO: prevent self-assign tier, PRO-only pet fields, pet_vaccinations, pets trigger.
-- Also ensure is_lost exists (from 008) in case 008 was not run.

alter table public.pets add column if not exists is_lost boolean not null default false;
alter table public.lost_found_reports add column if not exists expires_at timestamptz;
alter table public.lost_found_reports alter column expires_at set default (now() + interval '48 hours');
update public.lost_found_reports set expires_at = created_at + interval '48 hours' where expires_at is null;

-- 1. Profiles: user cannot change own tier (only service role / admin can).
create or replace function public.profiles_keep_tier_on_self_update()
returns trigger as $$
begin
  if auth.uid() = old.id then
    new.tier = old.tier;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists profiles_keep_tier_trigger on public.profiles;
create trigger profiles_keep_tier_trigger
  before update on public.profiles
  for each row execute function public.profiles_keep_tier_on_self_update();

-- 2. Pets: PRO-only columns (vet contact, diet).
alter table public.pets add column if not exists vet_contact text;
alter table public.pets add column if not exists diet_info text;

-- 3. Pet vaccinations (PRO feature).
create table if not exists public.pet_vaccinations (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  name text not null,
  administered_at date not null,
  notes text,
  created_at timestamptz default now()
);

alter table public.pet_vaccinations enable row level security;

drop policy if exists "Owners can manage vaccinations for own pets" on public.pet_vaccinations;
drop policy if exists "Owners can view vaccinations for own pets" on public.pet_vaccinations;
create policy "Owners can manage vaccinations for own pets" on public.pet_vaccinations
  for all using (
    exists (select 1 from public.pets where pets.id = pet_vaccinations.pet_id and pets.owner_id = auth.uid())
  );
create policy "Owners can view vaccinations for own pets" on public.pet_vaccinations
  for select using (
    exists (select 1 from public.pets where pets.id = pet_vaccinations.pet_id and pets.owner_id = auth.uid())
  );

-- 4. Pets trigger: for free-tier owners, force PRO-only fields to null/false.
create or replace function public.pets_strip_pro_fields_for_free_tier()
returns trigger as $$
declare
  owner_tier text;
begin
  select coalesce(tier, 'free') into owner_tier
  from public.profiles
  where id = coalesce(new.owner_id, old.owner_id);

  if owner_tier <> 'pro' then
    new.medication_notes := null;
    new.private_notes := null;
    new.is_lost := false;
    new.vet_contact := null;
    new.diet_info := null;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists pets_strip_pro_fields_trigger on public.pets;
create trigger pets_strip_pro_fields_trigger
  before insert or update on public.pets
  for each row execute function public.pets_strip_pro_fields_for_free_tier();
