/* ═══ SALONI · STOREFRONT ═══════════════════════════════════════
   Requires: config.js → store.js → cart.js → app.js
   ═══════════════════════════════════════════════════════════════ */

const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let PRODUCTS = [];

/* ─── BOOT ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', init);

async function init() {
  const banner = document.getElementById('setupBanner');
  if (DEGRADED && banner) {
    banner.innerHTML = '<span>⚠ <b>Connection problem</b> — we could not reach the store. Please refresh the page.</span>';
    banner.style.display = 'flex';
  } else if (!CONFIGURED && banner) {
    banner.style.display = 'flex';
  }

  buildMarquee();
  wireDrawers();
  paintBag();
  document.addEventListener('cart:change', paintBag);

  stickyHeader();
  skeletons(8);
  PRODUCTS = await getProducts();

  renderCategories();
  renderFilters();
  renderGrid('all');
  renderHeroFigure();

  const stat = document.getElementById('statCount');
  if (stat) stat.textContent = PRODUCTS.length ? PRODUCTS.length + '+' : '—';

  initReveal();
  initParallax();
  initMagnetic();
}

/* ─── HEADER ─────────────────────────────────────────────────── */
function stickyHeader() {
  const h = document.getElementById('hdr');
  if (!h) return;
  const banner = document.getElementById('setupBanner');

  const onScroll = () => {
    h.classList.toggle('stuck', window.scrollY > 40);
    // The banner sits in normal flow, so slide the fixed header down by
    // whatever of it is still visible instead of covering it.
    const bh = banner && banner.offsetParent !== null ? banner.offsetHeight : 0;
    h.style.top = bh ? Math.max(0, bh - window.scrollY) + 'px' : '';
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
}

/* ─── MARQUEE ────────────────────────────────────────────────── */
function buildMarquee() {
  const t = document.getElementById('marqTrack');
  if (!t) return;
  const words = ['New Arrivals', 'Handwoven Fabrics', 'Small-Batch Made', 'Cash on Delivery', 'Free Shipping Over ' + inr(SHOP.freeShippingAbove), 'Packed by Hand'];
  const half = words.map(w => `<span>${escapeHtml(w)}</span><i>✦</i>`).join('');
  t.innerHTML = half + half;
}

/* ─── SKELETONS ──────────────────────────────────────────────── */
function skeletons(n) {
  const g = document.getElementById('grid');
  if (!g) return;
  g.innerHTML = Array.from({ length: n }, () => `
    <div class="skel">
      <div class="sk-m sk"></div>
      <div class="sk-b">
        <div class="sk sk-l1"></div>
        <div class="sk sk-l2"></div>
        <div class="sk sk-l3"></div>
      </div>
    </div>`).join('');
}

/* ─── CATEGORIES ─────────────────────────────────────────────── */
const GLYPH = { Kurtas:'✦', Sarees:'◈', Anarkali:'❋', 'Co-ords':'◉', Dresses:'✿', Lehengas:'✾' };

function renderCategories() {
  const g = document.getElementById('catGrid');
  if (!g) return;
  const counts = categoryCounts(PRODUCTS);
  const names = Object.keys(counts);
  if (!names.length) {
    g.innerHTML = `<p class="empty">Categories appear once you add products.</p>`;
    return;
  }
  g.innerHTML = names.map((name, i) => `
    <button class="tile cat reveal ${i < 4 ? 'd' + (i + 1) : ''}" data-cat="${escapeHtml(name)}">
      <span class="gl">${GLYPH[name] || '◇'}</span>
      <span>
        <span class="nm">${escapeHtml(name)}</span><br/>
        <span class="ct">${counts[name]} piece${counts[name] === 1 ? '' : 's'}</span>
      </span>
    </button>`).join('');

  g.querySelectorAll('.cat').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('shop').scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth' });
      const chip = document.querySelector(`.chip[data-f="${CSS.escape(btn.dataset.cat)}"]`);
      if (chip) setTimeout(() => chip.click(), REDUCE ? 0 : 520);
    });
  });
}

/* ─── FILTERS ────────────────────────────────────────────────── */
function renderFilters() {
  const bar = document.getElementById('filters');
  if (!bar) return;
  const names = Object.keys(categoryCounts(PRODUCTS));
  bar.innerHTML = `<button class="chip on" data-f="all">All</button>` +
    names.map(n => `<button class="chip" data-f="${escapeHtml(n)}">${escapeHtml(n)}</button>`).join('');

  bar.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      bar.querySelectorAll('.chip').forEach(c => c.classList.remove('on'));
      chip.classList.add('on');
      renderGrid(chip.dataset.f);
    });
  });
}

/* ─── PRODUCT GRID (bento) ───────────────────────────────────── */
function renderGrid(filter) {
  const g = document.getElementById('grid');
  if (!g) return;
  const list = filter === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.category === filter);

  if (!list.length) {
    g.innerHTML = `
      <div class="empty">
        <div class="gl">✦</div>
        <h3>Nothing here yet</h3>
        <p>${PRODUCTS.length ? 'No pieces in this category.' : 'Add your first product from the admin panel.'}</p>
        ${PRODUCTS.length ? '' : '<a href="admin.html" class="btn btn-fill">Open Admin</a>'}
      </div>`;
    return;
  }

  g.innerHTML = list.map((p, i) => card(p, i)).join('');

  g.querySelectorAll('.p-card').forEach((el, i) => {
    const p = list[i];
    el.addEventListener('click', ev => {
      if (ev.target.closest('.p-fav')) return;
      openProduct(p);
    });
    const fav = el.querySelector('.p-fav');
    if (fav) fav.addEventListener('click', ev => {
      ev.stopPropagation();
      fav.classList.toggle('on');
      const liked = fav.classList.contains('on');
      fav.textContent = liked ? '♥' : '♡';
      showToast(liked ? 'Saved to wishlist' : 'Removed from wishlist');
    });
    attachTilt(el);
  });

  initReveal();
}

function card(p, i) {
  const wide  = i % 7 === 2;
  const off   = discountPct(p);
  const tag   = p.badge ? `<span class="p-tag ${p.badge.toLowerCase() === 'sale' ? 'sale' : p.badge.toLowerCase() === 'new' ? 'new' : ''}">${escapeHtml(p.badge)}</span>` : '';
  const media = p.image_url
    ? `<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" loading="lazy"
           onerror="this.closest('.p-media').innerHTML='<div class=&quot;p-ph&quot;><b>✦</b><span>No image</span></div>'" />`
    : `<div class="p-ph"><b>✦</b><span>No image</span></div>`;
  const sizes = (p.sizes || []).slice(0, 5).map(s => `<span class="sz">${escapeHtml(s)}</span>`).join('');

  return `
    <article class="p-card reveal ${wide ? 'wide' : ''} ${i < 4 ? 'd' + (i + 1) : ''}">
      <div class="p-media">
        ${media}${tag}
        <button class="p-fav" aria-label="Save to wishlist">♡</button>
        <div class="p-quick">Quick view</div>
      </div>
      <div class="p-body">
        <div class="p-cat">${escapeHtml(p.category)}</div>
        <h3 class="p-name">${escapeHtml(p.name)}</h3>
        <p class="p-desc">${escapeHtml(p.description)}</p>
        <div class="p-foot">
          <span class="p-price">${inr(p.price)}</span>
          ${p.original_price ? `<span class="p-was">${inr(p.original_price)}</span>` : ''}
          ${off ? `<span class="p-off">${off}% off</span>` : ''}
        </div>
        ${sizes ? `<div class="p-sizes">${sizes}</div>` : ''}
      </div>
    </article>`;
}

/* ─── HERO FIGURE ────────────────────────────────────────────── */
function renderHeroFigure() {
  const tile = document.getElementById('heroFigure');
  if (!tile) return;
  const hero = PRODUCTS.find(p => p.featured && p.image_url) || PRODUCTS.find(p => p.image_url) || PRODUCTS[0];
  if (!hero) return;

  if (hero.image_url) {
    const img = new Image();
    img.alt = '';                       // decorative; the caption already names it
    img.loading = 'eager';
    img.onload = () => {
      const ph = tile.querySelector('.p-ph');
      if (ph) ph.replaceWith(img);      // only swap in once it has actually loaded
    };
    img.src = hero.image_url;
  }
  document.getElementById('figName').textContent = hero.name;
  document.getElementById('figCat').textContent  = `${hero.category} · ${inr(hero.price)}`;
  document.getElementById('figBtn').addEventListener('click', () => openProduct(hero));
}

/* ═══ PRODUCT DRAWER ═══════════════════════════════════════════ */
let DP = null, DSize = '', DColor = '', DQty = 1;

function openProduct(p) {
  DP = p;
  DSize  = (p.sizes  && p.sizes.length  === 1) ? p.sizes[0]  : '';
  DColor = (p.colors && p.colors.length === 1) ? p.colors[0] : '';
  DQty = 1;
  paintProductDrawer();
  openDrawer('pDrawer');
}

function paintProductDrawer() {
  const p = DP;
  if (!p) return;
  const body = document.getElementById('pBody');
  const off  = discountPct(p);

  const media = p.image_url
    ? `<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}"
           onerror="this.closest('.dr-media').innerHTML='<div class=&quot;p-ph&quot; style=&quot;height:100%&quot;><b>✦</b><span>No image</span></div>'" />`
    : `<div class="p-ph" style="height:100%"><b>✦</b><span>No image</span></div>`;

  const sizeOpts = (p.sizes || []).map(s =>
    `<button class="opt-b ${s === DSize ? 'on' : ''}" data-size="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join('');
  const colorOpts = (p.colors || []).map(c =>
    `<button class="opt-b ${c === DColor ? 'on' : ''}" data-color="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('');

  body.innerHTML = `
    <div class="dr-media">${media}${p.badge ? `<span class="p-tag ${p.badge.toLowerCase()==='sale'?'sale':p.badge.toLowerCase()==='new'?'new':''}" style="top:1rem;left:1rem">${escapeHtml(p.badge)}</span>` : ''}</div>
    <div class="dr-info">
      <div class="dr-cat">${escapeHtml(p.category)}</div>
      <h2 class="dr-name">${escapeHtml(p.name)}</h2>
      <div class="dr-price-row">
        <span class="dr-price">${inr(p.price)}</span>
        ${p.original_price ? `<span class="dr-was">${inr(p.original_price)}</span>` : ''}
        ${off ? `<span class="dr-off">${off}% off</span>` : ''}
      </div>
      <p class="dr-desc">${escapeHtml(p.description)}</p>

      ${sizeOpts ? `<div class="opt">
        <div class="opt-lab"><span>Size</span><span class="pick" id="pickSize">${DSize ? escapeHtml(DSize) : 'Select a size'}</span></div>
        <div class="opt-row" id="sizeRow">${sizeOpts}</div>
      </div>` : ''}

      ${colorOpts ? `<div class="opt">
        <div class="opt-lab"><span>Colour</span><span class="pick" id="pickColor">${DColor ? escapeHtml(DColor) : 'Select a colour'}</span></div>
        <div class="opt-row" id="colorRow">${colorOpts}</div>
      </div>` : ''}

      <div class="opt">
        <div class="opt-lab"><span>Quantity</span></div>
        <div class="qty">
          <button id="qMinus" aria-label="Decrease quantity">−</button>
          <span id="qVal">${DQty}</span>
          <button id="qPlus" aria-label="Increase quantity">+</button>
        </div>
      </div>

      <div class="dr-meta">
        <div class="dr-meta-r"><b>✦</b> ${SHOP.freeShippingAbove ? `Free shipping over ${inr(SHOP.freeShippingAbove)}` : `Flat ${inr(SHOP.shippingFlat)} shipping`}</div>
        <div class="dr-meta-r"><b>◈</b> Cash on delivery available</div>
        <div class="dr-meta-r"><b>❋</b> Handcrafted in small batches</div>
      </div>
    </div>`;

  body.querySelectorAll('[data-size]').forEach(b => b.addEventListener('click', () => {
    DSize = b.dataset.size;
    body.querySelectorAll('[data-size]').forEach(x => x.classList.toggle('on', x === b));
    document.getElementById('pickSize').textContent = DSize;
  }));
  body.querySelectorAll('[data-color]').forEach(b => b.addEventListener('click', () => {
    DColor = b.dataset.color;
    body.querySelectorAll('[data-color]').forEach(x => x.classList.toggle('on', x === b));
    document.getElementById('pickColor').textContent = DColor;
  }));
  document.getElementById('qMinus').addEventListener('click', () => {
    DQty = Math.max(1, DQty - 1);
    document.getElementById('qVal').textContent = DQty;
  });
  document.getElementById('qPlus').addEventListener('click', () => {
    DQty = Math.min(99, DQty + 1);
    document.getElementById('qVal').textContent = DQty;
  });
  body.scrollTop = 0;
}

document.addEventListener('DOMContentLoaded', () => {
  const add = document.getElementById('pAdd');
  if (add) add.addEventListener('click', () => {
    if (!DP) return;
    if ((DP.sizes || []).length && !DSize)   { showToast('Please choose a size');   return; }
    if ((DP.colors || []).length && !DColor) { showToast('Please choose a colour'); return; }
    cartAdd(DP, { size: DSize, color: DColor, qty: DQty });
    closeDrawer('pDrawer');
    showToast(`${DP.name} added to your bag`);
    bagPop();
    setTimeout(() => openDrawer('bDrawer'), 320);
  });
});

/* ═══ BAG DRAWER ═══════════════════════════════════════════════ */
function paintBag() {
  const items = cartRead();
  const n = cartCount();

  const badge = document.getElementById('bagCount');
  if (badge) { badge.textContent = n; badge.classList.toggle('on', n > 0); }
  const bc = document.getElementById('bCount');
  if (bc) bc.textContent = n;

  const body = document.getElementById('bBody');
  const foot = document.getElementById('bFoot');
  if (!body) return;

  if (!items.length) {
    body.innerHTML = `
      <div class="bag-empty">
        <div class="gl">✦</div>
        <h4>Your bag is empty</h4>
        <p>Pieces you add will show up here.</p>
        <button class="btn btn-fill" onclick="closeDrawer('bDrawer')">Continue Shopping</button>
      </div>`;
    if (foot) foot.style.display = 'none';
    return;
  }

  body.innerHTML = `<div class="bag-list">` + items.map(i => {
    const variant = [i.size, i.color].filter(Boolean).join(' · ');
    const thumb = i.image_url
      ? `<img src="${escapeHtml(i.image_url)}" alt="${escapeHtml(i.name)}" onerror="this.outerHTML='<div class=&quot;bag-ph&quot;>✦</div>'" />`
      : `<div class="bag-ph">✦</div>`;
    return `
      <div class="bag-row">
        ${thumb}
        <div>
          <div class="bag-nm">${escapeHtml(i.name)}</div>
          ${variant ? `<div class="bag-var">${escapeHtml(variant)}</div>` : ''}
          <div class="bag-pr">${inr(i.price * i.qty)}</div>
        </div>
        <div class="bag-ctl">
          <div class="qty-mini">
            <button data-dec="${escapeHtml(i.key)}" aria-label="Decrease">−</button>
            <span>${i.qty}</span>
            <button data-inc="${escapeHtml(i.key)}" aria-label="Increase">+</button>
          </div>
          <button class="bag-rm" data-rm="${escapeHtml(i.key)}">Remove</button>
        </div>
      </div>`;
  }).join('') + `</div>`;

  const { subtotal, shipping, total } = cartTotals('cod');
  const gap = (Number(SHOP.freeShippingAbove) || 0) - subtotal;

  if (foot) {
    foot.style.display = '';
    foot.innerHTML = `
      ${gap > 0 ? `<p class="ship-hint">Add <b>${inr(gap)}</b> more for free shipping</p>` : ''}
      <div class="sum">
        <div class="sum-r"><span>Subtotal</span><span>${inr(subtotal)}</span></div>
        <div class="sum-r"><span>Shipping</span><span>${shipping === 0 ? '<span class="free">Free</span>' : inr(shipping)}</span></div>
        <div class="sum-r total"><span>Total</span><span>${inr(total)}</span></div>
      </div>
      <a href="checkout.html" class="btn btn-clay btn-block mag">Checkout</a>`;
    initMagnetic();
  }

  body.querySelectorAll('[data-inc]').forEach(b => b.addEventListener('click', () => {
    const line = cartRead().find(i => i.key === b.dataset.inc);
    if (line) cartSetQty(line.key, line.qty + 1);
  }));
  body.querySelectorAll('[data-dec]').forEach(b => b.addEventListener('click', () => {
    const line = cartRead().find(i => i.key === b.dataset.dec);
    if (line) cartSetQty(line.key, line.qty - 1);
  }));
  body.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => {
    cartRemove(b.dataset.rm);
    showToast('Removed from bag');
  }));
}

function bagPop() {
  const badge = document.getElementById('bagCount');
  if (!badge || REDUCE) return;
  badge.classList.remove('pop');
  void badge.offsetWidth;
  badge.classList.add('pop');
}

/* ═══ DRAWER PLUMBING ══════════════════════════════════════════ */
function openDrawer(id) {
  const d = document.getElementById(id);
  const s = document.getElementById('scrim');
  if (!d) return;
  document.querySelectorAll('.drawer.on').forEach(x => { if (x !== d) closeDrawer(x.id); });
  d.classList.add('on');
  d.setAttribute('aria-hidden', 'false');
  if (s) s.classList.add('on');
  document.body.style.overflow = 'hidden';
}

function closeDrawer(id) {
  const d = document.getElementById(id);
  if (d) { d.classList.remove('on'); d.setAttribute('aria-hidden', 'true'); }
  if (!document.querySelector('.drawer.on')) {
    const s = document.getElementById('scrim');
    if (s) s.classList.remove('on');
    document.body.style.overflow = '';
  }
}

function closeAllDrawers() {
  document.querySelectorAll('.drawer.on').forEach(d => closeDrawer(d.id));
}

function wireDrawers() {
  const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
  bind('bagBtn', () => openDrawer('bDrawer'));
  bind('pClose', () => closeDrawer('pDrawer'));
  bind('bClose', () => closeDrawer('bDrawer'));
  bind('scrim',  closeAllDrawers);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAllDrawers(); });
}

/* ═══ 3D MOTION ════════════════════════════════════════════════ */

/* Cursor-following tilt with layered depth. */
function attachTilt(el) {
  if (REDUCE || window.matchMedia('(hover: none)').matches) return;
  let raf = 0;
  el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - r.left) / r.width  - .5;
    const dy = (e.clientY - r.top)  / r.height - .5;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      el.style.transform =
        `perspective(1100px) rotateY(${(dx * 7).toFixed(2)}deg) rotateX(${(-dy * 7).toFixed(2)}deg) translateZ(12px)`;
    });
  });
  el.addEventListener('pointerleave', () => {
    cancelAnimationFrame(raf);
    el.style.transform = '';
  });
}

/* Scroll-triggered reveal that rises out of Z-space. */
let revealObserver = null;
function initReveal() {
  if (REDUCE) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
    return;
  }
  if (!revealObserver) {
    revealObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('in'); obs.unobserve(en.target); }
      });
    }, { threshold: .12, rootMargin: '0px 0px -8% 0px' });
  }
  document.querySelectorAll('.reveal:not(.in)').forEach(el => revealObserver.observe(el));
}

/* Three hero layers drifting at different depths. */
function initParallax() {
  if (REDUCE) return;
  const layers = [...document.querySelectorAll('[data-px]')];
  if (!layers.length) return;
  let raf = 0;
  const run = () => {
    const y = window.scrollY;
    layers.forEach(l => {
      l.style.transform = `translate3d(0, ${(y * parseFloat(l.dataset.px)).toFixed(1)}px, 0)`;
    });
    raf = 0;
  };
  window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(run); }, { passive: true });
  run();
}

/* Buttons that lean toward the pointer. */
function initMagnetic() {
  if (REDUCE || window.matchMedia('(hover: none)').matches) return;
  document.querySelectorAll('.mag:not([data-mag])').forEach(btn => {
    btn.dataset.mag = '1';
    btn.addEventListener('pointermove', e => {
      const r = btn.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width  / 2)) * .22;
      const dy = (e.clientY - (r.top  + r.height / 2)) * .32;
      btn.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
    });
    btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
  });
}
