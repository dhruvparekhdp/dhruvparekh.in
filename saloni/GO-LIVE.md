# Saloni Collection — Go-Live Playbook

Everything that has to happen before real customers and real money touch this site,
split into **what is already done** and **what only you can do**.

Target: live in 48 hours.

---

## Part 1 — Do this first (30 minutes, blocks everything else)

These four values are the difference between a demo and a shop that takes money.
All of them live in **`saloni/js/config.js`**.

```js
phone:    '+91 XXXXX XXXXX',      // shown on order confirmations
email:    'you@example.com',      // optional but builds trust
whatsapp: '91XXXXXXXXXX',         // 91 + your 10 digits, NO + and NO spaces
upiId:    'yourname@okhdfcbank',  // where the money lands
```

> **The WhatsApp format catches everyone out.** For +91 98765 43210 you write
> `919876543210`. No plus, no spaces, no dashes. Get this wrong and the button
> silently opens an empty chat.

Then run these three files in **Supabase → SQL Editor**, in this order:

| # | File | What it does |
|---|---|---|
| 1 | `supabase/schema.sql` | products table, image storage *(already run)* |
| 2 | `supabase/orders.sql` | orders table, security rules *(already run)* |
| 3 | `supabase/migration-002.sql` | **NEW** — fabric/care/size fields, stock control, courier tracking, order-lookup function, data validation |

Migration 002 is required. Without it the admin panel will error when you save a
product, and order tracking will not work.

---

## Part 2 — Your products (this is the real work)

**Nothing else on this list matters if the photos are bad.** A boutique lives or
dies on its product images.

### Photography — do this yourself, today

You need a phone camera and a window. Not a studio.

- **Light**: stand 1–2 metres from a window, indirect daylight. Never use flash.
  Never shoot under yellow tube light — it makes every fabric look cheap.
- **Background**: one plain wall. White, cream or pale grey. Use the *same* wall
  for every product — consistency is what makes a grid look professional.
- **Per product, shoot 3**:
  1. Full garment, laid flat or on a hanger, straight-on
  2. Close-up of the fabric weave or embroidery
  3. Worn, if you have someone to model it — this converts best by far
- **Orientation**: portrait, and crop to **3:4**. The site is built for that ratio;
  anything else gets cropped and you lose the top or bottom of the garment.
- **Edit**: brightness up slightly, nothing else. Do not use filters. The colour
  in the photo must match the real fabric or you will get returns you have said
  you do not accept — and an angry customer.

### Launch with 8–12 products, not 3

Fewer than 8 and the grid looks empty and the shop looks abandoned. More than 15
and you will not manage the photography in time. **8–12 is the sweet spot.**

For each one, fill in from the admin panel:

- [ ] Name, category, price
- [ ] Description — 2 or 3 sentences on how it feels and when to wear it
- [ ] **Fabric** — "Pure cotton mul", "Chanderi silk blend"
- [ ] **Wash care** — "Hand wash cold, dry in shade"
- [ ] **Measurements** for every size, in inches, measured flat
- [ ] Sizes and colours
- [ ] Fit note — "Relaxed fit. Model is 5'6" and wears S"

> **Measurements cut returns more than anything else on this page.** You have a
> no-returns policy, which means a customer who orders the wrong size is a
> customer you lose permanently and who may post about it. Exact measurements are
> your protection, not a nice-to-have.

---

## Part 3 — Google (45 minutes, then wait)

### Search Console — do this the moment you are live

1. Go to **search.google.com/search-console**
2. Add property → **URL prefix** → `https://dhruvparekh.in/saloni/`
3. Verify — easiest is the HTML tag method: Google gives you a `<meta>` tag,
   paste it into `saloni/index.html` just below the `<title>` line, redeploy, click verify
4. **Sitemaps** → submit `sitemap.xml`
5. **URL Inspection** → paste your homepage → **Request Indexing**

Google typically takes **3–14 days** to index a brand-new site. Requesting
indexing speeds it up but does not skip the queue. Do not panic on day 3.

### Google Business Profile — worth an hour, most people skip it

Even as a home business you can list on **business.google.com**:
- Choose **"I deliver goods to customers"** and hide your street address
- Set your service area (your city, or all-India)
- Add photos, hours, and your WhatsApp number
- This is what makes you show up in *"boutique near me"* and on Google Maps

### What is already handled in code

- ✅ Page titles, meta descriptions, canonical URLs
- ✅ `sitemap.xml` and `robots.txt` (admin and checkout excluded from search)
- ✅ **Product structured data** — makes your pieces eligible for Google's free
  shopping and image results, no ad spend
- ✅ Organization schema with your contact details
- ✅ Mobile-friendly and fast — both are ranking factors

---

## Part 4 — Instagram & Facebook

### Setup

- [ ] Convert Instagram to a **Business account** (Settings → Account type).
      Personal accounts get no insights and cannot run ads or shops.
- [ ] Create a **Facebook Page** and link it to Instagram. You need the Page even
      if you never post there — Instagram Shopping requires it.
- [ ] **Link in bio** → `https://dhruvparekh.in/saloni/`
- [ ] Bio formula that works: *what you sell · who it is for · where you ship*
      > Handcrafted kurtas & sarees ✦ Small-batch, made by hand
      > Ships across India ✦ COD available
      > Shop ↓
- [ ] **WhatsApp Business app** (not regular WhatsApp) — free, and gives you a
      catalogue, away messages, quick replies and labels to track orders.
      Set a greeting message and your hours.

### Meta Shops — free product tagging

Once the Page exists: **Commerce Manager → Create a shop → Upload products manually**.
This lets you tag products directly in posts and stories, so someone can tap a
kurta in a photo and land on that product. Free. Takes about an hour for 10 products.

> Your product feed already carries the right structured data, so if you later want
> an automated catalogue feed instead of manual upload, the data is there.

### Your sharing preview is already built

Paste your link anywhere — WhatsApp, Instagram DM, Facebook — and it renders a
proper branded card, not naked text. That image is `saloni/og-cover.png`.
Change it any time; keep it 1200×630.

### First-week content plan

| Day | Post | Why |
|---|---|---|
| 1 | Carousel: 3 best pieces + "We're live" | Announcement, tag the link |
| 1 | Story: behind the scenes packing a parcel | Proves a real person exists |
| 2 | Reel: fabric close-up, slow pan, trending audio | Reels reach non-followers; this is your only free reach engine |
| 3 | Single piece + full measurements in the caption | Answers the top objection publicly |
| 4 | Story poll: "Which colour next?" | Engagement, and genuine product research |
| 5 | Customer's first order, packed, with a thank-you note | Social proof beats any ad |
| 6 | Reel: styling one kurta 3 ways | Saves and shares |
| 7 | Story: "Ask me anything about sizing" | Drives DMs, which drive orders |

**Post Reels, not photos.** Instagram's reach for static images from small accounts
is close to zero in 2026. A Reel with fabric close-ups and trending audio is the
single highest-leverage thing you can do for free.

### Where your first 20 customers actually come from

Not from strangers. From:
1. Your own WhatsApp contacts — send the link to 30 people personally, one by one
2. Family and friends' status updates
3. Local Facebook groups for your city (read the rules before posting)
4. Instagram: reply to every comment and DM within an hour for the first week

---

## Part 5 — Before you take the first real order

Test it yourself, on your phone, on mobile data with WiFi off:

- [ ] Open the site, browse, open a product
- [ ] Check a pincode — is the delivery estimate sensible for your courier?
- [ ] Add to bag, go to checkout
- [ ] Place a **real COD order** to your own address
- [ ] Does it appear in the admin panel?
- [ ] Tap **Confirm order** — does WhatsApp open with the message filled in?
- [ ] Add a courier and tracking number, tap **Save & mark dispatched**
- [ ] Open `track.html`, enter that order number and phone — does it show?
- [ ] Place a second order and pay yourself ₹1 by UPI — did the money arrive?
- [ ] Delete both test orders from Supabase before launch

### Operations you need to decide

- [ ] **Courier** — Delhivery, DTDC, Blue Dart, or Shiprocket (which aggregates
      several and is usually cheapest for low volume). Set up an account and
      learn what a parcel costs before you promise ₹99 shipping.
- [ ] **Packaging** — poly mailers, tissue, a stamp or sticker. Order 100.
- [ ] **COD reality** — expect 20–30% of COD orders to be refused at the door in
      India. You pay courier both ways on those. If it gets bad, either add a COD
      fee (`codExtraFee` in config) or call to confirm before dispatching.
- [ ] **A separate bank account** for the business. Do it now, before the money
      mixes with personal spending and bookkeeping becomes impossible.

---

## Part 6 — Legal, briefly and honestly

I am not a lawyer and this is not legal advice, but these are the things small
Indian online sellers most often get wrong:

- **GST**: not required below the turnover threshold for intra-state sales, but
  the rules for selling *across* states and through marketplaces are stricter.
  Worth 30 minutes with a CA before you scale. Selling from your own website at
  low volume is the simplest case.
- **Consumer Protection (E-Commerce) Rules 2020**: you must clearly display your
  return/refund policy, contact details and a grievance contact. ✅ Already built
  into `policies.html` — but **your phone and email must be filled in** for it to
  actually comply.
- **Your no-returns policy is disclosed prominently**, which is what the rules
  require. Note that a "no returns even if defective" policy would *not* be
  enforceable — which is why the policy explicitly covers damaged and wrong items.

---

## Part 7 — 48-hour schedule

### Day 1
- **Morning** — fill in config.js (phone, WhatsApp, UPI). Run migration-002.sql.
- **Midday** — photograph 8–12 products. This is the long pole; start early.
- **Afternoon** — add every product in the admin panel, with measurements.
- **Evening** — place a test order end-to-end on your phone. Fix anything odd.

### Day 2
- **Morning** — Search Console: verify, submit sitemap, request indexing.
- **Midday** — Instagram Business + Facebook Page + WhatsApp Business. Link in bio.
- **Afternoon** — shoot and post the launch Reel. Send the link personally to 30 people.
- **Evening** — you are live. Answer every DM within the hour.

### Week 1
- Post daily, mostly Reels
- Reply to everything, fast
- Ask your first three customers for a photo — that is your best content
- Check Search Console on day 7 to confirm indexing has started

---

## What is already done for you

| | |
|---|---|
| Storefront | Bento layout, product drawer, size guide, cart, sold-out states |
| Checkout | Validated form, COD, UPI with QR, delivery estimate, confirmation |
| Order tracking | Customer lookup by order number + phone |
| Admin | Orders, dispatch tracking, WhatsApp templates, full product CRUD |
| WhatsApp | Floating button, per-product enquiry, order support, admin templates |
| SEO | Meta tags, structured data, sitemap, robots, social share card |
| Policies | Shipping, returns, cancellations, privacy, grievance contact |
| Security | Row-level security, input validation, escaped output, admin auth |

**Your side of the line: photos, product data, four config values, and Instagram.**
