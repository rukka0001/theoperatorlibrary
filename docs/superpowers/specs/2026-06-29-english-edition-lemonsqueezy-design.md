# English Edition + Lemon Squeezy — Design

**Date:** 2026-06-29
**Status:** Approved (pending spec review)

## Goal

Launch the English edition of *El Trader Que Perdía Ganando* — titled
**"Day Trading from Inside the Problem"** — at `/en/day-trading-from-inside-the-problem`,
reusing the existing delivery loop (signed download token → Vercel Blob → Resend
email) but replacing the Flow (CLP) payment gateway with **Lemon Squeezy** (USD).

**Title:** Day Trading from Inside the Problem
**Subtitle:** How you can win most of your trades and still lose money — and how to
start building a system that protects your account.

The live Spanish/Flow flow is not modified in behavior. Lemon Squeezy is approved,
so development runs in **test mode** and goes live via an env swap (no code change).

## Decisions

| Decision | Value |
|---|---|
| English slug / URL | `day-trading-from-inside-the-problem` → `/en/...` |
| Pricing | **$18.99 launch / $38.99 regular** (USD); must match the LS variant price |
| Payment provider | Lemon Squeezy (test mode in dev, live via env) |
| Checkout method | API-created checkout (mirrors the Flow server→redirect pattern) |
| Product config | Generalized: `provider` + `currency` + `price`/`regularPrice` + `formatPrice()` |
| Content | Translate the existing Spanish landing copy to English |
| Deliverable files | Provided in English; staged in `blob-uploads/.../en/` |

## Reused as-is (payment- and language-agnostic)

- `src/lib/download-token.ts` — signed, expiring download tokens.
- `src/pages/api/download.ts` — signed Blob streamer.
- Vercel Blob storage + `scripts/upload-files.ts` (reads file list from products.ts).

## New / changed files

| Concern | File | New/Changed |
|---|---|---|
| Page | `src/pages/en/day-trading-from-inside-the-problem.astro` | new |
| Copy | `src/content/books/day-trading-from-inside-the-problem/{index,copy,sections,faq}.ts` | new (translated) |
| Thank-you | `src/pages/thank-you.astro` | new (English `/gracias`, Meta Pixel Purchase in USD) |
| Error | `src/pages/payment-error.astro` | new (English `/error-pago`) |
| LS client | `src/lib/lemonsqueezy.ts` | new |
| Checkout | `src/pages/api/checkout/lemonsqueezy.ts` | new |
| Webhook | `src/pages/api/webhooks/lemonsqueezy.ts` | new |
| Product model | `src/config/products.ts` | changed (generalize) |
| Email | `src/lib/email.ts` | changed (es/en copy bundles) |
| Buy form | `src/components/book-page/BuyForm.astro` | changed (provider-driven action, i18n labels) |
| Book page | `src/components/book-page/BookPage.astro` | changed (pass provider; use formatPrice) |
| Layout | `src/layouts/BaseLayout.astro` | changed (lang per page) |
| Blob staging | `blob-uploads/books/day-trading-from-inside-the-problem/en/` | created (4 files dropped here) |
| Env example | `.env.example` | changed (LS vars) |

## Product config (generalization)

`Product` gains:
- `provider: 'flow' | 'lemonsqueezy'`
- `currency: string` (`'CLP'` | `'USD'`)
- `price: number`, `regularPrice?: number` (rename from `priceCLP`/`regularPriceCLP`)
- `lemonSqueezy?: { variantId: string }` (non-secret variant id from the LS store)

`formatCLP(amount)` → `formatPrice(amount, currency)`:
- CLP → `es-CL`, 0 decimals (e.g. `$14.990`)
- USD → `en-US`, 2 decimals (e.g. `$18.99`)

For **Flow**, `price` is the charged CLP integer (unchanged behavior).
For **Lemon Squeezy**, the LS **variant price is authoritative** (LS charges it);
`price`/`regularPrice` are display-only and must match the variant ($18.99 / $38.99).

English product entry (USD, provider `lemonsqueezy`, files under
`books/day-trading-from-inside-the-problem/en/`): `day-trading-from-inside-the-problem.pdf`,
`.epub`, `.azw3`, `reference-sheets.pdf`.

## Lemon Squeezy data flow

```
BuyForm (email) --POST--> /api/checkout/lemonsqueezy
  validate slug+email; create LS checkout via API:
    store_id, variant_id, checkout_data.email, checkout_data.custom={ slug },
    product_options.redirect_url = <site>/thank-you
  --303--> LS hosted checkout page
       |
       v  buyer pays (test card 4242... in test mode)
LS --signed webhook (event order_created)--> /api/webhooks/lemonsqueezy
  read RAW body; verify X-Signature = HMAC-SHA256(rawBody, LEMONSQUEEZY_WEBHOOK_SECRET)
  event == order_created && data.attributes.status == 'paid'
  slug  = meta.custom_data.slug
  email = data.attributes.user_email
  order = data.id (idempotency key)
  -> mint download token -> sendDownloadEmail(en) -> sendOrderNotificationEmail
       |
       v  buyer browser
LS redirect (GET) --> /thank-you  (fires Meta Pixel Purchase, USD)
```

### Why simpler than Flow
- The webhook is **HMAC-signed and authoritative** → no `getStatus` round-trip
  (Flow required one because its callback body was untrusted).
- LS redirects the browser with a **GET**, so the checkout `redirect_url` points
  straight at the static `/thank-you`. No `/api/return/*` POST-absorber needed
  (Flow needed one to avoid a 405 on the static page).

### Webhook verification details
- Must verify against the **raw request body** (re-serializing JSON breaks the HMAC).
  Read `await request.text()`, compute HMAC, `crypto.timingSafeEqual` vs `X-Signature`.
- Event name from header `X-Event-Name` (or `meta.event_name`).
- Reject (401) on signature mismatch; 400 on missing signature/body.
- Ignore non-`paid` / non-`order_created` with 200 (acknowledge, don't retry).

### Idempotency
Same per-process `Set` guard as Flow, keyed by LS order id (`data.id`). Claim
before send; release on send failure and return 500 so LS retries. The existing
`TODO(durable-idempotency)` (cross-instance claim in KV/DB) carries over verbatim.

## Email i18n (`lib/email.ts`)

Currently hardcoded Spanish (subjects, headings, disclaimer, `lang="es"`). Extract
strings into `es` / `en` copy bundles keyed by `product.language`; the HTML/text
template **structure stays shared**. English bundle covers:
- Download email: subject, greeting, "your files" label, expiry line, support line,
  educational disclaimer, `lang="en"`.
- Internal sale notification: English labels (follows product language).

## Form / page i18n

- `BuyForm`: `action` derived from `product.provider` → `/api/checkout/${provider}`;
  `placeholder` and `ctaLabel` come from content (no Spanish hardcodes).
- `BookPage`: pass `provider` to `BuyForm`; use `formatPrice(price, currency)`.
- `BaseLayout`: `lang` attribute set per page (`en` for the English route).

## Content translation

New `src/content/books/day-trading-from-inside-the-problem/` mirroring the
Spanish structure (`index.ts`, `copy.ts`, `sections.ts`, `faq.ts`) — full English
translation of hero, included items, why, problem (stats/bars), bonuses, audience,
coverage, preview, FAQ, finalCta, stickyLabel. Authored for review.

## Environment variables

| Var | Purpose |
|---|---|
| `LEMONSQUEEZY_API_KEY` | Create checkouts (test-mode key in dev, live key in prod) |
| `LEMONSQUEEZY_STORE_ID` | Target store for checkout creation |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Verify webhook `X-Signature` |

Variant id lives in product config (non-secret). Test→live cutover = swap these
env values (+ live variant id if it differs). No code change.

### Provisioning status (test mode)
- ✅ `LEMONSQUEEZY_API_KEY` — test-mode key saved to `.env`, authenticates (HTTP 200).
- ✅ `LEMONSQUEEZY_STORE_ID = 421048` — store "The Operator Library", currency USD.
- ⛔ **Variant ID** — store has 0 products. Chris must create the product
  "Day Trading from Inside the Problem" with a **$18.99** variant (compare-at
  $38.99) in the LS dashboard, then we read its variant id. (LS API cannot
  create products.)
- ⛔ `LEMONSQUEEZY_WEBHOOK_SECRET` — Chris must add a webhook (event
  `order_created`) in the LS dashboard pointing at `/api/webhooks/lemonsqueezy`;
  LS returns the signing secret to paste into `.env`.

## Out of scope (YAGNI)

- Durable cross-instance idempotency (keep per-process guard + existing TODO).
- Multi-currency / language switching on a single page.
- Any behavior change to the live Spanish/Flow flow (only mechanical refactors
  from the config generalization, with no functional change).

## Test plan

1. `npm run upload-files -- --dry-run` finds all 4 English files; then upload.
2. LS **test mode**: complete a checkout with test card `4242 4242 4242 4242`.
3. Verify webhook signature passes, `order_created`/`paid` handled, English
   download email delivered with working signed links, internal notification sent.
4. Verify duplicate webhook delivery does not double-send (idempotency).
5. Verify browser lands on `/thank-you` (Purchase event, USD); bad email/slug → `/payment-error`.
6. Confirm the Spanish/Flow flow still works unchanged.
