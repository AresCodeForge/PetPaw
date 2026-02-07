-- Only show addresses in "saved addresses" list when user explicitly saved them.
-- When order is placed with inline address and "Save address" unchecked, we still insert
-- into shipping_addresses (for the order) but with saved_for_reuse = false.
alter table public.shipping_addresses add column if not exists saved_for_reuse boolean not null default true;
