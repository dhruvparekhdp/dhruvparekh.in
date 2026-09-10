/* ═══ SALONI · DATA LAYER ═══════════════════════════════════════
   Shared by the storefront, the checkout and the admin panel.
   Falls back to localStorage whenever Supabase isn't configured.
   ═══════════════════════════════════════════════════════════════ */

const HAS_KEYS = Boolean(
  typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL &&
  typeof SUPABASE_ANON_KEY !== 'undefined' && SUPABASE_ANON_KEY
);

/* The SDK comes from a CDN. If that request fails we must still render the
   store rather than throwing on createClient and blanking the page. */
const SDK_READY = Boolean(window.supabase && typeof window.supabase.createClient === 'function');

if (HAS_KEYS && !SDK_READY) {
  console.warn('[saloni] Supabase SDK did not load — falling back to local data.');
}

let db = null;
if (HAS_KEYS && SDK_READY) {
  try {
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (err) {
    console.error('[saloni] Supabase client failed to start:', err);
    db = null;
  }
}

/* True only when we have a live client — everything downstream keys off this. */
const CONFIGURED = Boolean(db);

/* Keys are configured but the client never came up (CDN blocked, SDK error).
   This is a live shop that has lost its backend, so we must NOT quietly serve
   demo products — a customer could order something that doesn't exist. */
const DEGRADED = HAS_KEYS && !db;

const LS_PRODUCTS = 'saloni_products_v2';
const LS_ORDERS   = 'saloni_orders_v2';

/* ─── DEMO SEED (demo mode only) ─────────────────────────────── */
const _U = 'https://images.unsplash.com/';
const DEMO_PRODUCTS = [
  { id:'d1', name:'Ivory Silk Kurta',      category:'Kurtas',   price:2800, original_price:3500, badge:'New',     featured:true,  sizes:['XS','S','M','L','XL'], colors:['Ivory','Blush','Sage'],      tags:['summer'],   image_url:_U+'photo-1551488831-00ddcb6c6bd3?w=800&q=80&fit=crop', description:'A whisper-soft ivory silk kurta with a hand-embroidered neckline. Flows easily from desk to dinner.' },
  { id:'d2', name:'Rosewood Anarkali Set', category:'Anarkali', price:5400, original_price:6800, badge:'Sale',    featured:true,  sizes:['S','M','L','XL'],      colors:['Rosewood','Burgundy'],       tags:['festive'],  image_url:_U+'photo-1490481651871-ab68de25d43d?w=800&q=80&fit=crop', description:'Floor-length rosewood Anarkali with subtle zari work and a generous flare. Comes with churidar and dupatta.' },
  { id:'d3', name:'Midnight Linen Co-ord', category:'Co-ords',  price:3200, original_price:null, badge:'',        featured:true,  sizes:['XS','S','M','L'],      colors:['Midnight Navy','Sand'],      tags:['everyday'], image_url:_U+'photo-1487412720507-e7ab37603c6f?w=800&q=80&fit=crop', description:'Washed navy linen co-ord with wide-leg trousers and a relaxed boxy blazer. Minimal and quietly modern.' },
  { id:'d4', name:'Blush Organza Saree',   category:'Sarees',   price:7200, original_price:null, badge:'Limited', featured:false, sizes:['Free'],                colors:['Blush','Champagne'],         tags:['bridal'],   image_url:_U+'photo-1509631179647-0177331693ae?w=800&q=80&fit=crop', description:'Pure organza in the softest blush with a scattered hand-block floral. Light, luminous, made for celebrations.' },
  { id:'d5', name:'Teal Kanjivaram Saree', category:'Sarees',   price:12000,original_price:14500,badge:'Sale',    featured:true,  sizes:['Free'],                colors:['Teal','Peacock'],            tags:['silk'],     image_url:_U+'photo-1512436991641-6745cdb1723f?w=800&q=80&fit=crop', description:'Handwoven Kanjivaram silk in deep teal with a gold zari border and temple motifs on the pallu.' },
  { id:'d6', name:'Champagne Wrap Dress',  category:'Dresses',  price:3800, original_price:null, badge:'New',     featured:true,  sizes:['XS','S','M','L','XL'], colors:['Champagne','Blush','Black'], tags:['evening'],  image_url:_U+'photo-1595777457583-95e059d581b8?w=800&q=80&fit=crop', description:'Fluid champagne wrap dress in feather-light georgette with an adjustable tie waist.' },
];

function _lsGet(key, seed) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  if (seed) { _lsSet(key, seed); return seed; }
  return [];
}
function _lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
}

/* ═══ PRODUCTS ═════════════════════════════════════════════════ */
async function getProducts() {
  if (DEGRADED) return [];
  if (!db) return _lsGet(LS_PRODUCTS, DEMO_PRODUCTS);
  const { data, error } = await db.from('products').select('*').order('created_at', { ascending: false });
  if (error) { console.error('[saloni] products:', error.message); return []; }
  return data || [];
}

async function addProduct(p) {
  if (!db) {
    const list = _lsGet(LS_PRODUCTS, DEMO_PRODUCTS);
    const row = { ...p, id: 'p-' + Date.now(), created_at: new Date().toISOString() };
    list.unshift(row); _lsSet(LS_PRODUCTS, list);
    return row;
  }
  const { data, error } = await db.from('products').insert([p]).select().single();
  if (error) throw error;
  return data;
}

async function updateProduct(id, patch) {
  if (!db) {
    const list = _lsGet(LS_PRODUCTS, DEMO_PRODUCTS);
    const i = list.findIndex(x => x.id === id);
    if (i === -1) return null;
    list[i] = { ...list[i], ...patch }; _lsSet(LS_PRODUCTS, list);
    return list[i];
  }
  const { data, error } = await db.from('products').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

async function deleteProduct(id) {
  if (!db) {
    _lsSet(LS_PRODUCTS, _lsGet(LS_PRODUCTS, DEMO_PRODUCTS).filter(x => x.id !== id));
    return;
  }
  const { error } = await db.from('products').delete().eq('id', id);
  if (error) throw error;
}

/* ═══ IMAGES ═══════════════════════════════════════════════════ */
async function uploadImage(file) {
  if (!db) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = e => res(e.target.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }
  const ext  = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
  const { error } = await db.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  return db.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

async function deleteImage(url) {
  if (!db || !url) return;
  const marker = `/${STORAGE_BUCKET}/`;
  const at = url.indexOf(marker);
  if (at === -1) return;                        // external URL or data: URI — nothing to clean up
  const path = url.slice(at + marker.length).split('?')[0];
  if (path) await db.storage.from(STORAGE_BUCKET).remove([path]);
}

/* ═══ ORDERS ═══════════════════════════════════════════════════ */
async function insertOrder(row) {
  if (DEGRADED) throw new Error('Lost connection to the store. Please refresh and try again.');
  if (!db) {
    const list = _lsGet(LS_ORDERS);
    list.unshift({ ...row, id: row.order_number, created_at: new Date().toISOString() });
    _lsSet(LS_ORDERS, list);
    return row;
  }
  const { data, error } = await db.from('orders').insert([row]).select().single();
  if (error) throw error;
  return data;
}

async function getOrders() {
  if (DEGRADED) return [];
  if (!db) return _lsGet(LS_ORDERS);
  const { data, error } = await db.from('orders').select('*').order('created_at', { ascending: false });
  if (error) { console.error('[saloni] orders:', error.message); return []; }
  return data || [];
}

async function updateOrder(id, patch) {
  if (!db) {
    const list = _lsGet(LS_ORDERS);
    const i = list.findIndex(x => x.id === id);
    if (i === -1) return null;
    list[i] = { ...list[i], ...patch }; _lsSet(LS_ORDERS, list);
    return list[i];
  }
  const { data, error } = await db.from('orders').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}


/* Customer-facing order lookup. RLS blocks anonymous SELECT on orders,
   so this goes through the track_order function, which requires BOTH the
   order number and the phone the order was placed with. */
async function trackOrder(orderNumber, phone) {
  const num = String(orderNumber || '').trim();
  const ph  = String(phone || '').replace(/\D/g, '');
  if (!num || ph.length !== 10) return null;

  if (!db) {
    const list = _lsGet(LS_ORDERS);
    return list.find(o =>
      String(o.order_number).toUpperCase() === num.toUpperCase() &&
      String(o.customer_phone) === ph) || null;
  }

  const { data, error } = await db.rpc('track_order', {
    p_order_number: num,
    p_phone: ph,
  });
  if (error) throw error;
  return (data && data[0]) || null;
}

/* ═══ DERIVED ══════════════════════════════════════════════════ */
function categoryCounts(list) {
  const m = {};
  list.forEach(p => { m[p.category] = (m[p.category] || 0) + 1; });
  return m;
}

function discountPct(p) {
  const was = Number(p.original_price), now = Number(p.price);
  if (!was || was <= now) return 0;
  return Math.round((1 - now / was) * 100);
}
