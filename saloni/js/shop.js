/* ═══ SALONI · SHOP HELPERS ═════════════════════════════════════
   WhatsApp links, delivery estimates, size guides, SEO tags.
   Requires: config.js. Loaded before cart.js on every page.
   ═══════════════════════════════════════════════════════════════ */

/* ─── WHATSAPP ───────────────────────────────────────────────── */
function waAvailable() {
  return Boolean(SHOP.whatsapp && /^\d{10,15}$/.test(SHOP.whatsapp));
}

function waLink(message) {
  if (!waAvailable()) return '';
  return 'https://wa.me/' + SHOP.whatsapp + '?text=' + encodeURIComponent(message);
}

function waProductLink(p) {
  return waLink(
    `Hi! I'm interested in this piece from ${SHOP.name}:\n\n` +
    `${p.name}\n${inr(p.price)}\n\n` +
    `Could you tell me more about it?`
  );
}

function waOrderLink(orderNumber) {
  return waLink(
    `Hi! I have a question about my order ${orderNumber} from ${SHOP.name}.`
  );
}

function waGeneralLink() {
  return waLink(`Hi! I have a question about ${SHOP.name}.`);
}

/* Floating support button, injected on every customer-facing page. */
function mountWhatsApp() {
  if (!waAvailable() || document.getElementById('waFab')) return;
  const a = document.createElement('a');
  a.id = 'waFab';
  a.className = 'wa-fab';
  a.href = waGeneralLink();
  a.target = '_blank';
  a.rel = 'noopener';
  a.setAttribute('aria-label', 'Chat with us on WhatsApp');
  a.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.7 1-.9 1.2-.2.2-.3.2-.6.1-1.6-.8-2.7-1.5-3.8-3.4-.3-.5.3-.4.8-1.4.1-.2 0-.4 0-.5s-.7-1.6-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.4 1.9.8 2.6.9 3.5.8.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3Z"/><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2Z"/></svg>' +
    '<span>Chat with us</span>';
  document.body.appendChild(a);
}

/* ─── DELIVERY ESTIMATE ──────────────────────────────────────── */
function pinZone(pincode) {
  const pin = String(pincode || '').replace(/\D/g, '');
  if (pin.length !== 6) return null;
  const p3 = pin.slice(0, 3);
  if (PIN_ZONES.metro.includes(p3))  return 'metro';
  if (PIN_ZONES.remote.includes(p3)) return 'remote';
  if (PIN_ZONES.tier2.includes(p3))  return 'tier2';
  return 'rest';
}

/* Adds working days (skips Sundays — most Indian couriers deliver Mon-Sat). */
function addWorkingDays(from, days) {
  const d = new Date(from.getTime());
  let left = days;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) left--;
  }
  return d;
}

function fmtDay(d) {
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function deliveryEstimate(pincode) {
  const zone = pinZone(pincode);
  if (!zone) return null;
  const z = DELIVERY_ZONES[zone];
  const dispatch = Number(SHOP.dispatchDays) || 2;
  const now = new Date();
  return {
    zone,
    label: z.label,
    from:  fmtDay(addWorkingDays(now, dispatch + z.days[0])),
    to:    fmtDay(addWorkingDays(now, dispatch + z.days[1])),
  };
}

/* ─── SIZE GUIDE ─────────────────────────────────────────────── */
/* measurements is { "S": {"bust":36,"waist":30,"length":44}, ... } */
const MEASURE_LABELS = { bust: 'Bust', waist: 'Waist', hip: 'Hip', length: 'Length', shoulder: 'Shoulder', sleeve: 'Sleeve' };

function hasMeasurements(p) {
  return p && p.measurements && Object.keys(p.measurements).length > 0;
}

function sizeGuideHtml(p) {
  if (!hasMeasurements(p)) return '';
  const sizes = Object.keys(p.measurements);
  const keys = [...new Set(sizes.flatMap(s => Object.keys(p.measurements[s] || {})))]
    .filter(k => MEASURE_LABELS[k]);
  if (!keys.length) return '';

  return `
    <table class="sz-table">
      <thead>
        <tr><th>Size</th>${keys.map(k => `<th>${escapeHtml(MEASURE_LABELS[k])}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${sizes.map(s => `
          <tr>
            <td><b>${escapeHtml(s)}</b></td>
            ${keys.map(k => {
              const v = (p.measurements[s] || {})[k];
              return `<td>${v ? escapeHtml(String(v)) + '"' : '&mdash;'}</td>`;
            }).join('')}
          </tr>`).join('')}
      </tbody>
    </table>
    <p class="sz-note">All measurements in inches, taken flat across the garment. Allow up to half an inch either way on handcrafted pieces.</p>`;
}

/* ─── STOCK ──────────────────────────────────────────────────── */
function isSoldOut(p) {
  return p && p.in_stock === false;
}

function sizeSoldOut(p, size) {
  return Boolean(p && Array.isArray(p.sold_out_sizes) && p.sold_out_sizes.includes(size));
}

function availableSizes(p) {
  return (p.sizes || []).filter(s => !sizeSoldOut(p, s));
}

/* ─── SEO ────────────────────────────────────────────────────── */
function setMeta(attr, key, content) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(url) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = url;
}

/* Social preview: what Instagram, Facebook and WhatsApp show when the
   link is pasted. Without these, a shared link renders as bare text. */
function applySeo({ title, description, path = '/', image } = {}) {
  const base = (SHOP.siteUrl || '').replace(/\/$/, '');
  const url  = base + path;
  const img  = image || (base + '/og-cover.png');

  if (title) document.title = title;
  setMeta('name', 'description', description);
  setCanonical(url);

  setMeta('property', 'og:type',        'website');
  setMeta('property', 'og:site_name',   SHOP.name);
  setMeta('property', 'og:title',       title);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:url',         url);
  setMeta('property', 'og:image',       img);
  setMeta('property', 'og:locale',      'en_IN');

  setMeta('name', 'twitter:card',        'summary_large_image');
  setMeta('name', 'twitter:title',       title);
  setMeta('name', 'twitter:description', description);
  setMeta('name', 'twitter:image',       img);
}

function jsonLd(obj, id) {
  const key = id || 'ld-' + Math.random().toString(36).slice(2, 8);
  let el = document.getElementById(key);
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = key;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(obj);
}

/* Tells Google this is a real shop with a real contact point. */
function ldOrganization() {
  const base = (SHOP.siteUrl || '').replace(/\/$/, '');
  const sameAs = [];
  if (SHOP.instagram) sameAs.push('https://instagram.com/' + SHOP.instagram);
  if (SHOP.facebook)  sameAs.push('https://facebook.com/' + SHOP.facebook);

  jsonLd({
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    name: SHOP.name,
    description: SHOP.tagline,
    url: base + '/',
    image: base + '/og-cover.png',
    areaServed: 'IN',
    currenciesAccepted: 'INR',
    paymentAccepted: 'Cash on Delivery, UPI',
    ...(sameAs.length ? { sameAs } : {}),
    ...(SHOP.email || SHOP.phone ? {
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        ...(SHOP.email ? { email: SHOP.email } : {}),
        ...(SHOP.phone ? { telephone: SHOP.phone } : {}),
        areaServed: 'IN',
        availableLanguage: ['en', 'hi'],
      },
    } : {}),
  }, 'ld-org');
}

/* Product rich results — this is what can put your pieces into
   Google image/shopping surfaces without paying for ads. */
function ldProducts(products) {
  if (!products || !products.length) return;
  const base = (SHOP.siteUrl || '').replace(/\/$/, '');
  jsonLd({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: products.slice(0, 30).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: p.name,
        description: p.description,
        ...(p.image_url ? { image: p.image_url } : {}),
        ...(p.category ? { category: p.category } : {}),
        ...(p.fabric ? { material: p.fabric } : {}),
        brand: { '@type': 'Brand', name: SHOP.name },
        offers: {
          '@type': 'Offer',
          price: String(p.price),
          priceCurrency: 'INR',
          availability: isSoldOut(p)
            ? 'https://schema.org/OutOfStock'
            : 'https://schema.org/InStock',
          url: base + '/#product-' + p.id,
          seller: { '@type': 'Organization', name: SHOP.name },
        },
      },
    })),
  }, 'ld-products');
}
