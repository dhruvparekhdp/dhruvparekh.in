/* ═══ SALONI · STOREFRONT ═══════════════════════════════════════
   Requires: config.js → store.js → cart.js → app.js
   ═══════════════════════════════════════════════════════════════ */

document.documentElement.classList.add('js');
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

  mountWhatsApp();
  applySeo({
    title: `${SHOP.name} \u2014 Handcrafted Womenswear Online`,
    description: `Shop handcrafted kurtas, sarees, anarkalis and co-ords from ${SHOP.name}. Small-batch pieces, honest fabrics, cash on delivery across India.`,
    path: '/',
  });
  ldOrganization();
  ldProducts(PRODUCTS);
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
    const open = ev => {
      if (ev.target.closest('.p-fav')) return;
      openProduct(p);
    };
    el.addEventListener('click', open);
    // The button inside already fires click on Enter and Space.
    el.querySelector('.p-open').addEventListener('click', ev => { ev.stopPropagation(); openProduct(p); });
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
  const out   = isSoldOut(p);
  const tag   = p.badge ? `<span class="p-tag ${p.badge.toLowerCase() === 'sale' ? 'sale' : p.badge.toLowerCase() === 'new' ? 'new' : ''}">${escapeHtml(p.badge)}</span>` : '';
  const media = p.image_url
    ? `<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" loading="lazy"
           onerror="this.outerHTML='<div class=&quot;p-ph&quot;><b>✦</b><span>No image</span></div>'" />`
    : `<div class="p-ph"><b>✦</b><span>No image</span></div>`;
  const sizes = (p.sizes || []).slice(0, 5).map(s => `<span class="sz">${escapeHtml(s)}</span>`).join('');

  return `
    <article class="p-card reveal ${wide ? 'wide' : ''} ${out ? 'is-out' : ''} ${i < 4 ? 'd' + (i + 1) : ''}">
      <div class="p-media">
        ${media}${out ? '<div class="p-out">Sold out</div>' : tag}
        <button class="p-fav" aria-label="Save to wishlist">♡</button>
        <div class="p-quick" aria-hidden="true">${out ? 'View details' : 'Quick view'}</div>
      </div>
      <div class="p-body">
        <div class="p-cat">${escapeHtml(p.category)}</div>
        <h3 class="p-name"><button type="button" class="p-open">${escapeHtml(p.name)}</button></h3>
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
  const out  = isSoldOut(p);

  const media = p.image_url
    ? `<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}"
           onerror="this.outerHTML='<div class=&quot;p-ph&quot; style=&quot;height:100%&quot;><b>\u2726</b><span>No image</span></div>'" />`
    : `<div class="p-ph" style="height:100%"><b>\u2726</b><span>No image</span></div>`;

  const sizeOpts = (p.sizes || []).map(s => {
    const gone = sizeSoldOut(p, s);
    return `<button class="opt-b ${s === DSize ? 'on' : ''} ${gone ? 'gone' : ''}"
                    data-size="${escapeHtml(s)}" ${gone ? 'disabled aria-disabled="true"' : ''}
                    title="${gone ? 'Sold out' : ''}">${escapeHtml(s)}</button>`;
  }).join('');

  const colorOpts = (p.colors || []).map(c =>
    `<button class="opt-b ${c === DColor ? 'on' : ''}" data-color="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('');

  const guide = sizeGuideHtml(p);

  body.innerHTML = `
    <div class="dr-media">${media}
      ${out ? '<div class="dr-out">Sold out</div>' : ''}
      ${p.badge && !out ? `<span class="p-tag ${p.badge.toLowerCase()==='sale'?'sale':p.badge.toLowerCase()==='new'?'new':''}" style="top:1rem;left:1rem">${escapeHtml(p.badge)}</span>` : ''}
    </div>
    <div class="dr-info">
      <div class="dr-cat">${escapeHtml(p.category)}</div>
      <h2 class="dr-name">${escapeHtml(p.name)}</h2>
      <div class="dr-price-row">
        <span class="dr-price">${inr(p.price)}</span>
        ${p.original_price ? `<span class="dr-was">${inr(p.original_price)}</span>` : ''}
        ${off ? `<span class="dr-off">${off}% off</span>` : ''}
      </div>
      <p class="dr-desc">${escapeHtml(p.description)}</p>

      ${(p.fabric || p.care || p.model_note) ? `<div class="spec">
        ${p.fabric ? `<div class="spec-r"><span>Fabric</span><b>${escapeHtml(p.fabric)}</b></div>` : ''}
        ${p.care ? `<div class="spec-r"><span>Care</span><b>${escapeHtml(p.care)}</b></div>` : ''}
        ${p.model_note ? `<div class="spec-r"><span>Fit note</span><b>${escapeHtml(p.model_note)}</b></div>` : ''}
      </div>` : ''}

      ${sizeOpts ? `<div class="opt">
        <div class="opt-lab">
          <span>Size</span>
          ${guide ? `<button class="lnk-sm" id="szToggle" type="button">Size guide</button>` : `<span class="pick" id="pickSize">${DSize ? escapeHtml(DSize) : 'Select a size'}</span>`}
        </div>
        <div class="opt-row" id="sizeRow">${sizeOpts}</div>
        ${guide ? `<div class="sz-guide" id="szGuide" hidden>${guide}</div>` : ''}
      </div>` : ''}

      ${colorOpts ? `<div class="opt">
        <div class="opt-lab"><span>Colour</span><span class="pick" id="pickColor">${DColor ? escapeHtml(DColor) : 'Select a colour'}</span></div>
        <div class="opt-row" id="colorRow">${colorOpts}</div>
      </div>` : ''}

      <div class="opt">
        <div class="opt-lab"><span>Quantity</span></div>
        <div class="qty">
          <button id="qMinus" type="button" aria-label="Decrease quantity">\u2212</button>
          <span id="qVal">${DQty}</span>
          <button id="qPlus" type="button" aria-label="Increase quantity">+</button>
        </div>
      </div>

      <div class="opt pin-box">
        <div class="opt-lab"><span>Delivery</span></div>
        <div class="pin-row">
          <input type="text" id="pinIn" inputmode="numeric" maxlength="6"
                 placeholder="Enter pincode" aria-label="Delivery pincode" />
          <button type="button" class="btn btn-line btn-sm" id="pinGo">Check</button>
        </div>
        <p class="pin-out" id="pinOut"></p>
      </div>

      <div class="dr-meta">
        <div class="dr-meta-r"><b>\u2726</b> ${SHOP.freeShippingAbove ? `Free shipping over ${inr(SHOP.freeShippingAbove)}` : `Flat ${inr(SHOP.shippingFlat)} shipping`}</div>
        <div class="dr-meta-r"><b>\u25c8</b> Cash on delivery available across India</div>
        <div class="dr-meta-r"><b>\u274b</b> Handcrafted in small batches</div>
      </div>

      ${waAvailable() ? `<a class="btn btn-wa btn-block" href="${waProductLink(p)}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2Z"/><path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.7 1-.9 1.2-.2.2-.3.2-.6.1-1.6-.8-2.7-1.5-3.8-3.4-.3-.5.3-.4.8-1.4.1-.2 0-.4 0-.5s-.7-1.6-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.4 1.9.8 2.6.9 3.5.8.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3Z"/></svg>
        Ask about this piece
      </a>` : ''}
    </div>`;

  /* size + colour pickers */
  body.querySelectorAll('[data-size]:not([disabled])').forEach(b => b.addEventListener('click', () => {
    DSize = b.dataset.size;
    body.querySelectorAll('[data-size]').forEach(x => x.classList.toggle('on', x === b));
    const pick = document.getElementById('pickSize');
    if (pick) pick.textContent = DSize;
  }));
  body.querySelectorAll('[data-color]').forEach(b => b.addEventListener('click', () => {
    DColor = b.dataset.color;
    body.querySelectorAll('[data-color]').forEach(x => x.classList.toggle('on', x === b));
    const pick = document.getElementById('pickColor');
    if (pick) pick.textContent = DColor;
  }));

  /* quantity */
  document.getElementById('qMinus').addEventListener('click', () => {
    DQty = Math.max(1, DQty - 1);
    document.getElementById('qVal').textContent = DQty;
  });
  document.getElementById('qPlus').addEventListener('click', () => {
    DQty = Math.min(10, DQty + 1);
    document.getElementById('qVal').textContent = DQty;
  });

  /* size guide */
  const szToggle = document.getElementById('szToggle');
  if (szToggle) szToggle.addEventListener('click', () => {
    const g = document.getElementById('szGuide');
    g.hidden = !g.hidden;
    szToggle.textContent = g.hidden ? 'Size guide' : 'Hide guide';
  });

  /* pincode delivery estimate */
  const pinIn = document.getElementById('pinIn');
  const pinGo = document.getElementById('pinGo');
  const pinOut = document.getElementById('pinOut');
  const checkPin = () => {
    const v = (pinIn.value || '').replace(/\D/g, '');
    if (v.length !== 6) { pinOut.className = 'pin-out warn'; pinOut.textContent = 'Enter a 6-digit pincode'; return; }
    const est = deliveryEstimate(v);
    if (!est) { pinOut.className = 'pin-out warn'; pinOut.textContent = 'We could not read that pincode'; return; }
    pinOut.className = 'pin-out ok';
    pinOut.innerHTML = `Delivers to ${escapeHtml(est.label.toLowerCase())} by <b>${escapeHtml(est.from)} \u2013 ${escapeHtml(est.to)}</b>`;
    try { localStorage.setItem('saloni_pin', v); } catch (e) {}
  };
  pinIn.addEventListener('input', () => { pinIn.value = pinIn.value.replace(/\D/g, '').slice(0, 6); });
  pinIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); checkPin(); } });
  pinGo.addEventListener('click', checkPin);
  try {
    const saved = localStorage.getItem('saloni_pin');
    if (saved) { pinIn.value = saved; checkPin(); }
  } catch (e) {}

  /* add-to-bag reflects stock */
  const addBtn = document.getElementById('pAdd');
  if (addBtn) {
    addBtn.disabled = out;
    addBtn.textContent = out ? 'Sold out' : 'Add to Bag';
  }

  body.scrollTop = 0;
}

document.addEventListener('DOMContentLoaded', () => {
  const add = document.getElementById('pAdd');
  if (add) add.addEventListener('click', () => {
    if (!DP) return;
    if (isSoldOut(DP)) { showToast('This piece is sold out'); return; }
    if (availableSizes(DP).length && !DSize)  { showToast('Please choose a size');   return; }
    if (DSize && sizeSoldOut(DP, DSize))      { showToast('That size is sold out');  return; }
    if ((DP.colors || []).length && !DColor)  { showToast('Please choose a colour'); return; }
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
