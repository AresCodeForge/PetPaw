-- =============================================================================
-- PetPaw Supabase schema
-- =============================================================================
-- HOW TO RUN: Copy this ENTIRE file (all lines) and paste into
-- Supabase Dashboard → SQL Editor → New query → Run.
-- Do NOT type the file path "supabase/schema.sql" in the SQL Editor.
-- =============================================================================

-- Profiles (extends auth.users; id = auth.uid())
-- tier: 'free' = αγορά QR keyring, βασικά features. 'pro' = έξτρα features (αργότερα).
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  tier text not null default 'free' check (tier in ('free', 'pro')),
  created_at timestamptz default now()
);
alter table public.profiles add column if not exists tier text default 'free';

-- Pets
-- description = δημόσια περιγραφή. medication_notes = δημόσιο (αν παίρνει φαρμακευτική αγωγή). private_notes = μόνο ιδιοκτήτης.
create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null,
  age int,
  description text,
  medication_notes text,
  private_notes text,
  image_url text,
  qr_code_id uuid,
  created_at timestamptz default now()
);

-- Ensure all pets columns exist (fixes "column X not in schema cache" when table was created earlier)
alter table public.pets add column if not exists name text;
alter table public.pets add column if not exists type text default 'Dog';
alter table public.pets add column if not exists age int;
alter table public.pets add column if not exists description text;
alter table public.pets add column if not exists medication_notes text;
alter table public.pets add column if not exists private_notes text;
alter table public.pets add column if not exists image_url text;
alter table public.pets add column if not exists qr_code_id uuid;

-- Pet images: up to 3 per pet, stored in Supabase Storage; image_url = public URL
create table if not exists public.pet_images (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  image_url text not null,
  sort_order int not null default 0,
  created_at timestamptz default now()
);

alter table public.pet_images enable row level security;

drop policy if exists "Owners can manage pet_images for own pets" on public.pet_images;
drop policy if exists "Public can view pet_images" on public.pet_images;
create policy "Owners can manage pet_images for own pets" on public.pet_images for all using (
  exists (select 1 from public.pets where pets.id = pet_images.pet_id and pets.owner_id = auth.uid())
);
create policy "Public can view pet_images" on public.pet_images for select using (true);

-- QR codes: one per pet (or unassigned for pre-print). Pre-print: pet_id null, short_code set, qr_code_data = baseUrl/r/short_code.
create table if not exists public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid references public.pets(id) on delete cascade,
  short_code text,
  qr_code_data text not null,
  printed_at timestamptz,
  created_at timestamptz default now()
);

-- Ensure columns exist for existing tables
alter table public.qr_codes add column if not exists short_code text;
alter table public.qr_codes add column if not exists printed_at timestamptz;
alter table public.qr_codes alter column pet_id drop not null;

-- Backfill short_code for existing rows (idempotent: only where short_code is null)
update public.qr_codes
set short_code = lower(substring(md5(id::text || coalesce(pet_id::text, '') || created_at::text) from 1 for 8))
where short_code is null;

-- Make short_code not null and unique (run after backfill)
alter table public.qr_codes alter column short_code set not null;
drop index if exists qr_codes_short_code_key;
create unique index qr_codes_short_code_key on public.qr_codes (short_code);

-- Link pets.qr_code_id → qr_codes.id (safe to re-run)
alter table public.pets drop constraint if exists pets_qr_code_id_fkey;
alter table public.pets add constraint pets_qr_code_id_fkey foreign key (qr_code_id) references public.qr_codes(id) on delete set null;

-- Pet journal: ιδιοκτήτης καταχωρεί σημειώσεις (φάρμακα, διάθεση, προβλήματα κλπ), επεξεργάσιμες ανά πάσα στιγμή.
-- entry_date = ημέρα που αφορά η καταχώρηση (επιλέγει ο χρήστης από ημερολόγιο).
create table if not exists public.pet_journal_entries (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  entry_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.pet_journal_entries add column if not exists entry_date date;
-- Backfill: υπάρχουσες καταχωρήσεις = ημέρα created_at
update public.pet_journal_entries set entry_date = (created_at)::date where entry_date is null;
alter table public.pet_journal_entries enable row level security;
drop policy if exists "Owners can manage journal for own pets" on public.pet_journal_entries;
drop policy if exists "Owners can view journal for own pets" on public.pet_journal_entries;
create policy "Owners can manage journal for own pets" on public.pet_journal_entries for all using (auth.uid() = owner_id);
create policy "Owners can view journal for own pets" on public.pet_journal_entries for select using (
  exists (select 1 from public.pets where pets.id = pet_journal_entries.pet_id and pets.owner_id = auth.uid())
);

-- Trigger: update updated_at on pet_journal_entries
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;
drop trigger if exists pet_journal_entries_updated_at on public.pet_journal_entries;
create trigger pet_journal_entries_updated_at
  before update on public.pet_journal_entries
  for each row execute function public.set_updated_at();

-- Day mood/color for calendar: one color per pet per calendar day (green / yellow / orange)
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

-- Lost/found reports: όταν κάποιος πατά "Χάθηκα!" στο δημόσιο προφίλ, αποθηκεύεται pet_id + τηλέφωνο (email στέλνεται via API).
create table if not exists public.lost_found_reports (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  reporter_phone text not null,
  created_at timestamptz default now()
);
alter table public.lost_found_reports enable row level security;
-- Insert: μόνο μέσω API (service role). Select: ο ιδιοκτήτης βλέπει τις αναφορές για τα δικά του pets.
drop policy if exists "Owners can view reports for own pets" on public.lost_found_reports;
create policy "Owners can view reports for own pets" on public.lost_found_reports for select using (
  exists (select 1 from public.pets where pets.id = lost_found_reports.pet_id and pets.owner_id = auth.uid())
);
drop policy if exists "Owners can delete reports for own pets" on public.lost_found_reports;
create policy "Owners can delete reports for own pets" on public.lost_found_reports for delete using (
  exists (select 1 from public.pets where pets.id = lost_found_reports.pet_id and pets.owner_id = auth.uid())
);

-- RLS
alter table public.profiles enable row level security;
alter table public.pets enable row level security;
alter table public.qr_codes enable row level security;

-- Policies (drop first so re-run works)
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Owners can manage own pets" on public.pets;
drop policy if exists "Public can view any pet" on public.pets;
create policy "Owners can manage own pets" on public.pets for all using (auth.uid() = owner_id);
create policy "Public can view any pet" on public.pets for select using (true);

drop policy if exists "Owners can manage qr_codes for own pets" on public.qr_codes;
drop policy if exists "Public can view qr_codes" on public.qr_codes;
drop policy if exists "Users can claim unclaimed qr_codes" on public.qr_codes;
create policy "Owners can manage qr_codes for own pets" on public.qr_codes for all using (
  qr_codes.pet_id is not null and exists (select 1 from public.pets where pets.id = qr_codes.pet_id and pets.owner_id = auth.uid())
);
create policy "Public can view qr_codes" on public.qr_codes for select using (true);
create policy "Users can claim unclaimed qr_codes" on public.qr_codes for update
  using (qr_codes.pet_id is null)
  with check (exists (select 1 from public.pets where pets.id = qr_codes.pet_id and pets.owner_id = auth.uid()));

-- Storage bucket for pet images (path: {user_id}/{pet_id}/{filename})
-- If this fails (e.g. bucket exists), create bucket "pet-images" in Dashboard → Storage, set public.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pet-images',
  'pet-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "Users can upload pet images" on storage.objects;
create policy "Users can upload pet images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'pet-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own pet images" on storage.objects;
create policy "Users can update own pet images" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'pet-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own pet images" on storage.objects;
create policy "Users can delete own pet images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'pet-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Public can view pet images" on storage.objects;
create policy "Public can view pet images" on storage.objects
  for select to public
  using (bucket_id = 'pet-images');
