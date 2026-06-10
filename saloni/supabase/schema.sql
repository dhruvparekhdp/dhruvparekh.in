-- ─── SALONI COLLECTION · SUPABASE SCHEMA ────────────────────────
-- Run this entire file in: Supabase → SQL Editor → New query

-- 1. PRODUCTS TABLE
create table if not exists products (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  category       text not null,
  price          numeric(10,2) not null,
  original_price numeric(10,2),
  description    text,
  image_url      text,
  badge          text,
  featured       boolean default false,
  sizes          text[],
  colors         text[],
  tags           text[],
  created_at     timestamptz default now()
);

-- 2. ROW LEVEL SECURITY
alter table products enable row level security;

-- Anyone can read products (public storefront)
create policy "public_read_products"
  on products for select
  using (true);

-- Only authenticated users can insert/update/delete (admin)
create policy "auth_insert_products"
  on products for insert
  with check (auth.role() = 'authenticated');

create policy "auth_update_products"
  on products for update
  using (auth.role() = 'authenticated');

create policy "auth_delete_products"
  on products for delete
  using (auth.role() = 'authenticated');

-- 3. STORAGE BUCKET FOR PRODUCT IMAGES
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Public read on images
create policy "public_read_images"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- Authenticated upload
create policy "auth_upload_images"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and auth.role() = 'authenticated');

-- Authenticated delete
create policy "auth_delete_images"
  on storage.objects for delete
  using (bucket_id = 'product-images' and auth.role() = 'authenticated');

-- 4. SEED DEMO PRODUCTS (optional — delete if not needed)
insert into products (name, category, price, original_price, description, badge, featured, sizes, colors, tags)
values
  ('Ivory Silk Kurta',     'Kurtas',   2800, 3500, 'A whisper-soft ivory silk kurta with delicate hand-embroidered neckline. Flows effortlessly from desk to dinner.',     'New',     true,  array['XS','S','M','L','XL'], array['Ivory','Blush','Sage'],        array['summer','handcrafted','bestseller']),
  ('Rosewood Anarkali Set','Anarkali',  5400, 6800, 'A floor-length rosewood Anarkali adorned with subtle zari work and a flared silhouette. Comes with matching churidar and dupatta.', 'Sale', true,  array['S','M','L','XL'],      array['Rosewood','Burgundy'],        array['festive','premium']),
  ('Midnight Linen Co-ord','Co-ords',   3200, null, 'Washed midnight-navy linen co-ord set featuring wide-leg trousers and a relaxed boxy blazer. Minimal, modern, effortlessly cool.', '',   true,  array['XS','S','M','L'],      array['Midnight Navy','Sand'],       array['contemporary','everyday']),
  ('Blush Organza Saree',  'Sarees',    7200, null, 'Pure organza saree in the softest blush with a scattered floral hand-block print. Lightweight and luminous — perfect for celebrations.', 'Limited', false, array['Free'], array['Blush','Champagne'], array['bridal','festive','handblock']);
