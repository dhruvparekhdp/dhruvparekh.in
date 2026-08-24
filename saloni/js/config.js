// ─── SUPABASE CONFIG ──────────────────────────────────────────
// From: supabase.com → Project Settings → API
const SUPABASE_URL      = 'https://kvrmqsrfuuuhsvljjlxv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2cm1xc3JmdXV1aHN2bGpqbHh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwODIxNTYsImV4cCI6MjA5NjY1ODE1Nn0.uxV-wuHIcxOqNuAqzBCaHE9Etm_rMBZ5fQ8GkR3cWV4';

// Supabase Storage bucket for product images
const STORAGE_BUCKET = 'product-images';

// ─── SHOP SETTINGS ────────────────────────────────────────────
const SHOP = {
  name:      'Saloni Collection',
  phone:     '',                    // shown on order confirmation, e.g. '+91 98765 43210'
  email:     '',                    // e.g. 'orders@salonicollection.com'

  // Shipping
  shippingFlat:     99,             // flat shipping charge in Rupees
  freeShippingAbove: 2999,          // free shipping above this cart total (0 = never free)

  // Cash on Delivery
  codEnabled: true,
  codExtraFee: 0,                   // extra charge for choosing COD (0 = none)

  // ─── DIRECT UPI (zero transaction fees) ─────────────────────
  // Your own UPI ID. Money lands straight in your bank account.
  // No gateway, no commission, no GST/TIN needed.
  upiEnabled: true,
  upiId:      '',                   // e.g. 'saloni@okhdfcbank'  ← FILL THIS IN
  upiName:    'Saloni Collection',  // name shown inside the customer's UPI app

  // ─── RAZORPAY (stub — switch on later) ──────────────────────
  // Set razorpayEnabled=true and paste your key to activate.
  razorpayEnabled: false,
  razorpayKeyId:   '',              // e.g. 'rzp_live_xxxxxxxxxx'
};
