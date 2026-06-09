/* ─── PRODUCT STORE ──────────────────────────────────────────── */
const STORE_KEY = 'saloni_products';

const DEMO_PRODUCTS = [
  {
    id: 'demo-1',
    name: 'Ivory Silk Kurta',
    category: 'Kurtas',
    price: 2800,
    originalPrice: 3500,
    description: 'A whisper-soft ivory silk kurta with delicate hand-embroidered neckline. Flows effortlessly from desk to dinner. Pair with palazzo trousers or straight-cut jeans.',
    image: '',
    badge: 'New',
    featured: true,
    sizes: ['XS','S','M','L','XL'],
    colors: ['Ivory', 'Blush', 'Sage'],
    tags: ['summer','handcrafted','bestseller'],
    createdAt: Date.now() - 86400000
  },
  {
    id: 'demo-2',
    name: 'Rosewood Anarkali Set',
    category: 'Anarkali',
    price: 5400,
    originalPrice: 6800,
    description: 'A floor-length rosewood Anarkali adorned with subtle zari work and a flared silhouette. Comes with matching churidar and dupatta.',
    image: '',
    badge: 'Sale',
    featured: true,
    sizes: ['S','M','L','XL'],
    colors: ['Rosewood', 'Burgundy'],
    tags: ['festive','premium'],
    createdAt: Date.now() - 172800000
  },
  {
    id: 'demo-3',
    name: 'Midnight Linen Co-ord',
    category: 'Co-ords',
    price: 3200,
    originalPrice: null,
    description: 'Washed midnight-navy linen co-ord set featuring wide-leg trousers and a relaxed boxy blazer. Minimal, modern, effortlessly cool.',
    image: '',
    badge: '',
    featured: true,
    sizes: ['XS','S','M','L'],
    colors: ['Midnight Navy', 'Sand'],
    tags: ['contemporary','everyday'],
    createdAt: Date.now() - 259200000
  },
  {
    id: 'demo-4',
    name: 'Blush Organza Saree',
    category: 'Sarees',
    price: 7200,
    originalPrice: null,
    description: 'Pure organza saree in the softest blush with a scattered floral hand-block print. Lightweight and luminous — perfect for celebrations.',
    image: '',
    badge: 'Limited',
    featured: false,
    sizes: ['Free'],
    colors: ['Blush', 'Champagne'],
    tags: ['bridal','festive','handblock'],
    createdAt: Date.now() - 345600000
  }
];

function getProducts() {
  try {
    const stored = localStorage.getItem(STORE_KEY);
    if (stored) return JSON.parse(stored);
  } catch(e) {}
  // seed demo data on first load
  saveProducts(DEMO_PRODUCTS);
  return DEMO_PRODUCTS;
}

function saveProducts(products) {
  localStorage.setItem(STORE_KEY, JSON.stringify(products));
}

function addProduct(product) {
  const products = getProducts();
  product.id = 'p-' + Date.now();
  product.createdAt = Date.now();
  products.unshift(product);
  saveProducts(products);
  return product;
}

function updateProduct(id, updates) {
  const products = getProducts();
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) return null;
  products[idx] = { ...products[idx], ...updates };
  saveProducts(products);
  return products[idx];
}

function deleteProduct(id) {
  const products = getProducts().filter(p => p.id !== id);
  saveProducts(products);
}

function getCategories() {
  const cats = {};
  getProducts().forEach(p => {
    if (!cats[p.category]) cats[p.category] = 0;
    cats[p.category]++;
  });
  return cats;
}

/* ─── TOAST ──────────────────────────────────────────────────── */
function showToast(msg, duration = 3000) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._tid);
  t._tid = setTimeout(() => t.classList.remove('show'), duration);
}

/* ─── MODAL ──────────────────────────────────────────────────── */
function openProductModal(product) {
  const overlay = document.getElementById('productModal');
  if (!overlay) return;

  document.getElementById('modalImg').src = product.image || '';
  document.getElementById('modalImg').alt = product.name;
  document.getElementById('modalImg').style.display = product.image ? 'block' : 'none';
  document.getElementById('modalBadge').textContent = product.badge || '';
  document.getElementById('modalBadge').style.display = product.badge ? 'block' : 'none';
  document.getElementById('modalCategory').textContent = product.category;
  document.getElementById('modalTitle').textContent = product.name;
  document.getElementById('modalDesc').textContent = product.description;

  let priceHtml = `₹${Number(product.price).toLocaleString('en-IN')}`;
  document.getElementById('modalPrice').textContent = priceHtml;

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const overlay = document.getElementById('productModal');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

/* ─── STOREFRONT RENDER (index.html only) ────────────────────── */
if (document.getElementById('productsGrid')) {
  document.addEventListener('DOMContentLoaded', initStorefront);
}

function initStorefront() {
  const header = document.getElementById('header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 60);
    });
  }
  renderCategories();
  renderProducts('all');
  buildFilters();
}

function buildFilters() {
  const bar = document.getElementById('filterBar');
  if (!bar) return;
  const cats = getCategories();
  Object.keys(cats).forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.filter = cat;
    btn.textContent = cat;
    btn.onclick = () => {
      bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderProducts(cat);
    };
    bar.appendChild(btn);
  });
  bar.querySelector('[data-filter="all"]').onclick = () => {
    bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    bar.querySelector('[data-filter="all"]').classList.add('active');
    renderProducts('all');
  };
}

function renderCategories() {
  const grid = document.getElementById('categoryGrid');
  if (!grid) return;
  const cats = getCategories();
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
      <div class="cat-name">${name}</div>
      <div class="cat-count">${count} piece${count!==1?'s':''}</div>
    `;
    card.onclick = () => {
      document.getElementById('featured').scrollIntoView({ behavior:'smooth' });
      setTimeout(() => {
        const btn = document.querySelector(`[data-filter="${name}"]`);
        if (btn) btn.click();
      }, 600);
    };
    grid.appendChild(card);
  });
}

function renderProducts(filter) {
  const grid = document.getElementById('productsGrid');
  const empty = document.getElementById('emptyState');
  if (!grid) return;

  let products = getProducts();
  if (filter !== 'all') products = products.filter(p => p.category === filter);

  if (!products.length) {
    grid.innerHTML = '';
    if (empty) { empty.style.display = ''; grid.appendChild(empty); }
    return;
  }
  if (empty) empty.style.display = 'none';

  grid.innerHTML = '';
  products.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';
    const badgeClass = p.badge === 'Sale' ? 'badge-sale' : p.badge === 'New' ? 'badge-new' : '';
    const imgContent = p.image
      ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=product-img-placeholder><span>✦</span><span>No Image</span></div>'" />`
      : `<div class="product-img-placeholder"><span>✦</span><span>No Image</span></div>`;
    const sizeHtml = (p.sizes||[]).slice(0,5).map(s => `<span class="size-chip">${s}</span>`).join('');
    const origPriceHtml = p.originalPrice
      ? `<span class="product-original-price">₹${Number(p.originalPrice).toLocaleString('en-IN')}</span>` : '';

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
          ${origPriceHtml}
        </div>
        ${sizeHtml ? `<div class="product-sizes">${sizeHtml}</div>` : ''}
      </div>
    `;
    card.onclick = () => openProductModal(p);
    card.querySelector('.product-wishlist').onclick = e => {
      e.stopPropagation();
      e.currentTarget.textContent = e.currentTarget.textContent === '♡' ? '♥' : '♡';
      showToast(e.currentTarget.textContent === '♥' ? 'Added to wishlist' : 'Removed from wishlist');
    };
    grid.appendChild(card);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
