-- Align orders schema with plan: postal_code, phone, order_number, cents, qr_codes.order_id

-- shipping_addresses: plan uses postal_code and phone (rename from zip_code, phone_number)
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'shipping_addresses' and column_name = 'zip_code') then
    alter table public.shipping_addresses rename column zip_code to postal_code;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'shipping_addresses' and column_name = 'phone_number') then
    alter table public.shipping_addresses rename column phone_number to phone;
  end if;
end $$;

-- orders: order_number (unique), total_cents, currency, stripe_payment_intent_id
alter table public.orders add column if not exists order_number text unique;
alter table public.orders add column if not exists total_cents integer;
alter table public.orders add column if not exists currency text default 'eur';
alter table public.orders add column if not exists stripe_payment_intent_id text;
update public.orders set total_cents = round(total_amount * 100)::int where total_cents is null and total_amount is not null;
update public.orders set order_number = 'PP-' || to_char(created_at, 'YYYYMMDD') || '-' || lower(substring(replace(id::text, '-', '') from 1 for 6)) where order_number is null;
create unique index if not exists orders_order_number_key on public.orders (order_number);

-- products: sku, price_cents, currency, is_active
alter table public.products add column if not exists sku text unique;
alter table public.products add column if not exists price_cents integer;
alter table public.products add column if not exists currency text default 'eur';
alter table public.products add column if not exists is_active boolean default true;
update public.products set price_cents = round(price * 100)::int where price_cents is null and price is not null;
update public.products set sku = 'QR-TAG' where id = '00000000-0000-0000-0000-000000000001'::uuid and (sku is null or sku = '');

-- order_items: unit_price_cents
alter table public.order_items add column if not exists unit_price_cents integer;
update public.order_items set unit_price_cents = round(price_per_item * 100)::int where unit_price_cents is null and price_per_item is not null;

-- qr_codes: order_id (nullable FK to orders) per plan
alter table public.qr_codes add column if not exists order_id uuid references public.orders(id) on delete set null;
