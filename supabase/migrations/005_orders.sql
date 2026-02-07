-- Orders system: products, shipping_addresses, orders, order_items; link qr_codes to order_items

-- Products (e.g. QR Tag) for order line items
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric not null check (price >= 0),
  image_url text,
  created_at timestamptz default now()
);

alter table public.products enable row level security;
-- Products are readable by everyone (for checkout); only admin can manage (via service role)
create policy "Public can view products" on public.products for select using (true);

-- Shipping addresses (per user, optional user_id for guest checkout later)
create table if not exists public.shipping_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  full_name text not null,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text,
  zip_code text not null,
  country text not null,
  phone_number text not null,
  created_at timestamptz default now()
);

alter table public.shipping_addresses enable row level security;
drop policy if exists "Users can manage own shipping addresses" on public.shipping_addresses;
create policy "Users can manage own shipping addresses" on public.shipping_addresses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'payment_pending' check (status in (
    'payment_pending', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'
  )),
  total_amount numeric not null check (total_amount >= 0),
  shipping_address_id uuid not null references public.shipping_addresses(id) on delete restrict,
  payment_status text not null default 'pending' check (payment_status in (
    'pending', 'paid', 'failed', 'refunded'
  )),
  tracking_number text,
  carrier text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.orders enable row level security;
drop policy if exists "Users can view own orders" on public.orders;
create policy "Users can view own orders" on public.orders for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own orders" on public.orders;
create policy "Users can insert own orders" on public.orders for insert with check (auth.uid() = user_id);

-- Order items
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity int not null check (quantity > 0),
  price_per_item numeric not null check (price_per_item >= 0),
  created_at timestamptz default now()
);

alter table public.order_items enable row level security;
drop policy if exists "Users can view order_items for own orders" on public.order_items;
create policy "Users can view order_items for own orders" on public.order_items for select using (
  exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
);
drop policy if exists "Users can insert order_items for own orders" on public.order_items;
create policy "Users can insert order_items for own orders" on public.order_items for insert with check (
  exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
);

-- Trigger: update orders.updated_at
create or replace function public.set_orders_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;
drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_orders_updated_at();

-- Indexes for orders list and detail
create index if not exists orders_user_id_created_at_idx on public.orders (user_id, created_at desc);
create index if not exists order_items_order_id_idx on public.order_items (order_id);

-- Link qr_codes to order_item (for fulfillment: which tags belong to which order line)
alter table public.qr_codes add column if not exists order_item_id uuid references public.order_items(id) on delete set null;

-- Seed default product: QR Tag (idempotent)
insert into public.products (id, name, description, price, image_url)
values (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'QR Tag',
  'PetPaw QR keyring for pet profile and lost/found.',
  4.99,
  null
)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price;
