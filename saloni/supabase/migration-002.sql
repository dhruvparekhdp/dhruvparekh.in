-- ═══ SALONI · MIGRATION 002 ═════════════════════════════════════
-- Adds product detail fields, stock control, and order fulfilment
-- tracking. Run in: Supabase -> SQL Editor. Safe to re-run.

-- ─── PRODUCTS: detail that clothing actually needs to sell ─────
alter table products add column if not exists fabric        text;
alter table products add column if not exists care          text;
alter table products add column if not exists measurements  jsonb default '{}'::jsonb;
alter table products add column if not exists model_note    text;

-- ─── PRODUCTS: stock control ───────────────────────────────────
-- in_stock false hides the buy button entirely.
-- sold_out_sizes blocks individual sizes while the piece stays listed.
alter table products add column if not exists in_stock        boolean   not null default true;
alter table products add column if not exists sold_out_sizes  text[]    default '{}';

-- ─── ORDERS: fulfilment ────────────────────────────────────────
alter table orders add column if not exists courier          text;
alter table orders add column if not exists tracking_number  text;
alter table orders add column if not exists tracking_url     text;
alter table orders add column if not exists dispatched_at    timestamptz;

-- ─── ORDER LOOKUP ──────────────────────────────────────────────
-- Customers must be able to check their own order without an account.
-- RLS forbids anonymous SELECT on orders, so expose exactly one row
-- through a function that requires BOTH the order number and the phone
-- it was placed with. security definer bypasses RLS inside the function
-- only; the search_path pin stops search-path hijacking.
create or replace function public.track_order(p_order_number text, p_phone text)
returns table (
  order_number    text,
  order_status    text,
  payment_method  text,
  payment_status  text,
  total           numeric,
  items           jsonb,
  city            text,
  state           text,
  courier         text,
  tracking_number text,
  tracking_url    text,
  created_at      timestamptz,
  dispatched_at   timestamptz
)
language sql
security definer
set search_path = public
as $$
  select o.order_number, o.order_status, o.payment_method, o.payment_status,
         o.total, o.items, o.city, o.state, o.courier, o.tracking_number,
         o.tracking_url, o.created_at, o.dispatched_at
  from orders o
  where upper(trim(o.order_number)) = upper(trim(p_order_number))
    and o.customer_phone = regexp_replace(p_phone, '\D', '', 'g')
  limit 1;
$$;

revoke all on function public.track_order(text, text) from public;
grant execute on function public.track_order(text, text) to anon, authenticated;

-- ─── ORDER INTEGRITY ───────────────────────────────────────────
-- The public can insert orders, so constrain what they may write.
alter table orders drop constraint if exists orders_totals_sane;
alter table orders add constraint orders_totals_sane check (
  subtotal >= 0 and shipping >= 0 and total >= 0 and total <= 1000000
);

alter table orders drop constraint if exists orders_phone_valid;
alter table orders add constraint orders_phone_valid check (
  customer_phone ~ '^[6-9][0-9]{9}$'
);

alter table orders drop constraint if exists orders_pincode_valid;
alter table orders add constraint orders_pincode_valid check (
  pincode ~ '^[1-9][0-9]{5}$'
);

alter table orders drop constraint if exists orders_method_valid;
alter table orders add constraint orders_method_valid check (
  payment_method in ('cod','upi','razorpay')
);

alter table orders drop constraint if exists orders_status_valid;
alter table orders add constraint orders_status_valid check (
  order_status in ('placed','confirmed','shipped','delivered','cancelled')
  and payment_status in ('pending','paid','failed','refunded')
);

-- Cap the cart so a scripted request cannot write a huge blob.
alter table orders drop constraint if exists orders_items_sane;
alter table orders add constraint orders_items_sane check (
  jsonb_typeof(items) = 'array'
  and jsonb_array_length(items) between 1 and 50
);
