-- ─── SALONI COLLECTION · SEED DATA ──────────────────────────────
-- Run this in: Supabase → SQL Editor → New query
-- Safe to re-run: uses ON CONFLICT DO NOTHING on a name+category unique check
-- Images: free Unsplash fashion photos (replace with your own via Admin panel)

INSERT INTO products (name, category, price, original_price, description, image_url, badge, featured, sizes, colors, tags)
VALUES

  -- KURTAS
  (
    'Ivory Silk Kurta',
    'Kurtas',
    2800, 3500,
    'A whisper-soft ivory silk kurta with delicate hand-embroidered neckline. Flows effortlessly from desk to dinner. Pair with palazzo trousers or straight-cut jeans.',
    'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=600&q=80&fit=crop',
    'New', true,
    ARRAY['XS','S','M','L','XL'],
    ARRAY['Ivory', 'Blush', 'Sage'],
    ARRAY['summer','handcrafted','bestseller']
  ),
  (
    'Gold Brocade Straight Kurta',
    'Kurtas',
    3400, null,
    'Rich gold brocade fabric cut in a clean straight silhouette. Intricate woven patterns catch the light beautifully — made for festive evenings and special occasions.',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&q=80&fit=crop',
    'Festive', true,
    ARRAY['S','M','L','XL'],
    ARRAY['Gold', 'Copper', 'Champagne'],
    ARRAY['festive','brocade','premium']
  ),

  -- ANARKALI
  (
    'Rosewood Anarkali Set',
    'Anarkali',
    5400, 6800,
    'A floor-length rosewood Anarkali adorned with subtle zari work and a flared silhouette. Comes with matching churidar and dupatta. A timeless classic for celebrations.',
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80&fit=crop',
    'Sale', true,
    ARRAY['S','M','L','XL'],
    ARRAY['Rosewood', 'Burgundy', 'Mauve'],
    ARRAY['festive','anarkali','premium']
  ),
  (
    'Peacock Blue Printed Anarkali',
    'Anarkali',
    4200, null,
    'Vibrant peacock blue with fine block-printed motifs across the flare. The rich colour and detailed print make this an effortless statement piece.',
    'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&q=80&fit=crop',
    'New', true,
    ARRAY['XS','S','M','L','XL'],
    ARRAY['Peacock Blue', 'Teal', 'Emerald'],
    ARRAY['printed','blockprint','everyday']
  ),

  -- SAREES
  (
    'Blush Organza Saree',
    'Sarees',
    7200, null,
    'Pure organza saree in the softest blush with a scattered floral hand-block print. Lightweight and luminous — perfect for daytime celebrations and weddings.',
    'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&q=80&fit=crop',
    'Limited', false,
    ARRAY['Free'],
    ARRAY['Blush', 'Champagne', 'Peach'],
    ARRAY['bridal','festive','handblock','organza']
  ),
  (
    'Teal Kanjivaram Silk Saree',
    'Sarees',
    12000, 14500,
    'Handwoven Kanjivaram silk in deep teal with a contrasting gold zari border and intricate temple motifs on the pallu. An heirloom-quality piece.',
    'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=600&q=80&fit=crop',
    'Sale', true,
    ARRAY['Free'],
    ARRAY['Teal', 'Peacock', 'Royal Blue'],
    ARRAY['silk','kanjivaram','bridal','handwoven','heritage']
  ),

  -- CO-ORDS
  (
    'Midnight Linen Co-ord Set',
    'Co-ords',
    3200, null,
    'Washed midnight-navy linen co-ord set featuring wide-leg trousers and a relaxed boxy blazer. Minimal, modern, and effortlessly cool for any occasion.',
    'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600&q=80&fit=crop',
    '', true,
    ARRAY['XS','S','M','L'],
    ARRAY['Midnight Navy', 'Olive', 'Sand'],
    ARRAY['contemporary','everyday','linen']
  ),
  (
    'Sage Linen Shirt & Trouser Set',
    'Co-ords',
    2900, 3600,
    'Breezy sage linen shirt paired with relaxed tapered trousers. Subtle muted palette makes this easy to style up or down. Weekend staple, office-ready.',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&q=80&fit=crop',
    'Sale', false,
    ARRAY['XS','S','M','L','XL'],
    ARRAY['Sage Green', 'Ecru', 'Dusty Rose'],
    ARRAY['linen','casual','everyday']
  ),

  -- DRESSES
  (
    'Champagne Wrap Midi Dress',
    'Dresses',
    3800, null,
    'Fluid champagne-toned wrap dress in feather-light georgette. The adjustable tie waist flatters every silhouette. Day to evening in one effortless piece.',
    'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&q=80&fit=crop',
    'New', true,
    ARRAY['XS','S','M','L','XL'],
    ARRAY['Champagne', 'Blush', 'Ivory', 'Black'],
    ARRAY['georgette','versatile','evening','modern']
  ),

  -- LEHENGAS
  (
    'Crimson Embroidered Lehenga Set',
    'Lehengas',
    18000, 22000,
    'Bridal-worthy crimson lehenga with dense zardozi and thread embroidery across the skirt and blouse. Comes with a sheer organza dupatta with scalloped border. Made to order.',
    'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80&fit=crop',
    'Limited', true,
    ARRAY['XS','S','M','L','XL','Custom'],
    ARRAY['Crimson', 'Scarlet', 'Deep Red', 'Maroon'],
    ARRAY['bridal','lehenga','embroidered','zardozi','premium','wedding']
  );
