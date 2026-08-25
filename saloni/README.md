# Saloni Collection

Handcrafted womenswear storefront with a product/order admin panel.
Plain HTML, CSS and JavaScript — no build step. Backed by Supabase.

```
saloni/
├── index.html          storefront (bento layout)
├── checkout.html       address + payment + confirmation
├── admin.html          orders and product management
├── css/
│   ├── style.css       design tokens, bento grid, drawers, 3D motion
│   ├── checkout.css    checkout-only styles
│   └── admin.css       admin-only styles
├── js/
│   ├── config.js       ← your keys and shop settings live here
│   ├── store.js        data layer (Supabase + localStorage fallback)
│   ├── cart.js         cart state, money formatting, toasts
│   ├── app.js          storefront rendering, drawers, motion
│   ├── checkout.js     validation, COD/UPI, order creation
│   └── admin.js        auth, orders, product CRUD
├── supabase/
│   ├── schema.sql      products table + storage bucket
│   ├── seed.sql        10 demo products
│   └── orders.sql      orders table + RLS
└── PAYMENTS.md         gateway comparison and Razorpay wiring
```

## Setup

**1 — Database.** In Supabase → SQL Editor, run in order:

```
supabase/schema.sql     products table, storage bucket, policies
supabase/orders.sql     orders table, policies
supabase/seed.sql       optional: 10 demo products
```

**2 — Keys.** Supabase → Project Settings → API. Paste into `js/config.js`:

```js
const SUPABASE_URL      = 'https://xxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGci...';
```

**3 — Admin user.** Supabase → Authentication → Users → Add user.
That email and password is your login for `/saloni/admin.html`.

**4 — Payments.** In `js/config.js` set your UPI ID to accept payment at
zero cost:

```js
upiId: 'yourname@okhdfcbank',
```

Cash on Delivery works without any configuration. See `PAYMENTS.md` for the
gateway comparison and how to add Razorpay later.

## Demo mode

With no Supabase keys the site runs entirely on `localStorage` with six demo
products, so the whole flow is testable offline. A banner marks it clearly.

If keys *are* present but the backend can't be reached, the site does **not**
fall back to demo data — it shows a connection error instead, so a customer can
never order a product that doesn't exist.

## Local development

```bash
python3 -m http.server 8000
# → http://localhost:8000/saloni/
```

## Notes

- All motion respects `prefers-reduced-motion`.
- Product images upload to Supabase Storage; deleting a product removes its image.
- Orders are insert-only for the public; reading and updating requires admin auth.
- UPI payments are verified by hand — use **Mark as Paid** in the admin panel.
