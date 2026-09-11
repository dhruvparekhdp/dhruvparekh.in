-- ═══ SALONI · MIGRATION 003 · SECURITY HARDENING ════════════════
-- Run in Supabase -> SQL Editor AFTER migration-002.sql.
--
-- Fixes three real holes:
--   1. Any stranger who signs up could read every customer's phone
--      and home address, because the policies trusted `authenticated`.
--   2. The browser decided what an order cost. A ₹12,000 saree could
--      be ordered for ₹1.
--   3. A crafted request could insert an order already marked paid.

-- ─── 1. WHO IS ACTUALLY AN ADMIN ───────────────────────────────
create table if not exists admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  added_at   timestamptz default now()
);

alter table admin_users enable row level security;

drop policy if exists "admins_read_self" on admin_users;
create policy "admins_read_self" on admin_users
  for select using (user_id = auth.uid());

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from admin_users where user_id = auth.uid()) $$;

grant execute on function public.is_admin() to anon, authenticated;

-- ┌──────────────────────────────────────────────────────────────┐
-- │ REQUIRED: add yourself as admin.                             │
-- │ Supabase -> Authentication -> Users -> copy your UID, then:  │
-- │                                                              │
-- │   insert into admin_users (user_id)                          │
-- │   values ('paste-your-uid-here');                            │
-- │                                                              │
-- │ Until you do this the admin panel will show no data.         │
-- └──────────────────────────────────────────────────────────────┘

-- ─── 2. RE-POINT EVERY POLICY AT is_admin() ────────────────────
drop policy if exists "auth_read_orders"   on orders;
drop policy if exists "auth_update_orders" on orders;
drop policy if exists "auth_delete_orders" on orders;

create policy "admin_read_orders"   on orders for select using (is_admin());
create policy "admin_update_orders" on orders for update using (is_admin());
create policy "admin_delete_orders" on orders for delete using (is_admin());

drop policy if exists "auth_insert_products" on products;
drop policy if exists "auth_update_products" on products;
drop policy if exists "auth_delete_products" on products;

create policy "admin_insert_products" on products for insert with check (is_admin());
create policy "admin_update_products" on products for update using (is_admin());
create policy "admin_delete_products" on products for delete using (is_admin());

drop policy if exists "auth_upload_images" on storage.objects;
drop policy if exists "auth_delete_images" on storage.objects;

create policy "admin_upload_images" on storage.objects for insert
  with check (bucket_id = 'product-images' and is_admin());
create policy "admin_delete_images" on storage.objects for delete
  using (bucket_id = 'product-images' and is_admin());

-- ─── 3. SHOP SETTINGS (single source of truth for money) ───────
create table if not exists shop_settings (
  id                  int primary key default 1,
  shipping_flat       numeric(10,2) not null default 99,
  free_shipping_above numeric(10,2) not null default 2999,
  cod_extra_fee       numeric(10,2) not null default 0,
  constraint one_row check (id = 1)
);

insert into shop_settings (id) values (1) on conflict (id) do nothing;

alter table shop_settings enable row level security;
drop policy if exists "public_read_settings" on shop_settings;
create policy "public_read_settings" on shop_settings for select using (true);
drop policy if exists "admin_update_settings" on shop_settings;
create policy "admin_update_settings" on shop_settings for update using (is_admin());

-- ─── 4. THE SERVER DECIDES WHAT AN ORDER COSTS ─────────────────
-- Recomputes every line from the products table, ignoring whatever
-- price the browser claimed, and forces a safe initial status.
create or replace function public.enforce_order_integrity()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  it            jsonb;
  pid           uuid;
  qty           int;
  prod          record;
  calc_subtotal numeric := 0;
  calc_shipping numeric := 0;
  cfg           record;
begin
  -- A newly placed order is always unpaid and unshipped, whatever was sent.
  new.payment_status  := 'pending';
  new.order_status    := 'placed';
  new.courier         := null;
  new.tracking_number := null;
  new.tracking_url    := null;
  new.dispatched_at   := null;

  select * into cfg from shop_settings where id = 1;

  for it in select value from jsonb_array_elements(new.items) loop
    begin
      pid := (it->>'id')::uuid;
    exception when others then
      raise exception 'Order contains an item we do not recognise';
    end;

    qty := coalesce(nullif(it->>'qty','')::int, 1);
    if qty < 1 or qty > 10 then
      raise exception 'Quantity must be between 1 and 10';
    end if;

    select price, in_stock, name into prod from products where id = pid;
    if not found then
      raise exception 'Order contains an item that is no longer available';
    end if;
    if prod.in_stock is false then
      raise exception 'Sorry, "%" has just sold out', prod.name;
    end if;

    calc_subtotal := calc_subtotal + (prod.price * qty);
  end loop;

  if calc_subtotal <= 0 then
    raise exception 'Order total could not be verified';
  end if;

  if cfg.free_shipping_above > 0 and calc_subtotal >= cfg.free_shipping_above then
    calc_shipping := 0;
  else
    calc_shipping := cfg.shipping_flat;
  end if;

  if new.payment_method = 'cod' then
    calc_shipping := calc_shipping + cfg.cod_extra_fee;
  end if;

  new.subtotal := calc_subtotal;
  new.shipping := calc_shipping;
  new.total    := calc_subtotal + calc_shipping;

  return new;
end $$;

drop trigger if exists orders_enforce_integrity on orders;
create trigger orders_enforce_integrity
  before insert on orders
  for each row execute function public.enforce_order_integrity();

-- ─── 5. ADMIN MAY STILL CORRECT AN ORDER ───────────────────────
-- The trigger above is INSERT-only, so admin edits to status and
-- tracking continue to work normally.
