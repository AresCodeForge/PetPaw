-- Upgrade lost & found: pet must be marked lost; reports expire after 48 hours.

-- Pets: allow marking as lost so "report found" is only available when true.
alter table public.pets add column if not exists is_lost boolean not null default false;

-- Reports: auto-expire 48 hours after creation so dashboard only shows recent ones.
alter table public.lost_found_reports add column if not exists expires_at timestamptz;
-- Default for new rows (evaluated at insert time)
alter table public.lost_found_reports alter column expires_at set default (now() + interval '48 hours');
-- Backfill existing rows
update public.lost_found_reports set expires_at = created_at + interval '48 hours' where expires_at is null;
