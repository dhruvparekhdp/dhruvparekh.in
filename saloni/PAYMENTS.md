# Payments — Saloni Collection

Written for a **home-based seller with no GST/TIN registration**, wanting the
lowest possible fees and the least paperwork.

---

## What's live right now

| Method | Fee to you | KYC needed | Status |
|---|---|---|---|
| **Cash on Delivery** | ₹0 | None | ✅ Working |
| **Direct UPI (QR + intent link)** | **₹0** | Just your own bank account | ✅ Working — add `upiId` to `js/config.js` |
| Razorpay | ~2% | PAN + bank + basic KYC | 🔌 Stubbed, needs a backend |

### Turn on UPI

Open `saloni/js/config.js` and set your UPI ID:

```js
upiEnabled: true,
upiId:      'yourname@okhdfcbank',   // ← your real UPI ID
upiName:    'Saloni Collection',
```

That's the whole setup. At checkout the customer sees a QR code and an
"Open UPI App" button; the money goes straight from their bank to yours with
**no middleman and no commission**.

---

## Why direct UPI first

For your situation this genuinely beats every gateway:

- **Zero fees.** A gateway takes ~2%. On ₹1,00,000 of monthly sales that's
  ₹2,000/month you keep instead of paying away.
- **No registration.** No GST, no TIN, no company. A personal UPI ID on a
  savings or current account is enough.
- **Instant settlement.** Money is in your account in seconds. Gateways hold
  funds for T+2 or T+3 days.
- **Everyone already has it.** UPI is how most people in India pay online now.

**The one tradeoff:** payment isn't verified automatically. The customer pastes
their UPI reference number, and you confirm it against your bank app before
dispatch. The admin panel has a **Mark as Paid** button for exactly this.
At low order volume this takes seconds per order. Once you're doing 30–50+
orders a day, that manual check becomes the reason to move to a gateway.

---

## When you outgrow it — gateway comparison

| | Razorpay | Cashfree | PhonePe PG | Instamojo |
|---|---|---|---|---|
| **Fee (UPI)** | 0% * | 0% * | 0% * | ~2% |
| **Fee (cards)** | ~2% | ~1.90% | ~2% | ~2% + ₹3 |
| **GST required?** | No † | No † | Usually yes | No |
| **Individual sellers** | ✅ Yes | ✅ Yes | ⚠️ Harder | ✅ Easiest |
| **Docs needed** | PAN, bank, address proof | PAN, bank, address proof | Business proof | PAN, bank |
| **Onboarding** | Same day | 1–2 days | 2–5 days | Same day |
| **Settlement** | T+2 | T+1 (T+0 paid) | T+1 | T+3 |
| **Needs a backend?** | Yes | Yes | Yes | **No** ‡ |

\* Most gateways pass UPI through at 0% because NPCI caps merchant UPI fees at
zero for small merchants. Card/netbanking is where they charge.

† Neither Razorpay nor Cashfree require GST for an unregistered individual or
sole proprietor below the turnover threshold. You'll be onboarded under
"Individual" / "Proprietorship" with PAN + bank account.

‡ Instamojo Payment Links work without writing any server code — you generate
a link and send it. Most expensive per transaction, but zero engineering.

### Recommendation

1. **Now → direct UPI + COD.** Costs nothing, works today, no paperwork.
2. **When manual verification gets annoying → Razorpay.** Best documentation,
   fastest onboarding for individuals, and UPI still passes through at 0%.
   You only pay ~2% on the card/netbanking orders.
3. **If you want zero engineering → Instamojo Payment Links.** Higher fees, but
   you can run it entirely from their dashboard.

**Avoid Stripe** — India onboarding is strict, domestic-only sellers are poorly
supported, and it's built for international card volume you don't have.

---

## Wiring up Razorpay later

The stub lives in `saloni/js/checkout.js` → `startRazorpay()`.

Razorpay can't be done safely from the browser alone: creating an order and
verifying the payment signature both need your **secret key**, which must never
ship to the client. You need one small server endpoint. Netlify Functions is
free and enough.

**1.** Create `netlify/functions/razorpay-order.js`:

```js
export async function handler(event) {
  const { amount, receipt } = JSON.parse(event.body);
  const auth = Buffer
    .from(`${process.env.RZP_KEY_ID}:${process.env.RZP_KEY_SECRET}`)
    .toString('base64');

  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method:  'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ amount: Math.round(amount * 100), currency: 'INR', receipt }),
  });

  return { statusCode: 200, body: JSON.stringify(await res.json()) };
}
```

**2.** Add `RZP_KEY_ID` and `RZP_KEY_SECRET` in Netlify → Site settings →
Environment variables. **Never** put the secret in `config.js`.

**3.** In `config.js` set `razorpayEnabled: true` and paste your **public**
key id into `razorpayKeyId`.

**4.** Replace the body of `startRazorpay()` with a call to that function,
then open Razorpay's checkout with the returned `order_id`. Add a second
function to verify the signature before marking the order paid.

Until all four steps are done, leave `razorpayEnabled: false` — the option
simply won't appear at checkout.

---

## Shipping & COD settings

Also in `js/config.js`:

```js
shippingFlat:      99,     // flat shipping charge
freeShippingAbove: 2999,   // free above this cart value (0 = never free)
codEnabled:        true,
codExtraFee:       0,      // surcharge for choosing COD
```

A note on COD: it's what most Indian shoppers expect, but return rates run
higher than prepaid, and you carry the courier cost on a refused delivery. A
common tactic is a small COD fee (₹40–₹50) that's waived for prepaid orders —
set `codExtraFee` if you want to nudge people toward UPI.
