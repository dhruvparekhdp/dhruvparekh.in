/* ═══ CHECKOUT ═════════════════════════════════════════════════ */
const STATES = ['Andaman & Nicobar Islands','Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chandigarh','Chhattisgarh','Dadra & Nagar Haveli and Daman & Diu','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jammu & Kashmir','Jharkhand','Karnataka','Kerala','Ladakh','Lakshadweep','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Puducherry','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal'];

let PAY = 'cod';

/* ─── BOOT ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  if (!cartRead().length) {
    document.getElementById('coEmpty').style.display = '';
    return;
  }
  document.getElementById('coMain').style.display = '';

  fillStates();
  renderPayOptions();
  renderSummary();

  document.getElementById('coForm').addEventListener('submit', onSubmit);
  document.getElementById('upiBack').addEventListener('click', () => showStep('coMain'));
  document.getElementById('upiDone').addEventListener('click', onUpiConfirm);

  // digits only
  bindDigits('fPhone', 10);
  bindDigits('fPin', 6);

  initMagnetic();
});

function bindDigits(id, max) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', () => { el.value = el.value.replace(/\D/g, '').slice(0, max); });
}

function fillStates() {
  const sel = document.getElementById('fState');
  sel.innerHTML = '<option value="">Select</option>' +
    STATES.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
}

/* ─── PAYMENT OPTIONS ────────────────────────────────────────── */
function renderPayOptions() {
  const wrap = document.getElementById('payOpts');
  const opts = [];

  if (SHOP.codEnabled) {
    opts.push({
      id: 'cod',
      title: 'Cash on Delivery',
      note: SHOP.codExtraFee > 0
        ? `Pay in cash when your order arrives. ${inr(SHOP.codExtraFee)} handling fee.`
        : 'Pay in cash when your order arrives. No extra charge.',
      badge: '',
    });
  }
  if (SHOP.upiEnabled && SHOP.upiId) {
    opts.push({
      id: 'upi',
      title: 'UPI / QR',
      note: 'Pay instantly with GPay, PhonePe, Paytm or any UPI app.',
      badge: 'Instant',
    });
  }
  if (SHOP.razorpayEnabled && SHOP.razorpayKeyId) {
    opts.push({
      id: 'razorpay',
      title: 'Card / Netbanking / Wallet',
      note: 'Secure payment via Razorpay.',
      badge: '',
    });
  }

  if (!opts.length) {
    wrap.innerHTML = `<p style="font-size:.85rem;color:var(--ink-3)">No payment method is configured yet. Set <code>codEnabled</code> or <code>upiId</code> in <code>js/config.js</code>.</p>`;
    document.getElementById('placeBtn').disabled = true;
    return;
  }

  PAY = opts[0].id;
  wrap.innerHTML = opts.map(o => `
    <label class="pay-opt ${o.id === PAY ? 'on' : ''}" data-pay="${o.id}">
      <input type="radio" name="pay" value="${o.id}" ${o.id === PAY ? 'checked' : ''} />
      <span class="pay-dot"></span>
      <span class="pay-txt">
        <b>${escapeHtml(o.title)}${o.badge ? `<span class="pay-badge">${escapeHtml(o.badge)}</span>` : ''}</b>
        <span>${escapeHtml(o.note)}</span>
      </span>
    </label>`).join('');

  wrap.querySelectorAll('.pay-opt').forEach(el => {
    el.addEventListener('click', () => {
      PAY = el.dataset.pay;
      wrap.querySelectorAll('.pay-opt').forEach(x => x.classList.toggle('on', x === el));
      renderSummary();
    });
  });
}

/* ─── SUMMARY ────────────────────────────────────────────────── */
function renderSummary() {
  const items = cartRead();

  document.getElementById('coItems').innerHTML = items.map(i => {
    const variant = [i.size, i.color].filter(Boolean).join(' · ');
    const thumb = i.image_url
      ? `<img src="${escapeHtml(i.image_url)}" alt="${escapeHtml(i.name)}" onerror="this.outerHTML='<div class=&quot;ph&quot;>✦</div>'" />`
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

  const { subtotal, shipping, codFee, total } = cartTotals(PAY);
  document.getElementById('coSum').innerHTML = `
    <div class="sum-r"><span>Subtotal</span><span>${inr(subtotal)}</span></div>
    <div class="sum-r"><span>Shipping</span><span>${shipping === 0 ? '<span class="free">Free</span>' : inr(shipping)}</span></div>
    ${codFee > 0 ? `<div class="sum-r"><span>COD handling</span><span>${inr(codFee)}</span></div>` : ''}
    <div class="sum-r total"><span>Total</span><span>${inr(total)}</span></div>`;

  const btn = document.getElementById('placeBtn');
  const note = document.getElementById('coNote');
  if (PAY === 'upi') {
    btn.textContent = 'Continue to Payment';
    note.textContent = 'You will pay by UPI on the next step.';
  } else if (PAY === 'razorpay') {
    btn.textContent = 'Pay ' + inr(total);
    note.textContent = 'You will be redirected to a secure payment page.';
  } else {
    btn.textContent = 'Place Order · ' + inr(total);
    note.textContent = 'Pay in cash when your order is delivered.';
  }
}

/* ─── VALIDATION ─────────────────────────────────────────────── */
function setErr(wrapId, msg) {
  const w = document.getElementById(wrapId);
  if (!w) return;
  w.classList.toggle('invalid', Boolean(msg));
  const e = w.querySelector('.err');
  if (e) e.textContent = msg || '';
}

function readForm() {
  const v = id => (document.getElementById(id).value || '').trim();
  return {
    name:     v('fName'),
    phone:    v('fPhone'),
    email:    v('fEmail'),
    address:  v('fAddr'),
    landmark: v('fLandmark'),
    city:     v('fCity'),
    state:    v('fState'),
    pincode:  v('fPin'),
    notes:    v('fNotes'),
  };
}

function validate(f) {
  let ok = true;
  const fail = (w, m) => { setErr(w, m); ok = false; };

  setErr('w-name', ''); setErr('w-phone', ''); setErr('w-email', '');
  setErr('w-addr', ''); setErr('w-city', ''); setErr('w-state', ''); setErr('w-pin', '');

  if (f.name.length < 2)            fail('w-name',  'Please enter your name');
  if (!/^[6-9]\d{9}$/.test(f.phone)) fail('w-phone', 'Enter a valid 10-digit mobile number');
  if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) fail('w-email', 'Enter a valid email address');
  if (f.address.length < 8)         fail('w-addr',  'Please enter your full address');
  if (f.city.length < 2)            fail('w-city',  'Required');
  if (!f.state)                     fail('w-state', 'Required');
  if (!/^\d{6}$/.test(f.pincode))   fail('w-pin',   '6 digits');

  if (!ok) {
    const first = document.querySelector('.field.invalid input, .field.invalid textarea, .field.invalid select');
    if (first) { first.focus(); first.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  }
  return ok;
}

/* ─── SUBMIT ─────────────────────────────────────────────────── */
function onSubmit(e) {
  e.preventDefault();
  const f = readForm();
  if (!validate(f)) return;

  if (PAY === 'upi')      return showUpiStep(f);
  if (PAY === 'razorpay') return startRazorpay(f);
  placeOrder(f, 'cod', 'pending', null);
}

/* ─── UPI STEP ───────────────────────────────────────────────── */
let PENDING_FORM = null;

function showUpiStep(f) {
  PENDING_FORM = f;
  const { total } = cartTotals('upi');
  const orderRef = draftOrderNumber();

  const link = 'upi://pay'
    + '?pa=' + encodeURIComponent(SHOP.upiId)
    + '&pn=' + encodeURIComponent(SHOP.upiName || SHOP.name)
    + '&am=' + encodeURIComponent(total.toFixed(2))
    + '&cu=INR'
    + '&tn=' + encodeURIComponent(orderRef);

  document.getElementById('upiAmt').textContent = inr(total);
  document.getElementById('upiTo').textContent  = SHOP.upiId;
  document.getElementById('upiOpen').href       = link;
  document.getElementById('upiQr').src =
    'https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=0&data=' + encodeURIComponent(link);

  showStep('coUpi');
  initMagnetic();
}

function onUpiConfirm() {
  const ref = (document.getElementById('fRef').value || '').trim();
  if (!/^\w{6,20}$/.test(ref)) {
    setErr('w-ref', 'Enter the reference number from your UPI app');
    document.getElementById('fRef').focus();
    return;
  }
  setErr('w-ref', '');
  placeOrder(PENDING_FORM, 'upi', 'pending', ref);
}

/* ─── RAZORPAY (stub) ────────────────────────────────────────── */
function startRazorpay(f) {
  // Razorpay needs a server to create an order_id and verify the signature,
  // so this stays disabled until a backend function exists.
  // Once you have one, create the order server-side and open the checkout here.
  showToast('Razorpay is not switched on yet — please use UPI or Cash on Delivery.');
  console.info('[saloni] Razorpay stub. See PAYMENTS.md for the wiring steps.', f);
}

/* ─── PLACE ORDER ────────────────────────────────────────────── */
function draftOrderNumber() {
  const t = Date.now().toString(36).toUpperCase().slice(-6);
  const r = Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, '0');
  return 'SC-' + t + r;
}

async function placeOrder(f, method, payStatus, payRef) {
  const btn = method === 'upi' ? document.getElementById('upiDone') : document.getElementById('placeBtn');
  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Placing order…';

  const items = cartRead();
  const { subtotal, shipping, codFee, total } = cartTotals(method);
  const orderNumber = draftOrderNumber();

  const row = {
    order_number:   orderNumber,
    customer_name:  f.name,
    customer_phone: f.phone,
    customer_email: f.email || null,
    address_line:   f.address,
    landmark:       f.landmark || null,
    city:           f.city,
    state:          f.state,
    pincode:        f.pincode,
    items:          items.map(i => ({
      id: i.id, name: i.name, price: i.price, qty: i.qty,
      size: i.size, color: i.color, image_url: i.image_url,
    })),
    subtotal:       subtotal,
    shipping:       shipping + codFee,
    total:          total,
    payment_method: method,
    payment_status: payStatus,
    payment_ref:    payRef,
    order_status:   'placed',
    notes:          f.notes || null,
  };

  try {
    await insertOrder(row);
    cartClear();
    showDone(row);
  } catch (err) {
    console.error('[saloni] order failed:', err);
    btn.disabled = false;
    btn.textContent = label;
    showToast('Could not place the order: ' + (err.message || 'please try again'));
  }
}

/* ─── CONFIRMATION ───────────────────────────────────────────── */
function showDone(row) {
  const methodLabel = { cod: 'Cash on Delivery', upi: 'UPI', razorpay: 'Card / Netbanking' }[row.payment_method] || row.payment_method;

  document.getElementById('doneMsg').textContent = row.payment_method === 'cod'
    ? 'Thank you. We\'ll call to confirm your order, then dispatch it within 2 working days.'
    : 'Thank you. We\'ll verify your payment and dispatch within 2 working days.';

  document.getElementById('doneBox').innerHTML = `
    <div class="done-r"><span>Order number</span><b class="done-no">${escapeHtml(row.order_number)}</b></div>
    <div class="done-r"><span>Total</span><b>${inr(row.total)}</b></div>
    <div class="done-r"><span>Payment</span><b>${escapeHtml(methodLabel)}</b></div>
    ${row.payment_ref ? `<div class="done-r"><span>UPI reference</span><b>${escapeHtml(row.payment_ref)}</b></div>` : ''}
    <div class="done-r"><span>Delivering to</span><b>${escapeHtml(row.customer_name)}<br/>${escapeHtml(row.city)}, ${escapeHtml(row.state)} ${escapeHtml(row.pincode)}</b></div>
    ${SHOP.phone ? `<div class="done-r"><span>Questions?</span><b>${escapeHtml(SHOP.phone)}</b></div>` : ''}`;

  showStep('coDone');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  initMagnetic();
}

function showStep(id) {
  ['coMain', 'coUpi', 'coDone', 'coEmpty'].forEach(s => {
    const el = document.getElementById(s);
    if (el) el.style.display = s === id ? '' : 'none';
  });
}

/* ─── MAGNETIC BUTTONS ───────────────────────────────────────── */
function initMagnetic() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(hover: none)').matches) return;
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
