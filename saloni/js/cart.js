/* ═══ CART · localStorage-backed, shared across pages ═══════════ */
const CART_KEY = 'saloni_cart_v1';

function cartRead() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}

function cartWrite(items) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch (e) {}
  document.dispatchEvent(new CustomEvent('cart:change', { detail: items }));
}

/* A cart line is unique by product + size + colour. */
function lineKey(id, size, color) {
  return [id, size || '-', color || '-'].join('::');
}

function cartAdd(product, { size = '', color = '', qty = 1 } = {}) {
  const items = cartRead();
  const key = lineKey(product.id, size, color);
  const found = items.find(i => i.key === key);
  if (found) {
    found.qty += qty;
  } else {
    items.push({
      key,
      id:        product.id,
      name:      product.name,
      price:     Number(product.price),
      image_url: product.image_url || '',
      category:  product.category || '',
      size, color,
      qty,
    });
  }
  cartWrite(items);
  return items;
}

function cartSetQty(key, qty) {
  let items = cartRead();
  if (qty <= 0) {
    items = items.filter(i => i.key !== key);
  } else {
    const line = items.find(i => i.key === key);
    if (line) line.qty = qty;
  }
  cartWrite(items);
  return items;
}

function cartRemove(key) {
  cartWrite(cartRead().filter(i => i.key !== key));
}

function cartClear() { cartWrite([]); }

function cartCount() {
  return cartRead().reduce((n, i) => n + i.qty, 0);
}

function cartSubtotal() {
  return cartRead().reduce((s, i) => s + i.price * i.qty, 0);
}

/* Shipping: free above the threshold, flat below it. Empty cart ships free. */
function cartShipping(subtotal = cartSubtotal()) {
  if (subtotal <= 0) return 0;
  const free = Number(SHOP.freeShippingAbove) || 0;
  if (free > 0 && subtotal >= free) return 0;
  return Number(SHOP.shippingFlat) || 0;
}

function cartTotals(paymentMethod = 'cod') {
  const subtotal = cartSubtotal();
  const shipping = cartShipping(subtotal);
  const codFee   = paymentMethod === 'cod' ? (Number(SHOP.codExtraFee) || 0) : 0;
  return { subtotal, shipping, codFee, total: subtotal + shipping + codFee };
}

/* ─── FORMATTING ─────────────────────────────────────────────── */
function inr(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ─── TOAST ──────────────────────────────────────────────────── */
function showToast(msg, ms = 2800) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(t._tid);
  t._tid = setTimeout(() => t.classList.remove('on'), ms);
}
