# English Edition + Lemon Squeezy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the English edition "Day Trading from Inside the Problem" at `/en/day-trading-from-inside-the-problem`, sold in USD through Lemon Squeezy, reusing the existing signed-download + Resend delivery loop.

**Architecture:** The Spanish/Flow flow is untouched in behavior. The `Product` model is generalized with a `provider` + `currency` so one book uses Flow/CLP and the other Lemon Squeezy/USD. A parallel Lemon Squeezy client + checkout + webhook mirror the Flow endpoints; the webhook is HMAC-signed and authoritative (no `getStatus` round-trip). Email, BookPage, BuyForm, and BaseLayout are parametrized by language.

**Tech Stack:** Astro 7 (SSR endpoints via `@astrojs/vercel`), TypeScript, Tailwind 4, Vercel Blob, Resend, `jose` (download tokens), Vitest (new, for pure-logic unit tests), Node `crypto`.

## Global Constraints

- English slug / route: `day-trading-from-inside-the-problem` → `/en/day-trading-from-inside-the-problem` (verbatim).
- Title: `Day Trading from Inside the Problem`.
- Subtitle: `How you can win most of your trades and still lose money — and how to start building a system that protects your account.`
- Pricing: display `$18.99` launch / `$38.99` regular (USD). The **charge** is the Lemon Squeezy variant price; display must match.
- Lemon Squeezy identifiers: store id `421048`, variant id `1853026`. Env: `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_WEBHOOK_SECRET` (all already in `.env`).
- Webhook signature: `X-Signature` = HMAC-SHA256(rawBody, `LEMONSQUEEZY_WEBHOOK_SECRET`), hex; compare with `crypto.timingSafeEqual`. Verify against the **raw** request body.
- LS API: base `https://api.lemonsqueezy.com/v1`; headers `Accept` + `Content-Type: application/vnd.api+json`, `Authorization: Bearer <key>`.
- Do not change the live Spanish/Flow flow's behavior. Mechanical refactors only (renamed fields) where shared code is touched.
- Commit after every task. Run `npm run build` before each commit that touches `.astro`/config/lib; it must succeed.

---

## File Structure

**New:**
- `src/lib/lemonsqueezy.ts` — LS client: `buildCheckoutPayload`, `createCheckout`, `verifyWebhookSignature`, `parseOrderCreated`.
- `src/lib/lemonsqueezy.test.ts` — unit tests for the pure functions above.
- `src/config/products.test.ts` — unit test for `formatPrice`.
- `src/pages/api/checkout/lemonsqueezy.ts` — POST checkout handler.
- `src/pages/api/webhooks/lemonsqueezy.ts` — POST webhook handler.
- `src/pages/en/day-trading-from-inside-the-problem.astro` — English page wrapper.
- `src/content/books/day-trading-from-inside-the-problem/{copy,sections,faq,index}.ts` — translated content.
- `src/pages/thank-you.astro` — English thank-you (Meta Pixel Purchase, USD).
- `src/pages/payment-error.astro` — English payment error.

**Modified:**
- `src/config/products.ts` — generalize `Product`; `formatCLP`→`formatPrice`; add English product.
- `src/content/books/types.ts` — add `ui` block to `BookContent`.
- `src/components/book-page/BookPage.astro` — use `formatPrice`/`price`/`regularPrice`/`provider`; UI labels from `content.ui`; pass `lang`.
- `src/components/book-page/BuyForm.astro` — action from `provider`; `placeholder` prop.
- `src/layouts/BaseLayout.astro` — `lang` prop + per-language chrome.
- `src/pages/gracias.astro` — `priceCLP`→`price`.
- `src/content/books/el-trader-que-perdia-ganando/copy.ts` — add `ui` (Spanish).
- `src/content/books/el-trader-que-perdia-ganando/index.ts` — include `ui`.
- `package.json` — Vitest devDep + `test` script.
- `.env.example` — document LS vars.

---

## Task 1: Verify the live Lemon Squeezy contract (spike, no app code)

De-risk the lib by confirming the real request/response shapes against the test store before coding. No code committed except a findings note appended to the spec.

**Files:**
- Modify: `docs/superpowers/specs/2026-06-29-english-edition-lemonsqueezy-design.md` (append a "Verified contract" note)

- [ ] **Step 1: Create a real test checkout and inspect the response URL**

```bash
cd /Users/chrisruzicka/theoperatorlibrary
KEY=$(grep '^LEMONSQUEEZY_API_KEY=' .env | cut -d= -f2-)
curl -s -X POST https://api.lemonsqueezy.com/v1/checkouts \
  -H "Accept: application/vnd.api+json" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Authorization: Bearer $KEY" \
  -d '{
    "data": {
      "type": "checkouts",
      "attributes": {
        "checkout_data": { "email": "buyer@example.com", "custom": { "slug": "day-trading-from-inside-the-problem" } },
        "product_options": { "redirect_url": "https://theoperatorlibrary.com/thank-you" }
      },
      "relationships": {
        "store":   { "data": { "type": "stores",   "id": "421048" } },
        "variant": { "data": { "type": "variants", "id": "1853026" } }
      }
    }
  }' | python3 -m json.tool | head -40
```

Expected: a `data.attributes.url` field containing a `...lemonsqueezy.com/checkout/...` URL. Confirm the path to the URL is exactly `data.attributes.url`.

- [ ] **Step 2: Confirm the order_created field names**

Open the checkout `url` from Step 1 in a browser, pay with test card `4242 4242 4242 4242` (any future expiry/CVC), then read the resulting order back:

```bash
KEY=$(grep '^LEMONSQUEEZY_API_KEY=' .env | cut -d= -f2-)
curl -s -H "Accept: application/vnd.api+json" -H "Authorization: Bearer $KEY" \
  "https://api.lemonsqueezy.com/v1/orders?filter[store_id]=421048&page[size]=1&sort=-created_at" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); a=d['data'][0]['attributes']; print('id:', d['data'][0]['id']); [print(k,'=',a.get(k)) for k in ('user_email','status','total','currency','identifier','test_mode')]"
```

Expected: `status = paid`, `user_email` present, `total` in cents, `currency = USD`. Confirm these attribute names exist. (The webhook payload mirrors `data.attributes.*` plus `meta.custom_data` and `meta.event_name`.)

- [ ] **Step 3: Record findings**

Append a short "Verified contract (YYYY-MM-DD)" note to the spec listing: checkout URL path (`data.attributes.url`), and the order attribute names confirmed (`user_email`, `status`, `total`, `currency`). If any name differs from this plan, note the difference — later tasks must use the verified names.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-06-29-english-edition-lemonsqueezy-design.md
git commit -m "docs: verify Lemon Squeezy checkout + order contract against test store"
```

---

## Task 2: Generalize the product model + add Vitest + English product

Rename CLP-specific fields to provider-neutral ones, add `formatPrice`, add the English product, and update every consumer (`BookPage`, `gracias`) so the build stays green.

**Files:**
- Modify: `src/config/products.ts`
- Modify: `src/components/book-page/BookPage.astro` (price fields only — UI labels come in Task 7)
- Modify: `src/pages/gracias.astro`
- Create: `src/config/products.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `interface Product { slug; title; subtitle; author; language: 'es'|'en'; provider: 'flow'|'lemonsqueezy'; currency: string; price: number; regularPrice?: number; coverImage: string; files: DownloadFile[]; lemonSqueezy?: { variantId: string } }`
- Produces: `formatPrice(amount: number, currency: string): string`
- Produces: `getProduct(slug)`, `listProducts()` unchanged signatures.

- [ ] **Step 1: Add Vitest to the project**

```bash
cd /Users/chrisruzicka/theoperatorlibrary
npm install -D vitest@^3
```

Then add the script to `package.json` (`scripts` block):

```json
    "preview": "astro preview",
    "astro": "astro",
    "test": "vitest run",
    "upload-files": "node --env-file-if-exists=.env scripts/upload-files.ts"
```

- [ ] **Step 2: Write the failing test for `formatPrice`**

Create `src/config/products.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatPrice } from './products';

describe('formatPrice', () => {
  it('formats CLP with no decimals', () => {
    expect(formatPrice(14990, 'CLP')).toBe('$14.990');
  });

  it('formats USD with two decimals', () => {
    expect(formatPrice(18.99, 'USD')).toBe('$18.99');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `formatPrice` is not exported from `./products`.

- [ ] **Step 4: Generalize `src/config/products.ts`**

Replace the `Product` interface, the Spanish entry, and `formatCLP` with the generalized versions, and append the English product. The full file:

```ts
/**
 * Product catalog for TheOperatorLibrary (commerce layer).
 *
 * No database — this file is the single source of truth for the books we sell:
 * identity, provider, pricing, cover, and deliverable files. Sales/marketing copy
 * lives separately in src/content/books/<slug>/.
 *
 * `blobKey` is the path of a deliverable inside Vercel Blob, never exposed to the
 * client; downloads go through a signed link served by /api/download.
 */

export interface DownloadFile {
  id: string;
  label: string;
  ctaLabel: string;
  fileName: string;
  blobKey: string;
  contentType: string;
}

export interface Product {
  /** URL slug under /<lang>/<slug> and the canonical product id. */
  slug: string;
  title: string;
  subtitle: string;
  author: string;
  /** ISO language code of the book and its landing page. */
  language: 'es' | 'en';
  /** Which payment gateway sells this product. */
  provider: 'flow' | 'lemonsqueezy';
  /** ISO currency code (e.g. 'CLP', 'USD'). */
  currency: string;
  /**
   * Launch price. For Flow this is the charged amount (CLP integer). For Lemon
   * Squeezy the LS variant price is authoritative; this is display-only and must
   * match the variant.
   */
  price: number;
  /** Regular/anchor price shown crossed out. Optional. */
  regularPrice?: number;
  coverImage: string;
  files: DownloadFile[];
  /** Lemon Squeezy specifics (present when provider === 'lemonsqueezy'). */
  lemonSqueezy?: { variantId: string };
}

const ES_BLOB_PREFIX = 'books/el-trader-que-perdia-ganando/es';
const EN_BLOB_PREFIX = 'books/day-trading-from-inside-the-problem/en';

export const products: Record<string, Product> = {
  'el-trader-que-perdia-ganando': {
    slug: 'el-trader-que-perdia-ganando',
    title: 'El Trader Que Perdía Ganando',
    subtitle:
      'Cómo puedes ganar la mayoría de tus trades y aun así perder dinero — y cómo empezar a construir un sistema que proteja tu cuenta.',
    author: 'Chris Ruzicka',
    language: 'es',
    provider: 'flow',
    currency: 'CLP',
    price: 14990,
    regularPrice: 29990,
    coverImage: '/images/books/el-trader-que-perdia-ganando/cover.png',
    files: [
      {
        id: 'pdf',
        label: 'Ebook principal (PDF)',
        ctaLabel: 'Descargar PDF',
        fileName: 'El-Trader-Que-Perdia-Ganando.pdf',
        blobKey: `${ES_BLOB_PREFIX}/el-trader-que-perdia-ganando.pdf`,
        contentType: 'application/pdf'
      },
      {
        id: 'epub',
        label: 'Versión EPUB',
        ctaLabel: 'Descargar EPUB',
        fileName: 'El-Trader-Que-Perdia-Ganando.epub',
        blobKey: `${ES_BLOB_PREFIX}/el-trader-que-perdia-ganando.epub`,
        contentType: 'application/epub+zip'
      },
      {
        id: 'azw3',
        label: 'Versión Kindle / AZW3',
        ctaLabel: 'Descargar Kindle / AZW3',
        fileName: 'El-Trader-Que-Perdia-Ganando.azw3',
        blobKey: `${ES_BLOB_PREFIX}/el-trader-que-perdia-ganando.azw3`,
        contentType: 'application/octet-stream'
      },
      {
        id: 'hojas',
        label: 'Hojas de referencia (4 incluidas)',
        ctaLabel: 'Descargar hojas de referencia',
        fileName: 'Hojas-de-Referencia.pdf',
        blobKey: `${ES_BLOB_PREFIX}/hojas-de-referencia.pdf`,
        contentType: 'application/pdf'
      }
    ]
  },
  'day-trading-from-inside-the-problem': {
    slug: 'day-trading-from-inside-the-problem',
    title: 'Day Trading from Inside the Problem',
    subtitle:
      'How you can win most of your trades and still lose money — and how to start building a system that protects your account.',
    author: 'Chris Ruzicka',
    language: 'en',
    provider: 'lemonsqueezy',
    currency: 'USD',
    price: 18.99,
    regularPrice: 38.99,
    coverImage: '/images/books/day-trading-from-inside-the-problem/cover.png',
    lemonSqueezy: { variantId: '1853026' },
    files: [
      {
        id: 'pdf',
        label: 'Main ebook (PDF)',
        ctaLabel: 'Download PDF',
        fileName: 'Day-Trading-From-Inside-The-Problem.pdf',
        blobKey: `${EN_BLOB_PREFIX}/day-trading-from-inside-the-problem.pdf`,
        contentType: 'application/pdf'
      },
      {
        id: 'epub',
        label: 'EPUB version',
        ctaLabel: 'Download EPUB',
        fileName: 'Day-Trading-From-Inside-The-Problem.epub',
        blobKey: `${EN_BLOB_PREFIX}/day-trading-from-inside-the-problem.epub`,
        contentType: 'application/epub+zip'
      },
      {
        id: 'azw3',
        label: 'Kindle / AZW3 version',
        ctaLabel: 'Download Kindle / AZW3',
        fileName: 'Day-Trading-From-Inside-The-Problem.azw3',
        blobKey: `${EN_BLOB_PREFIX}/day-trading-from-inside-the-problem.azw3`,
        contentType: 'application/octet-stream'
      },
      {
        id: 'sheets',
        label: 'Reference sheets (4 included)',
        ctaLabel: 'Download reference sheets',
        fileName: 'Reference-Sheets.pdf',
        blobKey: `${EN_BLOB_PREFIX}/reference-sheets.pdf`,
        contentType: 'application/pdf'
      }
    ]
  }
};

export function getProduct(slug: string): Product | undefined {
  return products[slug];
}

export function listProducts(): Product[] {
  return Object.values(products);
}

/** Format a price for display in its currency (e.g. "$14.990" CLP, "$18.99" USD). */
export function formatPrice(amount: number, currency: string): string {
  const locale = currency === 'CLP' ? 'es-CL' : 'en-US';
  const maximumFractionDigits = currency === 'CLP' ? 0 : 2;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits
  }).format(amount);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test`
Expected: PASS (both `formatPrice` cases).

- [ ] **Step 6: Update `src/components/book-page/BookPage.astro` price references**

Change the import and the price usages (UI label strings are handled in Task 7; only touch price/currency here):

In the frontmatter, line 5:
```ts
import { formatPrice, type Product } from '../../config/products';
```
Lines 15-17, replace the discount calc:
```ts
const discountPct = product.regularPrice
  ? Math.round((1 - product.price / product.regularPrice) * 100)
  : 0;
```
Replace every `formatCLP(product.regularPriceCLP)` with `formatPrice(product.regularPrice, product.currency)`, every `formatCLP(product.priceCLP)` with `formatPrice(product.price, product.currency)`, and every `product.regularPriceCLP &&` guard with `product.regularPrice &&`. (Occurrences: hero price block ~lines 74-83, final CTA ~lines 441-449, sticky bar ~lines 469-477.)

- [ ] **Step 7: Update `src/pages/gracias.astro`**

Line 9 — the Spanish thank-you reports the Flow product's price. Make it explicit to the Spanish product and use the renamed field:
```ts
import { getProduct } from '../config/products';

const product = getProduct('el-trader-que-perdia-ganando');
const purchaseValue = product?.price ?? 0;
const purchaseCurrency = product?.currency ?? 'CLP';
```
(Remove the old `listProducts` import/usage in this file.)

- [ ] **Step 8: Verify build + tests**

Run: `npm run build && npm test`
Expected: build succeeds; tests pass. (The Spanish page renders identically — same numbers, same formatting.)

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json src/config/products.ts src/config/products.test.ts src/components/book-page/BookPage.astro src/pages/gracias.astro
git commit -m "feat: generalize product model (provider+currency), add English product + formatPrice"
```

---

## Task 3: Lemon Squeezy client library

Pure functions for building the checkout request, verifying webhook signatures, and parsing `order_created`. Network call (`createCheckout`) wraps the pure `buildCheckoutPayload`.

**Files:**
- Create: `src/lib/lemonsqueezy.ts`
- Create: `src/lib/lemonsqueezy.test.ts`

**Interfaces:**
- Produces: `buildCheckoutPayload(input: { storeId: string; variantId: string; email: string; custom: Record<string,string>; redirectUrl: string }): object`
- Produces: `createCheckout(input: { variantId: string; email: string; custom: Record<string,string>; redirectUrl: string }): Promise<{ url: string }>`
- Produces: `verifyWebhookSignature(rawBody: string, signature: string | null, secret: string): boolean`
- Produces: `parseOrderCreated(payload: any): { orderId: string; email: string; slug: string | null; status: string; total: number; currency: string } | null`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/lemonsqueezy.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import {
  buildCheckoutPayload,
  verifyWebhookSignature,
  parseOrderCreated
} from './lemonsqueezy';

describe('buildCheckoutPayload', () => {
  it('nests store/variant relationships and checkout_data', () => {
    const payload = buildCheckoutPayload({
      storeId: '421048',
      variantId: '1853026',
      email: 'buyer@example.com',
      custom: { slug: 'day-trading-from-inside-the-problem' },
      redirectUrl: 'https://x.test/thank-you'
    }) as any;

    expect(payload.data.type).toBe('checkouts');
    expect(payload.data.relationships.store.data.id).toBe('421048');
    expect(payload.data.relationships.variant.data.id).toBe('1853026');
    expect(payload.data.attributes.checkout_data.email).toBe('buyer@example.com');
    expect(payload.data.attributes.checkout_data.custom.slug).toBe(
      'day-trading-from-inside-the-problem'
    );
    expect(payload.data.attributes.product_options.redirect_url).toBe(
      'https://x.test/thank-you'
    );
  });
});

describe('verifyWebhookSignature', () => {
  const secret = 'operator_trader';
  const body = '{"meta":{"event_name":"order_created"}}';
  const good = crypto.createHmac('sha256', secret).update(body).digest('hex');

  it('accepts a valid signature', () => {
    expect(verifyWebhookSignature(body, good, secret)).toBe(true);
  });
  it('rejects a tampered signature', () => {
    expect(verifyWebhookSignature(body, good.replace(/.$/, '0'), secret)).toBe(false);
  });
  it('rejects a missing signature', () => {
    expect(verifyWebhookSignature(body, null, secret)).toBe(false);
  });
  it('rejects when the body differs', () => {
    expect(verifyWebhookSignature(body + ' ', good, secret)).toBe(false);
  });
});

describe('parseOrderCreated', () => {
  const payload = {
    meta: { event_name: 'order_created', custom_data: { slug: 'day-trading-from-inside-the-problem' } },
    data: { id: '99', attributes: { user_email: 'buyer@example.com', status: 'paid', total: 1899, currency: 'USD' } }
  };
  it('extracts the fields we fulfill on', () => {
    expect(parseOrderCreated(payload)).toEqual({
      orderId: '99',
      email: 'buyer@example.com',
      slug: 'day-trading-from-inside-the-problem',
      status: 'paid',
      total: 1899,
      currency: 'USD'
    });
  });
  it('returns null when data is missing', () => {
    expect(parseOrderCreated({ meta: {} })).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — module `./lemonsqueezy` has no such exports.

- [ ] **Step 3: Implement `src/lib/lemonsqueezy.ts`**

```ts
/**
 * Lemon Squeezy client (https://www.lemonsqueezy.com).
 *
 * Sells the English (USD) edition. Two halves:
 *  - Checkout creation: POST /v1/checkouts (JSON:API) → hosted checkout URL.
 *  - Webhook verification: order_created is signed with X-Signature =
 *    HMAC-SHA256(rawBody, LEMONSQUEEZY_WEBHOOK_SECRET). The signed payload is
 *    authoritative, so (unlike Flow) there is no status round-trip.
 *
 * Test mode vs live is determined by which API key is configured — no code change.
 */
import crypto from 'node:crypto';
import { requireEnv } from './env';

const API_BASE = 'https://api.lemonsqueezy.com/v1';
const JSON_API = 'application/vnd.api+json';

export interface CheckoutInput {
  variantId: string;
  email: string;
  custom: Record<string, string>;
  redirectUrl: string;
}

/** Build the JSON:API body for POST /v1/checkouts. Pure — no network. */
export function buildCheckoutPayload(
  input: CheckoutInput & { storeId: string }
): object {
  return {
    data: {
      type: 'checkouts',
      attributes: {
        checkout_data: { email: input.email, custom: input.custom },
        product_options: { redirect_url: input.redirectUrl }
      },
      relationships: {
        store: { data: { type: 'stores', id: input.storeId } },
        variant: { data: { type: 'variants', id: input.variantId } }
      }
    }
  };
}

/** Create a hosted checkout and return its URL. Throws on API error. */
export async function createCheckout(
  input: CheckoutInput
): Promise<{ url: string }> {
  const apiKey = requireEnv('LEMONSQUEEZY_API_KEY');
  const storeId = requireEnv('LEMONSQUEEZY_STORE_ID');

  const res = await fetch(`${API_BASE}/checkouts`, {
    method: 'POST',
    headers: {
      Accept: JSON_API,
      'Content-Type': JSON_API,
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(buildCheckoutPayload({ ...input, storeId }))
  });

  const data = (await res.json()) as Record<string, any>;
  if (!res.ok || !data?.data?.attributes?.url) {
    const detail =
      data?.errors?.[0]?.detail ?? data?.message ?? `HTTP ${res.status}`;
    throw new Error(`Lemon Squeezy checkout create failed: ${detail}`);
  }
  return { url: data.data.attributes.url as string };
}

/** Verify the X-Signature header against the raw request body. */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(signature, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export interface OrderCreated {
  orderId: string;
  email: string;
  /** Echoed checkout custom data; the product slug we set at checkout. */
  slug: string | null;
  status: string;
  /** Amount in cents. */
  total: number;
  currency: string;
}

/** Extract the fields we fulfill on from an order_created payload. */
export function parseOrderCreated(payload: any): OrderCreated | null {
  const attrs = payload?.data?.attributes;
  const id = payload?.data?.id;
  if (!attrs || !id) return null;
  return {
    orderId: String(id),
    email: String(attrs.user_email ?? ''),
    slug: payload?.meta?.custom_data?.slug ?? null,
    status: String(attrs.status ?? ''),
    total: Number(attrs.total ?? 0),
    currency: String(attrs.currency ?? '')
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS (all `lemonsqueezy` + `formatPrice` tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/lemonsqueezy.ts src/lib/lemonsqueezy.test.ts
git commit -m "feat: add Lemon Squeezy client (checkout, signature verify, order parse)"
```

---

## Task 4: Checkout endpoint

`POST /api/checkout/lemonsqueezy` — mirrors the Flow checkout: validate slug+email, create a checkout, 303-redirect to the hosted page; on any error redirect to `/payment-error`.

**Files:**
- Create: `src/pages/api/checkout/lemonsqueezy.ts`

**Interfaces:**
- Consumes: `getProduct` (products.ts), `createCheckout` (lemonsqueezy.ts), `getEnv` (env.ts).

- [ ] **Step 1: Implement the endpoint**

```ts
import type { APIRoute } from 'astro';
import { getProduct } from '../../../config/products';
import { getEnv } from '../../../lib/env';
import { createCheckout } from '../../../lib/lemonsqueezy';

// Server-rendered endpoint (Vercel serverless function).
export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/checkout/lemonsqueezy
 *
 * Creates a Lemon Squeezy hosted checkout for a USD product and redirects the
 * buyer to it. No order persisted: the product slug rides in the checkout's
 * `custom` data and the buyer email is the LS order email, so the webhook can
 * fulfill from the signed order_created payload alone.
 */
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData().catch(() => null);
  const slug = form?.get('slug')?.toString().trim() ?? '';
  const email = form?.get('email')?.toString().trim() ?? '';

  const product = getProduct(slug);
  if (
    !product ||
    product.provider !== 'lemonsqueezy' ||
    !product.lemonSqueezy?.variantId ||
    !EMAIL_RE.test(email)
  ) {
    return redirect('/payment-error', 303);
  }

  try {
    const siteUrl = getEnv('PUBLIC_SITE_URL') ?? new URL(request.url).origin;
    const { url } = await createCheckout({
      variantId: product.lemonSqueezy.variantId,
      email,
      custom: { slug: product.slug },
      redirectUrl: `${siteUrl}/thank-you`
    });
    return redirect(url, 303);
  } catch (error) {
    console.error('[checkout/lemonsqueezy] failed to create checkout:', error);
    return redirect('/payment-error', 303);
  }
};
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds; `/api/checkout/lemonsqueezy` appears as a serverless function in the output.

- [ ] **Step 3: Commit**

```bash
git add src/pages/api/checkout/lemonsqueezy.ts
git commit -m "feat: add Lemon Squeezy checkout endpoint"
```

---

## Task 5: Webhook endpoint

> **Ordering:** This task uses the generalized `sendOrderNotificationEmail` signature defined in **Task 6**. Implement and commit **Task 6 before Task 5** (do them as the pair 6→5). The repo must build at every commit, so do not commit this task until Task 6 is in.

`POST /api/webhooks/lemonsqueezy` — verify signature, handle `order_created`/`paid`, mint a download token, send the English download email + internal notification. Per-process idempotency keyed by LS order id.

**Files:**
- Create: `src/pages/api/webhooks/lemonsqueezy.ts`

**Interfaces:**
- Consumes: `verifyWebhookSignature`, `parseOrderCreated` (lemonsqueezy.ts), `getProduct` (products.ts), `requireEnv`/`getEnv` (env.ts), `createDownloadToken`/`getDownloadTtlDays` (download-token.ts), `sendDownloadEmail`/`sendOrderNotificationEmail` (email.ts).

- [ ] **Step 1: Implement the endpoint**

```ts
import type { APIRoute } from 'astro';
import { getProduct } from '../../../config/products';
import { getEnv, requireEnv } from '../../../lib/env';
import {
  verifyWebhookSignature,
  parseOrderCreated
} from '../../../lib/lemonsqueezy';
import {
  createDownloadToken,
  getDownloadTtlDays
} from '../../../lib/download-token';
import {
  sendDownloadEmail,
  sendOrderNotificationEmail
} from '../../../lib/email';

// Server-rendered endpoint (Vercel serverless function).
export const prerender = false;

/**
 * POST /api/webhooks/lemonsqueezy
 *
 * Signed server-to-server callback from Lemon Squeezy. We verify
 * X-Signature = HMAC-SHA256(rawBody, secret); the signed payload is
 * AUTHORITATIVE (no status round-trip needed). On a paid order_created we mint a
 * signed download link and email it via Resend.
 *
 * TODO(durable-idempotency): the guard below is per-process only. Vercel
 * serverless instances are ephemeral and unshared, so a retry on a cold/other
 * instance can still double-send. Replace `fulfilledOrders` with a durable,
 * atomic claim (KV/DB) keyed by orderId — insert-if-absent before sending.
 */
const fulfilledOrders = new Set<string>();

export const POST: APIRoute = async ({ request }) => {
  const rawBody = await request.text();
  const signature = request.headers.get('x-signature');
  const secret = requireEnv('LEMONSQUEEZY_WEBHOOK_SECRET');

  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    return new Response('Invalid signature', { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response('Bad JSON', { status: 400 });
  }

  const eventName =
    request.headers.get('x-event-name') ?? payload?.meta?.event_name;
  if (eventName !== 'order_created') {
    return new Response('OK', { status: 200 });
  }

  const order = parseOrderCreated(payload);
  if (!order) {
    return new Response('OK', { status: 200 });
  }

  if (order.status !== 'paid') {
    console.log(
      `[webhooks/lemonsqueezy] order ${order.orderId} not paid (status ${order.status})`
    );
    return new Response('OK', { status: 200 });
  }

  const product = order.slug ? getProduct(order.slug) : undefined;
  if (!product || !order.email) {
    console.error(
      `[webhooks/lemonsqueezy] paid order ${order.orderId} missing product/email`,
      { slug: order.slug, email: order.email }
    );
    return new Response('OK', { status: 200 });
  }

  // Best-effort idempotency: claim before sending.
  if (fulfilledOrders.has(order.orderId)) {
    console.log(
      `[webhooks/lemonsqueezy] order ${order.orderId} already fulfilled this runtime — skipping`
    );
    return new Response('OK', { status: 200 });
  }
  fulfilledOrders.add(order.orderId);

  try {
    const downloadToken = await createDownloadToken({
      slug: product.slug,
      email: order.email
    });
    const siteUrl = getEnv('PUBLIC_SITE_URL') ?? new URL(request.url).origin;
    const downloadUrl = `${siteUrl}/api/download?token=${downloadToken}`;

    await sendDownloadEmail({
      to: order.email,
      product,
      downloadUrl,
      ttlDays: getDownloadTtlDays()
    });

    console.log('[webhooks/lemonsqueezy] fulfilled paid order', {
      orderId: order.orderId,
      product: product.slug,
      email: order.email
    });
  } catch (sendError) {
    // Release the claim so an LS retry (we return 500) can try again.
    fulfilledOrders.delete(order.orderId);
    console.error('[webhooks/lemonsqueezy] delivery failed:', sendError);
    return new Response('Error', { status: 500 });
  }

  // Internal sale notification: best-effort, never blocks/undoes fulfillment.
  const notifyTo = getEnv('ORDER_NOTIFICATION_EMAIL');
  if (notifyTo) {
    try {
      await sendOrderNotificationEmail({
        to: notifyTo,
        product,
        buyerEmail: order.email,
        amount: (order.total / 100).toFixed(2),
        currency: order.currency,
        orderRef: order.orderId,
        statusLabel: 'PAID',
        date: new Date()
      });
    } catch (notifyError) {
      console.error(
        `[webhooks/lemonsqueezy] internal notification failed for ${order.orderId} (delivery already sent):`,
        notifyError
      );
    }
  }

  return new Response('OK', { status: 200 });
};
```

> Note: this calls `sendOrderNotificationEmail` with a **new generalized signature** (`product`, `orderRef`, `statusLabel`) defined in Task 6. Implement Task 6 before building this, or the build will fail on the changed signature.

- [ ] **Step 2: Verify build (after Task 6 is in place)**

Run: `npm run build`
Expected: build succeeds; `/api/webhooks/lemonsqueezy` appears as a serverless function.

- [ ] **Step 3: Commit**

```bash
git add src/pages/api/webhooks/lemonsqueezy.ts
git commit -m "feat: add Lemon Squeezy webhook (signed, authoritative fulfillment)"
```

---

## Task 6: Email i18n (es/en bundles)

Parametrize `lib/email.ts` by `product.language` and generalize the order-notification signature so it is provider-neutral (Flow's webhook is updated to match).

**Files:**
- Modify: `src/lib/email.ts`
- Modify: `src/pages/api/webhooks/flow.ts` (update the notification call to the new signature)

**Interfaces:**
- Produces: `sendDownloadEmail({ to, product, downloadUrl, ttlDays })` — unchanged signature; copy now follows `product.language`.
- Produces: `sendOrderNotificationEmail({ to, product, buyerEmail, amount, currency, orderRef, statusLabel, date })` — generalized (was Flow-specific fields).

- [ ] **Step 1: Add language copy bundles and rewire `sendDownloadEmail`**

In `src/lib/email.ts`, add a copy table near the top (after imports) and select it by language. Add:

```ts
type Locale = 'es' | 'en';

interface DownloadCopy {
  htmlLang: string;
  subject: (title: string) => string;
  heading: string;
  intro: (title: string) => string; // returns HTML (title injected, pre-escaped by caller)
  filesLabel: string;
  expiry: (days: number) => string;
  support: (email: string) => string; // HTML
  supportText: (email: string) => string;
  disclaimer: string;
  thanksText: string;
  paidText: (title: string) => string;
  expiryText: (days: number) => string;
}

const DOWNLOAD_COPY: Record<Locale, DownloadCopy> = {
  es: {
    htmlLang: 'es',
    subject: (t) => `Tu descarga: ${t}`,
    heading: '¡Gracias por tu compra!',
    intro: (t) =>
      `Tu pago fue confirmado. Aquí están tus descargas de <strong>${t}</strong>.`,
    filesLabel: 'Tus archivos',
    expiry: (d) => `Estos enlaces son personales y vencen en ${d} días.`,
    support: (e) =>
      `Si tienes algún problema con la descarga, responde a este correo o escríbenos a <a href="mailto:${e}" style="color:#b45309;text-decoration:underline;">${e}</a>.`,
    supportText: (e) =>
      `Si tienes algún problema con la descarga, responde a este correo o escríbenos a ${e}.`,
    disclaimer:
      'Solo para fines educativos. No es asesoramiento financiero. No incluye alertas ni señales. El trading conlleva riesgo de pérdida de capital.',
    thanksText: '¡Gracias por tu compra!',
    paidText: (t) =>
      `Tu pago fue confirmado. Aquí están tus descargas de "${t}".`,
    expiryText: (d) => `(Estos enlaces son personales y vencen en ${d} días.)`
  },
  en: {
    htmlLang: 'en',
    subject: (t) => `Your download: ${t}`,
    heading: 'Thank you for your purchase!',
    intro: (t) =>
      `Your payment is confirmed. Here are your downloads for <strong>${t}</strong>.`,
    filesLabel: 'Your files',
    expiry: (d) => `These links are personal and expire in ${d} days.`,
    support: (e) =>
      `If you have any trouble downloading, reply to this email or write to us at <a href="mailto:${e}" style="color:#b45309;text-decoration:underline;">${e}</a>.`,
    supportText: (e) =>
      `If you have any trouble downloading, reply to this email or write to us at ${e}.`,
    disclaimer:
      'For educational purposes only. Not financial advice. Does not include alerts or signals. Trading carries the risk of capital loss.',
    thanksText: 'Thank you for your purchase!',
    paidText: (t) => `Your payment is confirmed. Here are your downloads for "${t}".`,
    expiryText: (d) => `(These links are personal and expire in ${d} days.)`
  }
};

function copyFor(language: string): DownloadCopy {
  return DOWNLOAD_COPY[(language as Locale)] ?? DOWNLOAD_COPY.es;
}
```

Then change `sendDownloadEmail` to use the bundle:

```ts
export async function sendDownloadEmail(
  input: DownloadEmailInput
): Promise<void> {
  const { to, product } = input;
  const c = copyFor(product.language);

  await sendEmail({
    to,
    subject: c.subject(product.title),
    html: renderHtml(input, c),
    text: renderText(input, c),
    replyTo: supportEmail
  });
}
```

Update `renderText`/`renderHtml` signatures to take `c: DownloadCopy` and replace every hardcoded Spanish string with the bundle field (`c.thanksText`, `c.paidText(...)`, `c.filesLabel`, `c.expiry(...)`, `c.support(...)`, `c.disclaimer`, `lang="${c.htmlLang}"`, etc.). The per-file row labels/buttons already come from `product.files[].label`/`ctaLabel` (English in the English product), so they need no change. Keep `escapeHtml` and the table markup identical.

- [ ] **Step 2: Generalize `sendOrderNotificationEmail`**

Replace `OrderNotificationInput` and the function so it is provider-neutral and language-aware:

```ts
import type { Product } from '../config/products';

export interface OrderNotificationInput {
  to: string;
  product: Product;
  buyerEmail: string;
  /** Amount paid, already formatted as a string (e.g. "18.99" or "14990"). */
  amount: string;
  currency: string;
  /** Provider order reference (Flow commerceOrder or LS order id). */
  orderRef: string;
  /** Human status label, e.g. "PAID". */
  statusLabel: string;
  date: Date;
}

export async function sendOrderNotificationEmail(
  input: OrderNotificationInput
): Promise<void> {
  await sendEmail({
    to: input.to,
    subject: `New sale: ${input.product.title}`,
    html: renderOrderNotificationHtml(input),
    text: renderOrderNotificationText(input)
  });
}
```

Update `renderOrderNotificationText`/`renderOrderNotificationHtml` to read `input.product.title`, `input.orderRef`, `input.statusLabel` (replacing the old `productTitle`/`commerceOrder`/`flowStatus` fields). The internal email is admin-only; English labels are fine for both products.

- [ ] **Step 3: Update the Flow webhook to the new notification signature**

In `src/pages/api/webhooks/flow.ts`, change the `sendOrderNotificationEmail` call (was `productTitle`/`commerceOrder`/`flowStatus`) to:

```ts
        await sendOrderNotificationEmail({
          to: notifyTo,
          product,
          buyerEmail: email,
          amount: payment.amount,
          currency: payment.raw?.currency ?? 'CLP',
          orderRef: payment.commerceOrder,
          statusLabel: 'PAID',
          date: new Date()
        });
```

- [ ] **Step 4: Verify build + tests**

Run: `npm run build && npm test`
Expected: build succeeds; tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/email.ts src/pages/api/webhooks/flow.ts
git commit -m "feat: language-aware delivery email + provider-neutral sale notification"
```

---

## Task 7: Parametrize BookContent UI labels, BuyForm, BookPage, BaseLayout

Move the hardcoded Spanish UI micro-copy into a `content.ui` block, drive `BuyForm`'s action from `provider`, and add a `lang` prop + per-language chrome to `BaseLayout`. The Spanish content gains a `ui` block so its page is byte-for-byte the same.

**Files:**
- Modify: `src/content/books/types.ts`
- Modify: `src/content/books/el-trader-que-perdia-ganando/copy.ts`
- Modify: `src/content/books/el-trader-que-perdia-ganando/index.ts`
- Modify: `src/components/book-page/BuyForm.astro`
- Modify: `src/components/book-page/BookPage.astro`
- Modify: `src/layouts/BaseLayout.astro`

**Interfaces:**
- Produces: `BookContent.ui: { launchSuffix; previewBadge; bonusWord; pagesLabel; chaptersLabel; partsLabel; coverAltPrefix; previewAltPrefix; stickyCta; emailPlaceholder; buyCta }`
- Produces: `BaseLayout` prop `lang?: 'es' | 'en'` (default `'es'`).
- Produces: `BuyForm` props `{ slug; provider: 'flow' | 'lemonsqueezy'; ctaLabel; placeholder; note?; class? }`.

- [ ] **Step 1: Add the `ui` block to `BookContent`**

In `src/content/books/types.ts`, add to the `BookContent` interface (before `stickyLabel`):

```ts
  /** Language-specific UI micro-copy used by the BookPage chrome. */
  ui: {
    /** Suffix after the discount %, e.g. "launch price". */
    launchSuffix: string;
    /** Bonus image placeholder label, e.g. "Preview". */
    previewBadge: string;
    /** Word before the bonus index, e.g. "Bonus". */
    bonusWord: string;
    pagesLabel: string;
    chaptersLabel: string;
    partsLabel: string;
    /** Prefix for the cover image alt text, e.g. "Cover of". */
    coverAltPrefix: string;
    /** Prefix for a bonus preview alt text, e.g. "Preview:". */
    previewAltPrefix: string;
    /** Sticky mobile bar CTA, e.g. "Buy now". */
    stickyCta: string;
    /** Email input placeholder. */
    emailPlaceholder: string;
    /** Default buy-button label. */
    buyCta: string;
  };
```

- [ ] **Step 2: Add the Spanish `ui` values**

In `src/content/books/el-trader-que-perdia-ganando/copy.ts`, append:

```ts
export const ui: BookContent['ui'] = {
  launchSuffix: 'precio de lanzamiento',
  previewBadge: 'Vista previa',
  bonusWord: 'Bono',
  pagesLabel: 'páginas',
  chaptersLabel: 'capítulos',
  partsLabel: 'partes',
  coverAltPrefix: 'Portada de',
  previewAltPrefix: 'Vista previa:',
  stickyCta: 'Comprar ahora',
  emailPlaceholder: 'tucorreo@ejemplo.com',
  buyCta: 'Comprar ahora'
};
```

In `src/content/books/el-trader-que-perdia-ganando/index.ts`, import `ui` and add it to the exported `content` object:

```ts
import {
  hero,
  included,
  why,
  bonuses,
  audience,
  coverage,
  finalCta,
  stickyLabel,
  ui
} from './copy';
```
…and add `ui,` to the `content` object literal.

- [ ] **Step 3: Update `BuyForm.astro`**

Replace the frontmatter + form action/placeholder:

```astro
---
// Reusable checkout form: email capture + buy button. Posts to the provider's
// checkout endpoint (/api/checkout/<provider>).
interface Props {
  slug: string;
  provider: 'flow' | 'lemonsqueezy';
  ctaLabel: string;
  placeholder: string;
  note?: string;
  class?: string;
}

const { slug, provider, ctaLabel, placeholder, note, class: className } =
  Astro.props;
---

<form
  method="POST"
  action={`/api/checkout/${provider}`}
  class:list={['max-w-md', className]}
>
  <input type="hidden" name="slug" value={slug} />
  <div class="flex flex-col gap-3 sm:flex-row">
    <input
      type="email"
      name="email"
      required
      placeholder={placeholder}
      class="w-full flex-1 rounded-lg border border-stone-700 bg-stone-950/80 px-4 py-3 text-stone-100 placeholder:text-stone-600 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none"
    />
    <button
      type="submit"
      class="rounded-lg bg-amber-400 px-6 py-3 font-semibold text-stone-950 transition hover:bg-amber-300"
    >
      {ctaLabel}
    </button>
  </div>
  {note && <p class="mt-3 text-sm text-stone-400">{note}</p>}
</form>
```

- [ ] **Step 4: Update `BookPage.astro` to pass props + use UI labels**

- Pass `lang` to `BaseLayout` (frontmatter already has `product`): change the opening tag to
  ```astro
  <BaseLayout
    title={`${product.title} — The Operator Library`}
    description={product.subtitle}
    lang={product.language}
  >
  ```
- Both `<BuyForm .../>` usages → add the new required props:
  - Hero: `<BuyForm slug={product.slug} provider={product.provider} ctaLabel={content.ui.buyCta} placeholder={content.ui.emailPlaceholder} note={content.hero.buyNote} class="mt-6" />`
  - Final CTA: `<BuyForm slug={product.slug} provider={product.provider} ctaLabel={content.ui.buyCta} placeholder={content.ui.emailPlaceholder} class="mx-auto mt-6" />`
- Cover alt (~line 116): `alt={`${content.ui.coverAltPrefix} ${product.title}`}`
- Discount suffix (~line 88): `-{discountPct}% {content.ui.launchSuffix}`
- Bonus placeholder label (~line 261): `{content.ui.previewBadge}`
- Bonus preview alt (~line 266): `alt={`${content.ui.previewAltPrefix} ${bonus.title}`}`
- Bonus word (~line 278): `{content.ui.bonusWord} {i + 1}`
- Coverage unit labels (~lines 344, 350, 356): `{content.ui.pagesLabel}`, `{content.ui.chaptersLabel}`, `{content.ui.partsLabel}`
- Sticky CTA (~line 485): `{content.ui.stickyCta}`

- [ ] **Step 5: Add `lang` + chrome to `BaseLayout.astro`**

Add to `Props`: `lang?: 'es' | 'en';`. Destructure with default `'es'`. Add a chrome map in the frontmatter:

```ts
const { title, description = 'The Operator Library — libros para operadores.', lang = 'es' } =
  Astro.props;

const chrome = {
  es: {
    home: '/es',
    catalog: 'Catálogo',
    contact: 'Contacto',
    disclaimer: 'Aviso legal',
    privacy: 'Privacidad',
    terms: 'Términos'
  },
  en: {
    home: '/en/day-trading-from-inside-the-problem',
    catalog: 'Catalog',
    contact: 'Contact',
    disclaimer: 'Disclaimer',
    privacy: 'Privacy',
    terms: 'Terms'
  }
}[lang];
```

Then: `<html lang={lang} class="h-full">`; the two header `href="/es"` → `href={chrome.home}`; the catalog link text → `{chrome.catalog}`; footer link texts → `{chrome.contact}`, `{chrome.disclaimer}`, `{chrome.privacy}`, `{chrome.terms}` (legal `href`s stay `/legal/*` — English legal pages are out of scope; see spec).

- [ ] **Step 6: Verify build + tests**

Run: `npm run build && npm test`
Expected: build succeeds; the Spanish page renders identically (same labels). Tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/content/books/types.ts src/content/books/el-trader-que-perdia-ganando/copy.ts src/content/books/el-trader-que-perdia-ganando/index.ts src/components/book-page/BuyForm.astro src/components/book-page/BookPage.astro src/layouts/BaseLayout.astro
git commit -m "feat: parametrize BookPage UI labels, BuyForm provider, BaseLayout language"
```

---

## Task 8: English content + page + thank-you/error pages + env docs

Add the translated content (including its `ui` block), the page wrapper, and the English thank-you/error pages. Document the LS env vars.

**Files:**
- Create: `src/content/books/day-trading-from-inside-the-problem/copy.ts`
- Create: `src/content/books/day-trading-from-inside-the-problem/sections.ts`
- Create: `src/content/books/day-trading-from-inside-the-problem/faq.ts`
- Create: `src/content/books/day-trading-from-inside-the-problem/index.ts`
- Create: `src/pages/en/day-trading-from-inside-the-problem.astro`
- Create: `src/pages/thank-you.astro`
- Create: `src/pages/payment-error.astro`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `BookContent` (types.ts), `getProduct` (products.ts), `BaseLayout`, `BookPage`.

- [ ] **Step 1: Create `copy.ts` (translated)**

```ts
/**
 * Marketing copy for "Day Trading from Inside the Problem" (English edition).
 */
import type { BookContent } from '../types';

const imageBase = '/images/books/day-trading-from-inside-the-problem';

export const hero: BookContent['hero'] = {
  badge: 'Digital ebook + 4 bonuses included',
  bundleLine:
    'Includes PDF ebook + EPUB + Kindle/AZW3 + 4 printable reference sheets.',
  buyNote: 'Delivered by email after payment · Secure checkout via Lemon Squeezy.',
  trust:
    'This is not a signals room. No alerts. No promises of profit. It is a practical guide to building process, risk, and discipline.'
};

export const included: BookContent['included'] = {
  heading: 'What you get today',
  intro:
    'It is not just the book: it is the complete package to take what you read into your trading.',
  items: [
    { label: 'Main ebook in PDF', note: '125 pages' },
    { label: 'EPUB version', note: 'for most e-readers' },
    { label: 'Kindle / AZW3 version', note: 'for Amazon Kindle' },
    { label: 'Short Decision Sheet' },
    { label: 'VWAP Long / Short Sheet' },
    { label: '50-Trade Review Sheet' },
    { label: 'Daily Risk Rules Card' }
  ]
};

export const why: BookContent['why'] = {
  eyebrow: 'Why this book exists',
  heading: 'You can win most of your trades and still lose money.',
  paragraphs: [
    'Most traders think their problem is entries. They hunt for the perfect setup, another strategy, another signals room. But the real hole is usually somewhere else.',
    'You can be right on 70% of your trades and still end the month in the red, because <strong class="text-stone-100">a few uncontrolled losses erase weeks of gains.</strong> It is not the market: it is the lack of a system that protects your account when things get ugly.',
    'This book exists to show you where your capital actually leaks and how to start building a process —risk rules, journaling, and review— that keeps your bad days small.'
  ]
};

export const bonuses: BookContent['bonuses'] = {
  badge: 'Included at no extra cost',
  heading: '4 practical bonuses to use while you trade',
  intro:
    'Reference sheets designed to help you decide faster and with clear rules.',
  items: [
    {
      title: 'Short Decision Sheet',
      description:
        'A checklist for deciding when a short makes sense and when you are just chasing price.',
      image: `${imageBase}/bonus-1.png`
    },
    {
      title: 'VWAP Long / Short Sheet',
      description:
        'A quick reference for reading the VWAP on long and short setups without hesitating in the moment.',
      image: `${imageBase}/bonus-2.png`
    },
    {
      title: '50-Trade Review Sheet',
      description:
        'A template to review your last 50 trades and find where your capital leaks.',
      image: `${imageBase}/bonus-3.png`
    },
    {
      title: 'Daily Risk Rules Card',
      description:
        'Your daily risk limits on a single card, to stop before a bad day turns catastrophic.',
      image: `${imageBase}/bonus-4.png`
    }
  ]
};

export const audience: BookContent['audience'] = {
  forTitle: 'Who it is for',
  forItems: [
    'Traders who have good entries but poor results.',
    'Those who win plenty of trades and still do not see their account grow.',
    'Small-cap traders who want clear risk rules.',
    'Those ready to review their process honestly.'
  ],
  notForTitle: 'Who it is NOT for',
  notForItems: [
    'Anyone looking to get rich quick or for guaranteed profits.',
    'Anyone who wants signals or alerts to copy without understanding.',
    'Anyone unwilling to review their own trades.',
    'Anyone expecting a shortcut instead of a process.'
  ]
};

export const coverage: BookContent['coverage'] = {
  heading: 'What the book covers',
  intro: 'From the fundamentals to psychology, in a structured journey.',
  details: { pages: 125, chapters: 23, parts: 8 },
  topics: [
    'Trading vs investing: which game you are really playing.',
    'Short vs long and when each one makes sense.',
    'Small caps, float, VWAP, frontside and backside.',
    'Brokers, locates, and commissions that eat your profits.',
    'Risk, stops, and how to avoid overtrading.',
    'Psychology, journaling, and systematic trade review.'
  ]
};

export const finalCta: BookContent['finalCta'] = {
  heading: 'Start building a process that protects your account',
  buyNote: 'You receive an email with the download buttons after payment.',
  disclaimer:
    'For educational purposes only. Not financial advice. Does not include alerts or signals. Trading carries the risk of capital loss.'
};

export const stickyLabel = 'Ebook + 4 bonuses';

export const ui: BookContent['ui'] = {
  launchSuffix: 'launch price',
  previewBadge: 'Preview',
  bonusWord: 'Bonus',
  pagesLabel: 'pages',
  chaptersLabel: 'chapters',
  partsLabel: 'parts',
  coverAltPrefix: 'Cover of',
  previewAltPrefix: 'Preview:',
  stickyCta: 'Buy now',
  emailPlaceholder: 'you@example.com',
  buyCta: 'Buy now'
};
```

- [ ] **Step 2: Create `sections.ts` (translated)**

```ts
/**
 * Data-driven visual sections for "Day Trading from Inside the Problem":
 * the "problem in numbers" stat block and the book preview cards.
 */
import type { BookContent } from '../types';

export const problem: BookContent['problem'] = {
  heading: 'The problem, in numbers',
  intro:
    'An illustrative example of how a high win rate can hide an account that loses.',
  stats: [
    {
      value: '73%',
      label: 'winning trades',
      note: 'A win rate almost anyone would take.',
      tone: 'win'
    },
    {
      value: '−$',
      label: 'and still losing money',
      note: 'Because the size of the losses outweighs the frequency of the wins.',
      tone: 'loss'
    },
    {
      value: '5',
      label: 'trades caused almost all the damage',
      note: 'Identifying and controlling them changes the whole equity curve.',
      tone: 'neutral'
    }
  ],
  bars: [
    { label: 'Profit from the winning trades', sign: '+', tone: 'win', widthPct: 55 },
    {
      label: 'Loss from a few uncontrolled trades',
      sign: '−',
      tone: 'loss',
      widthPct: 78
    }
  ],
  barsCaption: 'Illustrative example. Does not represent real or guaranteed results.'
};

export const preview: BookContent['preview'] = {
  eyebrow: 'Book preview',
  heading: 'A look at what you will read',
  intro:
    'Three passages that show the tone: direct, honest, and written from inside the problem.',
  items: [
    {
      title: 'The five words that cost me everything',
      teaser:
        'The phrase almost every trader repeats right before turning a small loss into a catastrophe.'
    },
    {
      title: 'The receipt',
      teaser:
        'What you really pay every time you break your own rules — beyond the number on the screen.'
    },
    {
      title: 'The only math that matters',
      teaser:
        'Why your win rate can lie to you and which number you should look at instead.'
    }
  ]
};
```

- [ ] **Step 3: Create `faq.ts` (translated, Flow/CLP references swapped to Lemon Squeezy/USD)**

```ts
/**
 * FAQ for "Day Trading from Inside the Problem".
 */
import type { BookContent } from '../types';
import { supportEmail } from '../../../config/business';

export const faq: BookContent['faq'] = {
  heading: 'Frequently asked questions',
  items: [
    {
      q: 'Is it a course?',
      a: 'No. It is a practical ebook accompanied by reference sheets. You read it at your own pace and apply what you need, with no classes or platforms.'
    },
    {
      q: 'Does it include signals or alerts?',
      a: 'No. We do not sell signals, alerts, or a trading room. The goal is for you to understand your own process, not to depend on someone else’s.'
    },
    {
      q: 'How do I receive the ebook?',
      a: `After payment you receive an email with download buttons for all files: PDF, EPUB, Kindle/AZW3, and the reference sheets. If you do not see it within a few minutes, check your spam folder or write to us at ${supportEmail}.`
    },
    {
      q: 'How is the payment processed?',
      a: 'Payment is processed securely via Lemon Squeezy in US dollars (USD). The content applies to any English-speaking trader.'
    },
    {
      q: 'Is it financial advice?',
      a: 'No. The material is for educational purposes only. It is not financial advice or an investment recommendation. The decisions you make are your responsibility.'
    },
    {
      q: 'What format does it come in?',
      a: 'The ebook comes in PDF, EPUB, and Kindle/AZW3. The reference sheets and the rules card come as print-ready PDFs you can use on screen or print.'
    }
  ]
};
```

- [ ] **Step 4: Create `index.ts`**

```ts
/**
 * Assembled landing-page content for "Day Trading from Inside the Problem".
 */
import type { BookContent } from '../types';
import {
  hero,
  included,
  why,
  bonuses,
  audience,
  coverage,
  finalCta,
  stickyLabel,
  ui
} from './copy';
import { problem, preview } from './sections';
import { faq } from './faq';

export const content: BookContent = {
  hero,
  included,
  why,
  problem,
  bonuses,
  audience,
  coverage,
  preview,
  faq,
  finalCta,
  stickyLabel,
  ui
};
```

- [ ] **Step 5: Create the page `src/pages/en/day-trading-from-inside-the-problem.astro`**

```astro
---
import BookPage from '../../components/book-page/BookPage.astro';
import { getProduct } from '../../config/products';
import { content } from '../../content/books/day-trading-from-inside-the-problem';

const product = getProduct('day-trading-from-inside-the-problem')!;
---

<BookPage product={product} content={content} />
```

- [ ] **Step 6: Create `src/pages/thank-you.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { supportEmail } from '../config/business';
import { getProduct } from '../config/products';

const product = getProduct('day-trading-from-inside-the-problem');
const purchaseValue = product?.price ?? 0;
const purchaseCurrency = product?.currency ?? 'USD';
---

<BaseLayout
  title="Thank you for your purchase! — The Operator Library"
  description="Your purchase is confirmed."
  lang="en"
>
  <section class="mx-auto max-w-xl px-6 py-24 text-center">
    <div
      class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-400/15 text-2xl text-amber-300"
      aria-hidden="true"
    >
      ✓
    </div>
    <h1 class="mt-6 text-3xl font-semibold text-stone-50">Thank you for your purchase!</h1>
    <p class="mt-4 text-lg text-stone-400">
      Your payment is confirmed. We emailed you the download link for your book.
      The link is personal and valid for a limited time.
    </p>
    <p class="mt-3 text-sm text-stone-500">
      Do not see the email in a few minutes? Check your spam folder or
      <a href={`mailto:${supportEmail}`} class="underline hover:text-stone-300">write to us at {supportEmail}</a>.
    </p>
    <a
      href="/en/day-trading-from-inside-the-problem"
      class="mt-10 inline-block rounded-lg border border-stone-700 px-5 py-2.5 text-sm font-medium text-stone-200 transition hover:border-amber-400/60 hover:text-amber-300"
    >
      Back to the book
    </a>
  </section>

  <!-- Meta Pixel: Purchase conversion (fires once the page loads) -->
  <script
    is:inline
    define:vars={{ value: purchaseValue, currency: purchaseCurrency }}
  >
    if (typeof fbq === 'function') {
      fbq('track', 'Purchase', { value: value, currency: currency });
    }
  </script>
</BaseLayout>
```

- [ ] **Step 7: Create `src/pages/payment-error.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { supportEmail } from '../config/business';
---

<BaseLayout
  title="There was a problem with your payment — The Operator Library"
  description="We could not process your payment."
  lang="en"
>
  <section class="mx-auto max-w-xl px-6 py-24 text-center">
    <div
      class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 text-2xl text-red-400"
      aria-hidden="true"
    >
      !
    </div>
    <h1 class="mt-6 text-3xl font-semibold text-stone-50">Payment not completed</h1>
    <p class="mt-4 text-lg text-stone-400">
      Your payment could not be processed or was cancelled. No charge was made.
      You can try again whenever you like.
    </p>
    <div class="mt-10 flex flex-wrap justify-center gap-3">
      <a
        href="/en/day-trading-from-inside-the-problem"
        class="rounded-lg bg-amber-400 px-5 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-amber-300"
      >
        Try again
      </a>
      <a
        href={`mailto:${supportEmail}`}
        class="rounded-lg border border-stone-700 px-5 py-2.5 text-sm font-medium text-stone-200 transition hover:border-amber-400/60 hover:text-amber-300"
      >
        I need help
      </a>
    </div>
  </section>
</BaseLayout>
```

- [ ] **Step 8: Document env vars in `.env.example`**

Append:

```bash
# Lemon Squeezy (English edition / USD)
LEMONSQUEEZY_API_KEY=
LEMONSQUEEZY_STORE_ID=
LEMONSQUEEZY_WEBHOOK_SECRET=
```

- [ ] **Step 9: Verify build + tests**

Run: `npm run build && npm test`
Expected: build succeeds; `/en/day-trading-from-inside-the-problem`, `/thank-you`, `/payment-error` are emitted; tests pass.

- [ ] **Step 10: Commit**

```bash
git add src/content/books/day-trading-from-inside-the-problem src/pages/en src/pages/thank-you.astro src/pages/payment-error.astro .env.example
git commit -m "feat: English landing page, content, thank-you/error pages"
```

---

## Task 9: End-to-end test in Lemon Squeezy test mode

Manual verification of the whole loop with real LS test mode. No code unless a defect is found.

**Prereqs:** English deliverable files dropped in `blob-uploads/books/day-trading-from-inside-the-problem/en/` and uploaded; LS product renamed to "Day Trading from Inside the Problem"; webhook reachable (Vercel preview deploy, or a tunnel to local dev).

- [ ] **Step 1: Upload the English deliverables**

```bash
npm run upload-files -- --dry-run   # confirm all 4 English files found
npm run upload-files                # upload to Vercel Blob
```
Expected: 4 files uploaded to `books/day-trading-from-inside-the-problem/en/`.

- [ ] **Step 2: Point the LS webhook at the running deployment**

In the LS dashboard webhook, set the callback URL to the deployed `/api/webhooks/lemonsqueezy` (preview URL or tunnel). Confirm event `order_created` is checked and the signing secret matches `LEMONSQUEEZY_WEBHOOK_SECRET` in the deployment env.

- [ ] **Step 3: Buy with the test card**

Visit `/en/day-trading-from-inside-the-problem`, enter an email you control, submit. On the LS hosted page pay with `4242 4242 4242 4242`. Confirm the browser lands on `/thank-you`.

- [ ] **Step 4: Verify fulfillment**

Confirm: (a) deployment logs show `[webhooks/lemonsqueezy] fulfilled paid order`; (b) the buyer email arrives in English with 4 working download buttons that stream the right files; (c) the internal `New sale:` notification arrives. Click a download link to confirm the signed token streams the file.

- [ ] **Step 5: Verify negatives + idempotency**

Confirm: a bad/missing email on the form redirects to `/payment-error`; a replayed webhook (re-send from the LS dashboard) does not send a second email within the same runtime; the Spanish page `/es/el-trader-que-perdia-ganando` still completes a Flow sandbox purchase unchanged.

- [ ] **Step 6: Record results**

Append an "E2E test (YYYY-MM-DD)" note to the spec with pass/fail for each step. If a defect was found and fixed, commit the fix with a `fix:` message referencing the step.

---

## Self-Review

**Spec coverage:** Goal/title/subtitle/slug → Tasks 2 & 8. Pricing USD + formatPrice → Task 2. Provider+currency generalization → Task 2. LS client/checkout/webhook → Tasks 3–5. No `/api/return` (GET redirect to `/thank-you`) → Task 4 (redirect_url) + Task 8 (page). Webhook signature/authoritative/idempotency → Tasks 3 & 5. Email i18n → Task 6. BuyForm/BookPage/BaseLayout i18n → Task 7 (plus the spec-underspecified UI micro-copy, folded in). Content translation → Task 8. Env (test→live via env) → `.env` already set; documented in Task 8; live cutover is swapping env values, no code. Reused-as-is (download-token, /api/download, Blob, upload-files) → untouched. Test plan → Task 9. Out-of-scope (durable idempotency, multi-currency-on-one-page, no Spanish-flow behavior change) → respected. English legal pages noted as out of scope in Task 7. **No gaps.**

**Type consistency:** `Product` fields (`price`, `regularPrice`, `currency`, `provider`, `language`, `lemonSqueezy.variantId`) defined in Task 2 and consumed consistently in Tasks 4/5/8 and `BookPage`/`gracias`. `sendOrderNotificationEmail` generalized signature (Task 6) matches both callers (Flow webhook Task 6 Step 3, LS webhook Task 5). `BuyForm` props (`provider`, `ctaLabel`, `placeholder`) defined Task 7 Step 3 and passed Task 7 Step 4. `BookContent.ui` fields defined Task 7 Step 1 and populated in both Task 7 Step 2 (es) and Task 8 Step 1 (en). `lemonsqueezy.ts` exports match their test + endpoint consumers.

**Placeholder scan:** No TBD/TODO-as-work-item (the one `TODO(durable-idempotency)` is an intentional carried-over code comment, matching the existing Flow webhook). All steps contain concrete code or exact edit strings.
