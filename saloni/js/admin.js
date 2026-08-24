/* ═══ SALONI · ADMIN ════════════════════════════════════════════
   Requires: config.js → store.js → cart.js → admin.js
   ═══════════════════════════════════════════════════════════════ */

let ORDERS = [], PRODUCTS = [];

/* ─── BOOT ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  if (DEGRADED) {
    const b = document.getElementById('setupBanner');
    b.innerHTML = '<span>⚠ <b>Connection problem</b> — could not reach Supabase. Check your network and refresh; nothing shown below is live data.</span>';
    b.style.display = 'flex';
  }

  if (!CONFIGURED) {
    if (!DEGRADED) document.getElementById('setupBanner').style.display = 'flex';
    document.getElementById('auth').classList.remove('on');
    document.getElementById('app').style.display = '';
    return boot();
  }

  const { data: { session } } = await db.auth.getSession();
  if (session && session.user) {
    unlock();
  } else {
    document.getElementById('auth').classList.add('on');
  }

  db.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN')  unlock();
    if (event === 'SIGNED_OUT') {
      document.getElementById('auth').classList.add('on');
      document.getElementById('app').style.display = 'none';
    }
  });
});

function unlock() {
  document.getElementById('auth').classList.remove('on');
  document.getElementById('app').style.display = '';
  const out = document.getElementById('outBtn');
  if (out) out.style.display = '';
  boot();
}

/* The notice banner is in normal flow but the sidebar is fixed at top:0,
   so push the sidebar down by the banner's height while it is on screen. */
function offsetForBanner() {
  const b = document.getElementById('setupBanner');
  const side = document.getElementById('side');
  if (!b || !side || b.offsetParent === null) return;
  const apply = () => { side.style.top = b.offsetHeight + 'px'; };
  apply();
  window.addEventListener('resize', apply);
}

let _booted = false;
async function boot() {
  if (_booted) return;
  _booted = true;
  offsetForBanner();
  wireNav();
  wireSizes();
  wireImage();
  wireDrawer();
  await Promise.all([loadOrders(), loadProducts()]);
}

/* ─── AUTH ───────────────────────────────────────────────────── */
async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('lBtn');
  const err = document.getElementById('lErr');
  btn.disabled = true; btn.textContent = 'Signing in…'; err.textContent = '';
  const { error } = await db.auth.signInWithPassword({
    email:    document.getElementById('lEmail').value.trim(),
    password: document.getElementById('lPass').value,
  });
  if (error) {
    err.textContent = error.message;
    btn.disabled = false; btn.textContent = 'Sign In';
  }
}

async function handleLogout() { await db.auth.signOut(); location.reload(); }

/* ─── NAV ────────────────────────────────────────────────────── */
function wireNav() {
  document.querySelectorAll('.side-link[data-sec]').forEach(b =>
    b.addEventListener('click', () => {
      go(b.dataset.sec);
      if (b.dataset.sec === 'edit') newProduct();
    })
  );
  const t = document.getElementById('sideToggle');
  if (t) t.addEventListener('click', () => document.getElementById('side').classList.toggle('open'));
}

function go(sec) {
  document.querySelectorAll('.sec-a').forEach(s => s.classList.toggle('on', s.id === 's' + '-' + sec));
  document.querySelectorAll('.side-link').forEach(l => l.classList.toggle('on', l.dataset.sec === sec));
  document.getElementById('side').classList.remove('open');
  window.scrollTo({ top: 0 });
}

/* ═══ ORDERS ═══════════════════════════════════════════════════ */
const O_STATUS = ['placed', 'confirmed', 'shipped', 'delivered', 'cancelled'];

async function loadOrders() {
  ORDERS = await getOrders();
  const revenue = ORDERS
    .filter(o => o.order_status !== 'cancelled')
    .reduce((s, o) => s + Number(o.total || 0), 0);

  document.getElementById('oTotal').textContent   = ORDERS.length;
  document.getElementById('oNew').textContent     = ORDERS.filter(o => o.order_status === 'placed').length;
  document.getElementById('oRevenue').textContent = inr(revenue);
  document.getElementById('oPending').textContent = ORDERS.filter(o => o.payment_status !== 'paid' && o.order_status !== 'cancelled').length;
  document.getElementById('navOrders').textContent = ORDERS.length;

  renderOrders();
}

function renderOrders() {
  const wrap = document.getElementById('ordersList');
  const q    = (document.getElementById('oSearch').value || '').toLowerCase();
  const st   = document.getElementById('oStatus').value;

  let list = ORDERS;
  if (q)  list = list.filter(o =>
    (o.order_number   || '').toLowerCase().includes(q) ||
    (o.customer_name  || '').toLowerCase().includes(q) ||
    (o.customer_phone || '').includes(q));
  if (st) list = list.filter(o => o.order_status === st);

  if (!list.length) {
    wrap.innerHTML = `<div class="tbl-empty"><p>${ORDERS.length ? 'No orders match this filter.' : 'No orders yet. They will appear here as soon as someone checks out.'}</p></div>`;
    return;
  }

  wrap.innerHTML = list.map(o => {
    const count = (o.items || []).reduce((n, i) => n + (i.qty || 0), 0);
    return `
      <div class="ord" data-id="${escapeHtml(o.id)}">
        <div class="ord-main">
          <div class="ord-no">${escapeHtml(o.order_number)}</div>
          <div class="ord-who">${escapeHtml(o.customer_name)} · ${escapeHtml(o.customer_phone)}</div>
          <div class="ord-meta">${count} item${count === 1 ? '' : 's'} · ${escapeHtml(o.city)}, ${escapeHtml(o.state)} · ${fmtDate(o.created_at)}</div>
        </div>
        <div class="ord-pay">
          <span class="pill pay-${escapeHtml(o.payment_status)}">${payLabel(o)}</span>
        </div>
        <div class="ord-amt">${inr(o.total)}</div>
        <div class="ord-act">
          <select class="ord-sel" data-status="${escapeHtml(o.id)}">
            ${O_STATUS.map(s => `<option value="${s}"${o.order_status === s ? ' selected' : ''}>${cap(s)}</option>`).join('')}
          </select>
          <button class="btn btn-line btn-sm" data-view="${escapeHtml(o.id)}">View</button>
        </div>
      </div>`;
  }).join('');

  wrap.querySelectorAll('[data-status]').forEach(sel =>
    sel.addEventListener('change', () => setOrderStatus(sel.dataset.status, { order_status: sel.value }))
  );
  wrap.querySelectorAll('[data-view]').forEach(b =>
    b.addEventListener('click', () => viewOrder(b.dataset.view))
  );
}

function payLabel(o) {
  const m = { cod: 'COD', upi: 'UPI', razorpay: 'Card' }[o.payment_method] || o.payment_method;
  return `${m} · ${cap(o.payment_status)}`;
}

async function setOrderStatus(id, patch) {
  try {
    await updateOrder(id, patch);
    const o = ORDERS.find(x => x.id === id);
    if (o) Object.assign(o, patch);
    showToast('Order updated');
    loadOrders();
  } catch (e) {
    showToast('Could not update: ' + e.message);
  }
}

function viewOrder(id) {
  const o = ORDERS.find(x => x.id === id);
  if (!o) return;
  const items = (o.items || []).map(i => {
    const variant = [i.size, i.color].filter(Boolean).join(' · ');
    const thumb = i.image_url
      ? `<img src="${escapeHtml(i.image_url)}" alt="" onerror="this.outerHTML='<div class=&quot;ph&quot;>✦</div>'" />`
      : `<div class="ph">✦</div>`;
    return `
      <div class="co-item">
        ${thumb}
        <div>
          <div class="nm">${escapeHtml(i.name)}</div>
          <div class="vr">${variant ? escapeHtml(variant) + ' · ' : ''}Qty ${i.qty}</div>
        </div>
        <div class="pr">${inr(i.price * i.qty)}</div>
      </div>`;
  }).join('');

  document.getElementById('oBody').innerHTML = `
    <div class="od">
      <div class="od-top">
        <div>
          <div class="od-no">${escapeHtml(o.order_number)}</div>
          <div class="od-date">${fmtDate(o.created_at, true)}</div>
        </div>
        <span class="pill st-${escapeHtml(o.order_status)}">${cap(o.order_status)}</span>
      </div>

      <h4 class="od-h">Customer</h4>
      <div class="od-kv"><span>Name</span><b>${escapeHtml(o.customer_name)}</b></div>
      <div class="od-kv"><span>Phone</span><b><a href="tel:${escapeHtml(o.customer_phone)}">${escapeHtml(o.customer_phone)}</a></b></div>
      ${o.customer_email ? `<div class="od-kv"><span>Email</span><b><a href="mailto:${escapeHtml(o.customer_email)}">${escapeHtml(o.customer_email)}</a></b></div>` : ''}

      <h4 class="od-h">Delivery Address</h4>
      <p class="od-addr">${escapeHtml(o.address_line)}${o.landmark ? '<br/>Near ' + escapeHtml(o.landmark) : ''}<br/>${escapeHtml(o.city)}, ${escapeHtml(o.state)} — ${escapeHtml(o.pincode)}</p>
      <button class="btn btn-line btn-sm" onclick="copyAddress('${escapeHtml(o.id)}')">Copy address</button>

      <h4 class="od-h">Items</h4>
      <div class="co-items">${items}</div>

      <div class="sum">
        <div class="sum-r"><span>Subtotal</span><span>${inr(o.subtotal)}</span></div>
        <div class="sum-r"><span>Shipping</span><span>${Number(o.shipping) === 0 ? '<span class="free">Free</span>' : inr(o.shipping)}</span></div>
        <div class="sum-r total"><span>Total</span><span>${inr(o.total)}</span></div>
      </div>

      <h4 class="od-h">Payment</h4>
      <div class="od-kv"><span>Method</span><b>${escapeHtml({ cod:'Cash on Delivery', upi:'UPI', razorpay:'Card / Netbanking' }[o.payment_method] || o.payment_method)}</b></div>
      ${o.payment_ref ? `<div class="od-kv"><span>Reference</span><b>${escapeHtml(o.payment_ref)}</b></div>` : ''}
      <div class="od-kv"><span>Status</span><b>${cap(o.payment_status)}</b></div>
      ${o.payment_status !== 'paid'
        ? `<button class="btn btn-fill btn-block" style="margin-top:.8rem" onclick="markPaid('${escapeHtml(o.id)}')">Mark as Paid</button>`
        : ''}

      ${o.notes ? `<h4 class="od-h">Customer Note</h4><p class="od-addr">${escapeHtml(o.notes)}</p>` : ''}
    </div>`;
  openDrawer('oDrawer');
}

async function markPaid(id) {
  await setOrderStatus(id, { payment_status: 'paid' });
  closeDrawer('oDrawer');
}

function copyAddress(id) {
  const o = ORDERS.find(x => x.id === id);
  if (!o) return;
  const text = [
    o.customer_name,
    o.customer_phone,
    o.address_line,
    o.landmark ? 'Near ' + o.landmark : '',
    `${o.city}, ${o.state} - ${o.pincode}`,
  ].filter(Boolean).join('\n');
  navigator.clipboard.writeText(text)
    .then(() => showToast('Address copied'))
    .catch(() => showToast('Could not copy'));
}

/* ═══ PRODUCTS ═════════════════════════════════════════════════ */
async function loadProducts() {
  PRODUCTS = await getProducts();
  const counts = categoryCounts(PRODUCTS);
  const value  = PRODUCTS.reduce((s, p) => s + Number(p.price || 0), 0);

  document.getElementById('pTotal').textContent = PRODUCTS.length;
  document.getElementById('pCats').textContent  = Object.keys(counts).length;
  document.getElementById('pFeat').textContent  = PRODUCTS.filter(p => p.featured).length;
  document.getElementById('pValue').textContent = inr(value);
  document.getElementById('navProducts').textContent = PRODUCTS.length;

  const names = Object.keys(counts);
  document.getElementById('catList').innerHTML = names.map(c => `<option value="${escapeHtml(c)}">`).join('');
  const sel = document.getElementById('pCat');
  const cur = sel.value;
  sel.innerHTML = '<option value="">All categories</option>' +
    names.map(c => `<option value="${escapeHtml(c)}"${c === cur ? ' selected' : ''}>${escapeHtml(c)}</option>`).join('');

  renderProducts();
}

function renderProducts() {
  const body  = document.getElementById('pBody');
  const empty = document.getElementById('pEmpty');
  const q     = (document.getElementById('pSearch').value || '').toLowerCase();
  const cat   = document.getElementById('pCat').value;

  let list = PRODUCTS;
  if (q)   list = list.filter(p =>
    p.name.toLowerCase().includes(q) ||
    (p.category || '').toLowerCase().includes(q) ||
    (p.description || '').toLowerCase().includes(q));
  if (cat) list = list.filter(p => p.category === cat);

  if (!list.length) {
    body.innerHTML = '';
    empty.style.display = 'block';
    empty.querySelector('p').innerHTML = PRODUCTS.length
      ? 'No products match this filter.'
      : 'No products yet. <button class="lnk" onclick="newProduct()">Add your first product →</button>';
    return;
  }
  empty.style.display = 'none';

  body.innerHTML = list.map(p => `
    <tr>
      <td>${p.image_url
        ? `<img class="thumb" src="${escapeHtml(p.image_url)}" alt="" onerror="this.outerHTML='<div class=&quot;thumb ph&quot;>✦</div>'" />`
        : `<div class="thumb ph">✦</div>`}</td>
      <td><span class="t-nm">${escapeHtml(p.name)}</span></td>
      <td><span class="t-cat">${escapeHtml(p.category)}</span></td>
      <td><span class="t-pr">${inr(p.price)}</span></td>
      <td>${p.featured ? '<span class="pill st-delivered">★ Featured</span>' : '<span class="dash">—</span>'}</td>
      <td>
        <div class="t-act">
          <button class="btn btn-line btn-sm" onclick="editProduct('${escapeHtml(p.id)}')">Edit</button>
          <button class="btn btn-line btn-sm danger" onclick="askDelete('${escapeHtml(p.id)}')">Delete</button>
        </div>
      </td>
    </tr>`).join('');
}

/* ─── FORM ───────────────────────────────────────────────────── */
let COLORS = [], FILE = null;

function newProduct() {
  go('edit');
  document.getElementById('pForm').reset();
  document.getElementById('editId').value = '';
  document.getElementById('fTitle').textContent = 'Add Product';
  document.getElementById('fSub').textContent   = 'Fill in the details below';
  document.getElementById('saveBtn').textContent = 'Add Product';
  clearImg();
  setSizes([]);
  COLORS = []; renderChips();
}

function editProduct(id) {
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;
  go('edit');
  document.getElementById('editId').value = p.id;
  document.getElementById('fName').value  = p.name || '';
  document.getElementById('fCat').value   = p.category || '';
  document.getElementById('fPrice').value = p.price || '';
  document.getElementById('fWas').value   = p.original_price || '';
  document.getElementById('fDesc').value  = p.description || '';
  document.getElementById('fTags').value  = (p.tags || []).join(', ');
  document.getElementById('fBadge').value = p.badge || '';
  document.getElementById('fFeat').checked = Boolean(p.featured);
  if (p.image_url) showImg(p.image_url, true); else clearImg();
  setSizes(p.sizes || []);
  COLORS = [...(p.colors || [])]; renderChips();
  document.getElementById('fTitle').textContent = 'Edit Product';
  document.getElementById('fSub').textContent   = p.name;
  document.getElementById('saveBtn').textContent = 'Save Changes';
}

async function saveProduct(e) {
  e.preventDefault();
  const btn = document.getElementById('saveBtn');
  const img = document.getElementById('fImg').value.trim();
  if (!img) { showToast('Please add a product image'); return; }

  const label = btn.textContent;
  btn.disabled = true; btn.textContent = 'Saving…';

  try {
    let imageUrl = img;
    if (FILE && img === '__file__') {
      imageUrl = await uploadImage(FILE);
      FILE = null;
    }

    const row = {
      name:           document.getElementById('fName').value.trim(),
      category:       document.getElementById('fCat').value.trim(),
      price:          parseFloat(document.getElementById('fPrice').value),
      original_price: parseFloat(document.getElementById('fWas').value) || null,
      description:    document.getElementById('fDesc').value.trim(),
      badge:          document.getElementById('fBadge').value.trim(),
      featured:       document.getElementById('fFeat').checked,
      image_url:      imageUrl,
      sizes:          [...document.querySelectorAll('#sizeRow .opt-b.on')].map(b => b.dataset.size),
      colors:         [...COLORS],
      tags:           document.getElementById('fTags').value.split(',').map(t => t.trim()).filter(Boolean),
    };

    const id = document.getElementById('editId').value;
    if (id) { await updateProduct(id, row); showToast('Product updated'); }
    else    { await addProduct(row);        showToast('Product added'); }

    await loadProducts();
    go('products');
  } catch (err) {
    console.error(err);
    showToast('Could not save: ' + (err.message || 'unknown error'));
  } finally {
    btn.disabled = false; btn.textContent = label;
  }
}

/* ─── DELETE ─────────────────────────────────────────────────── */
let DEL_ID = null;

function askDelete(id) {
  DEL_ID = id;
  document.getElementById('delModal').classList.add('on');
}
function closeDel() {
  DEL_ID = null;
  document.getElementById('delModal').classList.remove('on');
}
document.addEventListener('DOMContentLoaded', () => {
  const yes = document.getElementById('delYes');
  if (yes) yes.addEventListener('click', async () => {
    if (!DEL_ID) return;
    const p = PRODUCTS.find(x => x.id === DEL_ID);
    try {
      if (p && p.image_url) await deleteImage(p.image_url);
      await deleteProduct(DEL_ID);
      showToast('Product deleted');
      closeDel();
      await loadProducts();
    } catch (err) {
      showToast('Could not delete: ' + err.message);
    }
  });
  const modal = document.getElementById('delModal');
  if (modal) modal.addEventListener('click', e => { if (e.target === modal) closeDel(); });
});

/* ─── SIZES & COLOURS ────────────────────────────────────────── */
function wireSizes() {
  document.querySelectorAll('#sizeRow .opt-b').forEach(b =>
    b.addEventListener('click', () => b.classList.toggle('on'))
  );
}
function setSizes(sizes) {
  document.querySelectorAll('#sizeRow .opt-b').forEach(b =>
    b.classList.toggle('on', (sizes || []).includes(b.dataset.size))
  );
}
function addColor() {
  const el = document.getElementById('colorIn');
  el.value.split(',').map(c => c.trim()).filter(Boolean).forEach(c => {
    if (!COLORS.includes(c)) COLORS.push(c);
  });
  el.value = '';
  renderChips();
}
function renderChips() {
  document.getElementById('chips').innerHTML = COLORS.map((c, i) =>
    `<span class="chip-c">${escapeHtml(c)}<button type="button" onclick="rmColor(${i})" aria-label="Remove">×</button></span>`
  ).join('');
}
function rmColor(i) { COLORS.splice(i, 1); renderChips(); }

/* ─── IMAGE ──────────────────────────────────────────────────── */
function wireImage() {
  const drop = document.getElementById('drop');
  const file = document.getElementById('fFile');
  const url  = document.getElementById('fUrl');
  if (!drop) return;

  document.getElementById('ph').addEventListener('click', () => file.click());
  file.addEventListener('change', e => { if (e.target.files[0]) takeFile(e.target.files[0]); });

  url.addEventListener('input', () => {
    const v = url.value.trim();
    if (!v) return;
    const probe = new Image();
    probe.onload = () => { FILE = null; showImg(v, true); };
    probe.src = v;
  });

  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', e => {
    e.preventDefault(); drop.classList.remove('over');
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) takeFile(f);
  });
}

function takeFile(f) {
  if (f.size > 5 * 1024 * 1024) { showToast('Image must be under 5 MB'); return; }
  FILE = f;
  showImg(URL.createObjectURL(f), false);
}

function showImg(src, isFinal) {
  document.getElementById('prev').src = src;
  document.getElementById('prevWrap').style.display = 'block';
  document.getElementById('ph').style.display = 'none';
  document.getElementById('fImg').value = isFinal ? src : '__file__';
}

function clearImg() {
  FILE = null;
  document.getElementById('fImg').value = '';
  document.getElementById('fUrl').value = '';
  document.getElementById('fFile').value = '';
  document.getElementById('prevWrap').style.display = 'none';
  document.getElementById('ph').style.display = '';
}

/* ─── DRAWER ─────────────────────────────────────────────────── */
function wireDrawer() {
  const s = document.getElementById('scrim');
  if (s) s.addEventListener('click', () => closeDrawer('oDrawer'));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeDrawer('oDrawer'); closeDel(); }
  });
}
function openDrawer(id) {
  document.getElementById(id).classList.add('on');
  document.getElementById(id).setAttribute('aria-hidden', 'false');
  document.getElementById('scrim').classList.add('on');
  document.body.style.overflow = 'hidden';
}
function closeDrawer(id) {
  const d = document.getElementById(id);
  if (d) { d.classList.remove('on'); d.setAttribute('aria-hidden', 'true'); }
  document.getElementById('scrim').classList.remove('on');
  document.body.style.overflow = '';
}

/* ─── UTIL ───────────────────────────────────────────────────── */
function cap(s) { return String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1); }

function fmtDate(iso, long) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleString('en-IN', long
    ? { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}
