/* ─── SUPABASE CLIENT INIT ───────────────────────────────────── */
const _configured = SUPABASE_URL && SUPABASE_ANON_KEY;
const db = _configured
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

/* ─── LOCAL FALLBACK STORE (used when Supabase not yet configured) */
const STORE_KEY = 'saloni_products';
const DEMO_PRODUCTS = [
  { id:'demo-1', name:'Ivory Silk Kurta',      category:'Kurtas',   price:2800, original_price:3500, description:'A whisper-soft ivory silk kurta with delicate hand-embroidered neckline. Flows effortlessly from desk to dinner. Pair with palazzo trousers or straight-cut jeans.', image_url:'', badge:'New',     featured:true,  sizes:['XS','S','M','L','XL'], colors:['Ivory','Blush','Sage'],         tags:['summer','handcrafted','bestseller'], created_at: new Date(Date.now()-86400000).toISOString() },
  { id:'demo-2', name:'Rosewood Anarkali Set', category:'Anarkali', price:5400, original_price:6800, description:'A floor-length rosewood Anarkali adorned with subtle zari work and a flared silhouette. Comes with matching churidar and dupatta.',                                     image_url:'', badge:'Sale',    featured:true,  sizes:['S','M','L','XL'],      colors:['Rosewood','Burgundy'],          tags:['festive','premium'],                created_at: new Date(Date.now()-172800000).toISOString() },
  { id:'demo-3', name:'Midnight Linen Co-ord', category:'Co-ords',  price:3200, original_price:null, description:'Washed midnight-navy linen co-ord set featuring wide-leg trousers and a relaxed boxy blazer. Minimal, modern, effortlessly cool.',                                    image_url:'', badge:'',       featured:true,  sizes:['XS','S','M','L'],      colors:['Midnight Navy','Sand'],         tags:['contemporary','everyday'],          created_at: new Date(Date.now()-259200000).toISOString() },
  { id:'demo-4', name:'Blush Organza Saree',   category:'Sarees',   price:7200, original_price:null, description:'Pure organza saree in the softest blush with a scattered floral hand-block print. Lightweight and luminous — perfect for celebrations.',                              image_url:'', badge:'Limited',featured:false, sizes:['Free'],                colors:['Blush','Champagne'],            tags:['bridal','festive','handblock'],     created_at: new Date(Date.now()-345600000).toISOString() },
];

function _localGet() {
  try { const s = localStorage.getItem(STORE_KEY); if (s) return JSON.parse(s); } catch(e) {}
  localStorage.setItem(STORE_KEY, JSON.stringify(DEMO_PRODUCTS));
  return DEMO_PRODUCTS;
}
function _localSave(products) { localStorage.setItem(STORE_KEY, JSON.stringify(products)); }

/* ─── PRODUCT CRUD ───────────────────────────────────────────── */
async function getProducts() {
  if (db) {
    const { data, error } = await db.from('products').select('*').order('created_at', { ascending: false });
    if (error) { console.error('Supabase fetch error:', error); return []; }
    return data || [];
  }
  return _localGet();
}

async function addProduct(product) {
  if (db) {
    const { data, error } = await db.from('products').insert([product]).select().single();
    if (error) throw error;
    return data;
  }
  const products = _localGet();
  const newProduct = { ...product, id: 'p-' + Date.now(), created_at: new Date().toISOString() };
  products.unshift(newProduct);
  _localSave(products);
  return newProduct;
}

async function updateProduct(id, updates) {
  if (db) {
    const { data, error } = await db.from('products').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
  const products = _localGet();
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) return null;
  products[idx] = { ...products[idx], ...updates };
  _localSave(products);
  return products[idx];
}

async function deleteProduct(id) {
  if (db) {
    const { error } = await db.from('products').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  _localSave(_localGet().filter(p => p.id !== id));
}

/* ─── IMAGE UPLOAD ───────────────────────────────────────────── */
async function uploadImage(file) {
  if (!db) {
    // base64 fallback when Supabase not configured
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  const ext  = file.name.split('.').pop();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await db.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = db.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function deleteImage(url) {
  if (!db || !url) return;
  // extract path from public URL
  const match = url.match(/product-images\/(.+)$/);
  if (!match) return;
  await db.storage.from(STORAGE_BUCKET).remove([match[1]]);
}

/* ─── HELPERS ────────────────────────────────────────────────── */
function getCategories(products) {
  const cats = {};
  products.forEach(p => { cats[p.category] = (cats[p.category] || 0) + 1; });
  return cats;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ─── TOAST ──────────────────────────────────────────────────── */
function showToast(msg, duration = 3200) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._tid);
  t._tid = setTimeout(() => t.classList.remove('show'), duration);
}

/* ─── PRODUCT MODAL ──────────────────────────────────────────── */
function openProductModal(product) {
  const overlay = document.getElementById('productModal');
  if (!overlay) return;
  const img = document.getElementById('modalImg');
  img.src = product.image_url || '';
  img.style.display = product.image_url ? 'block' : 'none';
  const badge = document.getElementById('modalBadge');
  badge.textContent = product.badge || '';
  badge.style.display = product.badge ? 'block' : 'none';
  document.getElementById('modalCategory').textContent = product.category;
  document.getElementById('modalTitle').textContent = product.name;
  document.getElementById('modalDesc').textContent = product.description;
  document.getElementById('modalPrice').textContent = '₹' + Number(product.price).toLocaleString('en-IN');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const overlay = document.getElementById('productModal');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ─── STOREFRONT INIT ────────────────────────────────────────── */
if (document.getElementById('productsGrid')) {
  document.addEventListener('DOMContentLoaded', initStorefront);
}

async function initStorefront() {
  const header = document.getElementById('header');
  if (header) {
    window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 60));
  }

  const products = await getProducts();
  renderCategories(products);
  renderProducts(products, 'all');
  buildFilters(products);

  // show setup banner if Supabase not configured
  if (!_configured) {
    const banner = document.getElementById('setupBanner');
    if (banner) banner.style.display = 'flex';
  }
}

function buildFilters(products) {
  const bar = document.getElementById('filterBar');
  if (!bar) return;
  const cats = getCategories(products);
  // clear old dynamic buttons
  bar.querySelectorAll('.filter-btn:not([data-filter="all"])').forEach(b => b.remove());
  Object.keys(cats).forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.filter = cat;
    btn.textContent = cat;
    btn.onclick = () => {
      bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderProducts(products, cat);
    };
    bar.appendChild(btn);
  });
  const allBtn = bar.querySelector('[data-filter="all"]');
  allBtn.onclick = () => {
    bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    allBtn.classList.add('active');
    renderProducts(products, 'all');
  };
}

function renderCategories(products) {
  const grid = document.getElementById('categoryGrid');
  if (!grid) return;
  const cats = getCategories(products);
  const icons = { Kurtas:'✦', Sarees:'◈', Anarkali:'❋', 'Co-ords':'◉', Dresses:'✿', Lehengas:'✾', default:'◇' };
  if (!Object.keys(cats).length) {
    grid.innerHTML = '<p class="category-empty">Categories will appear once products are added.</p>';
    return;
  }
  grid.innerHTML = '';
  Object.entries(cats).forEach(([name, count]) => {
    const card = document.createElement('div');
    card.className = 'category-card';
    card.innerHTML = `
      <div class="cat-icon">${icons[name] || icons.default}</div>
      <div class="cat-name">${escapeHtml(name)}</div>
      <div class="cat-count">${count} piece${count!==1?'s':''}</div>
    `;
    card.onclick = () => {
      document.getElementById('featured').scrollIntoView({ behavior:'smooth' });
      setTimeout(() => { document.querySelector(`[data-filter="${name}"]`)?.click(); }, 600);
    };
    grid.appendChild(card);
  });
}

function renderProducts(products, filter) {
  const grid = document.getElementById('productsGrid');
  const empty = document.getElementById('emptyState');
  if (!grid) return;
  let list = filter === 'all' ? products : products.filter(p => p.category === filter);
  if (!list.length) {
    grid.innerHTML = '';
    if (empty) { empty.style.display = ''; grid.appendChild(empty); }
    return;
  }
  if (empty) empty.style.display = 'none';
  grid.innerHTML = '';
  list.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';
    const badgeClass = p.badge === 'Sale' ? 'badge-sale' : p.badge === 'New' ? 'badge-new' : '';
    const imgContent = p.image_url
      ? `<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=product-img-placeholder><span>✦</span><span>No Image</span></div>'" />`
      : `<div class="product-img-placeholder"><span>✦</span><span>No Image</span></div>`;
    const sizeHtml = (p.sizes||[]).slice(0,5).map(s => `<span class="size-chip">${escapeHtml(s)}</span>`).join('');
    const origPrice = p.original_price
      ? `<span class="product-original-price">₹${Number(p.original_price).toLocaleString('en-IN')}</span>` : '';
    card.innerHTML = `
      <div class="product-card-img">
        ${imgContent}
        ${p.badge ? `<span class="product-badge ${badgeClass}">${escapeHtml(p.badge)}</span>` : ''}
        <button class="product-wishlist" title="Add to wishlist">♡</button>
      </div>
      <div class="product-card-body">
        <div class="product-category">${escapeHtml(p.category)}</div>
        <div class="product-name">${escapeHtml(p.name)}</div>
        <div class="product-desc">${escapeHtml(p.description)}</div>
        <div class="product-price-row">
          <span class="product-price">₹${Number(p.price).toLocaleString('en-IN')}</span>
          ${origPrice}
        </div>
        ${sizeHtml ? `<div class="product-sizes">${sizeHtml}</div>` : ''}
      </div>
    `;
    card.onclick = () => openProductModal(p);
    card.querySelector('.product-wishlist').onclick = e => {
      e.stopPropagation();
      const isWished = e.currentTarget.textContent === '♥';
      e.currentTarget.textContent = isWished ? '♡' : '♥';
      showToast(isWished ? 'Removed from wishlist' : 'Added to wishlist');
    };
    grid.appendChild(card);
  });
}
