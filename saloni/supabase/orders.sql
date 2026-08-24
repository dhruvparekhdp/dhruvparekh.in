-- ─── SALONI COLLECTION · ORDERS SCHEMA ──────────────────────────
-- Run in: Supabase → SQL Editor → New query
-- Safe to re-run.

-- 1. ORDERS TABLE
create table if not exists orders (
  id              uuid primary key default gen_random_uuid(),
  order_number    text unique not null,

  -- customer
  customer_name   text not null,
  customer_phone  text not null,
  customer_email  text,

  -- delivery address
  address_line    text not null,
  landmark        text,
  city            text not null,
  state           text not null,
  pincode         text not null,

  -- cart snapshot: [{ id, name, price, image_url, size, color, qty }]
  items           jsonb not null,

  -- money (all in Rupees)
  subtotal        numeric(10,2) not null,
  shipping        numeric(10,2) not null default 0,
  total           numeric(10,2) not null,

  -- payment
  payment_method  text not null default 'cod',      -- cod | upi | razorpay
  payment_status  text not null default 'pending',  -- pending | paid | failed | refunded
  payment_ref     text,                             -- UPI txn id / Razorpay payment id

  -- fulfilment
  order_status    text not null default 'placed',   -- placed | confirmed | shipped | delivered | cancelled
  notes           text,

  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists orders_created_at_idx on orders (created_at desc);
create index if not exists orders_status_idx     on orders (order_status);

-- 2. AUTO-UPDATE updated_at
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists orders_touch_updated_at on orders;
create trigger orders_touch_updated_at
  before update on orders
  for each row execute function touch_updated_at();

-- 3. ROW LEVEL SECURITY
alter table orders enable row level security;

-- Anyone (a shopper, not logged in) may place an order.
drop policy if exists "public_insert_orders" on orders;
create policy "public_insert_orders"
  on orders for insert
  with check (true);

-- Only the logged-in admin may read orders.
drop policy if exists "auth_read_orders" on orders;
create policy "auth_read_orders"
  on orders for select
  using (auth.role() = 'authenticated');

-- Only the logged-in admin may update fulfilment / payment status.
drop policy if exists "auth_update_orders" on orders;
create policy "auth_update_orders"
  on orders for update
  using (auth.role() = 'authenticated');

-- Only the logged-in admin may delete.
drop policy if exists "auth_delete_orders" on orders;
create policy "auth_delete_orders"
  on orders for delete
  using (auth.role() = 'authenticated');
