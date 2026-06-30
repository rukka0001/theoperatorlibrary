# Source Audit — Cómo Hacer Trading Desde Chile

**Date:** 2026-06-30
**Auditor:** Claude (automated inspection — no files changed)
**Goal:** Determine what source exists for the current Spanish product (*El Trader Que Perdía Ganando*) and what is needed to safely build a Chile-specific adaptation (*Cómo Hacer Trading Desde Chile*) without breaking the live product.

---

## 1. Which current files were found

### Final book exports (binary deliverables)
Two copies of the same files exist — a legacy flat copy and the current slug-foldered copy that the product config actually points to:

| File | Legacy path (unused by config) | Live path (referenced by `products.ts`) | Size |
|---|---|---|---|
| PDF | `blob-uploads/El Trader Que Perdia Ganando.pdf` | `blob-uploads/books/el-trader-que-perdia-ganando/es/el-trader-que-perdia-ganando.pdf` | 543 KB |
| EPUB | `blob-uploads/El Trader Que Perdia Ganando.epub` | `blob-uploads/books/el-trader-que-perdia-ganando/es/el-trader-que-perdia-ganando.epub` | 1.99 MB |
| AZW3 | `blob-uploads/El Trader Que Perdia Ganando.azw3` | `blob-uploads/books/el-trader-que-perdia-ganando/es/el-trader-que-perdia-ganando.azw3` | 459 KB |
| Hojas de referencia (bonus) | `blob-uploads/TheOperatorLibrary_HojasDeReferencia.pdf` | `blob-uploads/books/el-trader-que-perdia-ganando/es/hojas-de-referencia.pdf` | 240 KB |

> `blob-uploads/` is **gitignored** (per `blob-uploads/README.txt`) — these binaries are never committed; they are uploaded to Vercel Blob via `npm run upload-files`.

### Website / product source (committed, editable)
- **Product config:** `src/config/products.ts` — single source of truth for identity, price, cover, and the 4 deliverable `blobKey`s.
- **Landing-page copy (content collection):** `src/content/books/el-trader-que-perdia-ganando/`
  - `copy.ts` — hero, included list, why, bonuses, audience, coverage, finalCta, UI micro-copy
  - `sections.ts` — "problem in numbers" stats + book preview cards
  - `faq.ts` — FAQ items
  - `index.ts` — assembles the above into `content: BookContent`
- **Page wrapper:** `src/pages/es/el-trader-que-perdia-ganando.astro` (9 lines — just wires product + content into `<BookPage>`).
- **Reusable renderer:** `src/components/book-page/BookPage.astro` (+ `BuyForm.astro`, `CandlestickBackdrop.astro`).
- **Cover + bonus images:** `public/images/books/el-trader-que-perdia-ganando/` — `cover.png` (2.4 MB), `bonus-1..4.png`.
- **Delivery email (data-driven, shared):** `src/lib/email.ts` — Spanish + English copy bundles; renders a download button per `product.files` entry.
- **Checkout / fulfillment (shared, slug-driven):** `src/pages/api/checkout/flow.ts`, `src/pages/api/webhooks/flow.ts`, `src/lib/flow.ts`, `src/lib/download-token.ts`, `src/pages/api/download.ts`.
- **Upload script:** `scripts/upload-files.ts` — reads `products.ts`, uploads each `blobKey` from a mirrored local dir (default `./blob-uploads`).

### What was NOT found
- ❌ **No editable manuscript** of the book in any text format (no Markdown, HTML, DOCX, LaTeX, Google Doc export, or `.txt`). The prose exists **only inside the EPUB/PDF/AZW3 exports**.
- ❌ **No "Guía Práctica" / "Guía de Referencia" as separate named files.** The only bonus deliverable is `hojas-de-referencia.pdf` ("Hojas de Referencia", 4 reference sheets). There is no separate Guía Práctica or Guía de Referencia file in this repo — see §8.
- ❌ **No build pipeline** that compiles a manuscript into PDF/EPUB/AZW3 (nothing in `package.json`, `scripts/`, or repo config).

---

## 2. Which files are editable source files

| Editable source | Format | Notes |
|---|---|---|
| `src/config/products.ts` | TypeScript | Add a new product entry here (additive). |
| `src/content/books/<slug>/*.ts` | TypeScript | Landing-page copy — clone the folder for the new slug. |
| `src/pages/es/<slug>.astro` | Astro | 9-line wrapper — clone. |
| `src/lib/email.ts` | TypeScript | Already produces the Spanish delivery email for **any** `es` product automatically. |
| `public/images/books/<slug>/` | PNG | Cover + bonus images — need new/placeholder art. |
| **Book manuscript** | — | **Does not exist as editable source.** Must be reconstructed (see §3, §5). |

The **EPUB is effectively the most "editable" form of the book that exists**: it is a ZIP of 34 XHTML chapter files (`EPUB/c01.xhtml`…`c34.xhtml`) plus `nav.xhtml`, CSS, fonts, and images. Clean text extracts perfectly (verified: ~17,850 words total). This is the practical source we can adapt from.

---

## 3. Which files are final export files only

- `*.pdf`, `*.epub`, `*.azw3` book files in `blob-uploads/` are **final exports only** — there is no upstream source they were rendered from in this repo. They were produced elsewhere (the EPUB metadata shows a hand-rolled EPUB 3 structure; the AZW3 was almost certainly produced from the EPUB via Calibre/KindleGen).
- `hojas-de-referencia.pdf` is a **final export only** (no editable source for the sheets here).
- The cover/bonus PNGs are final raster art (no editable source files like `.psd`/`.fig`).

---

## 4. Can the current book content be adapted safely?

**Yes — safely and without any risk to the live product**, because:

1. The new product is **purely additive**. Every part of the pipeline is keyed by **slug → product config**:
   - Checkout reads `getProduct(slug)`; the slug travels in Flow's `optional` field.
   - The webhook fulfills from `getProduct(payment.optional.slug)`.
   - The delivery email iterates `product.files`.
   - The upload script iterates `listProducts()`.
   So a **new slug with its own `blobKey`s does not touch** the existing `el-trader-que-perdia-ganando` files, pages, or Blob objects.
2. The book prose can be **extracted from the EPUB as clean text** and rewritten into a new Markdown manuscript **in a new folder** (`book-projects/como-hacer-trading-desde-chile/manuscript/`). The original EPUB/PDF/AZW3 are never modified.
3. Content reuse is a **copy, not a move**: existing bonus PDF can be copied into the new slug folder; original stays in place.

**Constraint to respect:** the new product's Blob keys live under `books/como-hacer-trading-desde-chile/es/` — a different prefix, so `upload-files` can never overwrite the current product's Blob objects.

---

## 5. Can PDF / EPUB / AZW3 be regenerated from source?

**Not with the current toolchain — this is the main blocker.** Checked and **all of the following are MISSING** on this machine:

`pandoc`, `ebook-convert`/`calibre`, `pdftotext`, `mutool`, `wkhtmltopdf`, `weasyprint`, `prince`. No Node-based epub/pdf generator is in `node_modules` either.

What this means:
- We **can** author a clean **Markdown manuscript** (no tooling needed).
- We **can** extract the existing prose from the EPUB (works today via `unzip` + tag-strip).
- We **cannot** yet render that manuscript into a polished **PDF**, a valid **EPUB**, or a **AZW3** without installing tooling. AZW3 specifically requires **Calibre's `ebook-convert`** (or KindleGen); there is no pure-Node path to AZW3.

**To regenerate the three formats we need to install (local, reversible):**
- **Pandoc** → Markdown → EPUB, and Markdown → PDF (PDF also needs a LaTeX engine, e.g. BasicTeX, or an HTML→PDF path via `weasyprint`).
- **Calibre** (`ebook-convert`) → EPUB → AZW3 (and a clean EPUB→PDF alternative).

This is the one decision that gates Phases 3–4 (see handoff question at the end of the run).

---

## 6. Which files should be reused unchanged (copy into the new slug folder)

| Asset | Reuse? | Action |
|---|---|---|
| `hojas-de-referencia.pdf` (bonus sheets) | ✅ Reuse as-is | **Copy** to `blob-uploads/books/como-hacer-trading-desde-chile/es/hojas-de-referencia.pdf`. Content is generic risk/journaling sheets — not book-specific. |
| Delivery email engine (`email.ts`) | ✅ Reuse unchanged | Already renders the correct Spanish email for any `es` product from `product.files`. No edit needed for Phase 7 to work. |
| Checkout / webhook / download / Flow libs | ✅ Reuse unchanged | Slug-driven; new slug works with zero changes. |
| `BookPage.astro` renderer | ✅ Reuse unchanged | Generic; driven by `product` + `content`. |
| `upload-files.ts` | ✅ Reuse unchanged | Will pick up the new product automatically once it's in `products.ts`. |

> **Your assumption check:** You assumed *Guía Práctica* and *Guía de Referencia* can stay mostly the same. In this repo there is no separate "Guía Práctica"/"Guía de Referencia" file — the only bonus is **`hojas-de-referencia.pdf`**. That one **can be reused unchanged** (your assumption holds for the bonus sheets). If "Guía Práctica/Guía de Referencia" are meant to be distinct deliverables that exist outside this repo, you'll need to provide them (see §8).

---

## 7. Which files need to be rewritten / newly created

**Book content (rewrite/adapt):**
- New Markdown manuscript at `book-projects/como-hacer-trading-desde-chile/manuscript/` — restructured into the two requested Parts, with a new Chile-specific Part 1 and the retained risk/psychology material as Part 2.
- New `*.pdf`, `*.epub`, `*.azw3` exports (blocked on §5 tooling decision).

**Website/product (new, cloned from the es product):**
- `src/config/products.ts` — add `como-hacer-trading-desde-chile` entry.
- `src/content/books/como-hacer-trading-desde-chile/` — new `copy.ts`, `sections.ts`, `faq.ts`, `index.ts` with Chile-specific landing copy.
- `src/pages/es/como-hacer-trading-desde-chile.astro` — new wrapper.
- `public/images/books/como-hacer-trading-desde-chile/` — cover + bonus images (need new art or placeholders).

**Delivery email:** no rewrite required — it auto-adapts. (Heading "¡Gracias por tu compra!" + per-file buttons already match the Phase 7 spec; the only spec nuance is "Gracias por comprar '<title>'", which the current intro already conveys by injecting the title.)

---

## 8. Missing files you may need to provide

1. **Cover art** for *Cómo Hacer Trading Desde Chile* (`cover.png`). Without it I will reuse the existing cover or generate a placeholder so the build passes — flagged for replacement.
2. **Bonus preview images** (`bonus-1..4.png`) — can reuse the existing ones (the bonus sheets are unchanged), so this is optional.
3. **Confirmation on "Guía Práctica" / "Guía de Referencia":** these named deliverables do not exist in the repo. If they are real separate files you want included, please provide them; otherwise the product ships the existing **`hojas-de-referencia.pdf`** as the bonus (matching the current product).
4. **Book-generation toolchain decision** (see §5) — needed before PDF/EPUB/AZW3 can be produced.
5. **Any Chile-specific factual inputs** you want reflected accurately (specific brokers you endorse, current CLP context, etc.). To stay safe (no financial/legal/tax advice), the adaptation will keep these **descriptive and educational**, not prescriptive — but tell me if there are specifics you want included or avoided.

---

## Summary verdict

- ✅ The new product can be built **100% additively** with **zero risk** to the live Spanish product or its Blob files.
- ✅ The book prose **can be adapted** — cleanly extractable from the EPUB (~17,850 words, 34 chapters).
- ⚠️ The **three book formats cannot be regenerated** until a toolchain (Pandoc + Calibre) is installed, or you supply final files. **AZW3 in particular requires Calibre.**
- ✅ The bonus **`hojas-de-referencia.pdf` can be reused unchanged** (your assumption holds).
- ℹ️ There is **no separate Guía Práctica / Guía de Referencia** file in the repo — only the hojas de referencia bonus.
