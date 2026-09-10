// ═══ SALONI · CONFIG ════════════════════════════════════════════
// Everything you may need to change lives in this one file.

// ─── SUPABASE ─────────────────────────────────────────────────
// From: supabase.com -> Project Settings -> API
const SUPABASE_URL      = 'https://kvrmqsrfuuuhsvljjlxv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2cm1xc3JmdXV1aHN2bGpqbHh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwODIxNTYsImV4cCI6MjA5NjY1ODE1Nn0.uxV-wuHIcxOqNuAqzBCaHE9Etm_rMBZ5fQ8GkR3cWV4';
const STORAGE_BUCKET    = 'product-images';

// ─── SHOP ─────────────────────────────────────────────────────
const SHOP = {
  name:     'Saloni Collection',
  tagline:  'Handcrafted womenswear, made in small batches',

  // Public site address, no trailing slash. Used for SEO tags,
  // sitemap URLs and social share previews.
  siteUrl:  'https://dhruvparekh.in/saloni',

  // ── CONTACT ────────────────────────────────────────────────
  // FILL THESE IN before launch.
  phone:    '',                 // e.g. '+91 98765 43210'
  email:    '',                 // e.g. 'orders@salonicollection.com'

  // WhatsApp number in international format, digits only, no + or spaces.
  // Example: 919876543210  (91 = India, then the 10-digit number)
  whatsapp: '',                 // <- FILL THIS IN
  whatsappHours: 'Mon-Sat, 10am to 7pm',

  // Instagram handle without the @
  instagram: '',                // e.g. 'salonicollection'
  facebook:  '',                // page username

  // ── SHIPPING ───────────────────────────────────────────────
  shippingFlat:      99,        // flat courier charge in Rupees
  freeShippingAbove: 2999,      // free above this cart total (0 = never free)

  // Dispatch time in working days, used for delivery estimates.
  dispatchDays: 2,

  // ── PAYMENTS ───────────────────────────────────────────────
  codEnabled:  true,
  codExtraFee: 0,               // surcharge for choosing COD (0 = none)

  // Direct UPI: zero fees, no gateway, no GST registration needed.
  // Money moves straight from the customer's bank to yours.
  upiEnabled: true,
  upiId:      '',               // <- FILL THIS IN, e.g. 'saloni@okhdfcbank'
  upiName:    'Saloni Collection',

  // Razorpay stays off until a server exists to create orders and
  // verify signatures. See PAYMENTS.md.
  razorpayEnabled: false,
  razorpayKeyId:   '',

  // ── POLICY ─────────────────────────────────────────────────
  // Replacement only for damaged or incorrect items. No returns,
  // no refunds for change of mind or fit.
  returnsPolicy:   'defects-only',
  returnWindowDays: 3,          // days to report a damaged/wrong item
};

// ─── DELIVERY ESTIMATES ───────────────────────────────────────
// No courier API needed. Pincode prefixes decide the zone, and each
// zone carries a transit range in working days.
const DELIVERY_ZONES = {
  metro:    { label: 'Metro',        days: [2, 4] },
  tier2:    { label: 'Tier-2 city',  days: [3, 6] },
  rest:     { label: 'Rest of India', days: [5, 9] },
  remote:   { label: 'Remote area',  days: [7, 12] },
};

// First 3 digits of the pincode -> zone.
const PIN_ZONES = {
  metro:  ['110','111','112','122','201','400','401','402','560','561','600','601','700','711','500','501','380','382','411','412'],
  remote: ['190','191','192','193','194','195','196','737','790','791','792','793','794','795','796','797','798','799','744','682'],
  tier2:  ['302','303','440','441','452','453','462','641','682','695','751','800','801','226','208','395','390','360','361','482','492','834','781','160','143','141','248','249'],
};
