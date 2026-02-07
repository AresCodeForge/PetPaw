-- Στήλη entry_date στον πίνακα καταχωρήσεων ημερολογίου (αν λείπει).
-- Τρέξτε στο Supabase Dashboard → SQL Editor αν το ημερολόγιο δείχνει "Αποτυχία φόρτωσης" ή χάνει τις καταχωρήσεις.

alter table public.pet_journal_entries add column if not exists entry_date date;

update public.pet_journal_entries set entry_date = (created_at)::date where entry_date is null;
