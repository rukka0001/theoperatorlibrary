# Testing Checklist — Cómo Hacer Trading Desde Chile

Exact steps to verify the new product end-to-end **without breaking the existing Spanish product or the English Lemon Squeezy product.** Items marked ✅ were already run and passed during the build; the rest require your live keys/services.

---

## 1. Build passes locally
```bash
npm test          # ✅ 9/9 passed (incl. products.test.ts)
npm run build     # ✅ Complete — all routes prerendered, no errors
```
Confirm the build output lists:
- `/es/como-hacer-trading-desde-chile/index.html` ✅
- `/es/el-trader-que-perdia-ganando/index.html` (unchanged) ✅
- `/en/day-trading-from-inside-the-problem/index.html` (unchanged) ✅

## 2. New landing page renders locally
```bash
npm run dev        # or: astro dev --background
```
- Open `http://localhost:4321/es/como-hacer-trading-desde-chile`
- Verify: hero hook "¿Quieres hacer trading desde Chile…", the two Parts, "Lo que recibes", bonos, "Para quién es / NO es", FAQ, disclaimer, CTA, and the cover image render.
- ✅ Static check already done: page is ~40 KB with title + Chile copy present.

## 3. Current Spanish product still renders
- Open `http://localhost:4321/es/el-trader-que-perdia-ganando`
- Verify it is unchanged (title "El Trader Que Perdía Ganando" present). ✅ verified in build output.

## 4. English Lemon Squeezy product still renders
- Open `http://localhost:4321/en/day-trading-from-inside-the-problem`
- Verify unchanged. ✅ verified in build output. No LS logic was touched.

## 5. New product config is valid
```bash
npm test          # products.test.ts ✅
```
- `getProduct('como-hacer-trading-desde-chile')` returns the product with 4 files, provider `flow`, currency `CLP`.

## 6. New product files exist locally
```bash
ls -la blob-uploads/books/como-hacer-trading-desde-chile/es/
```
Expect 4 files ✅:
- `como-hacer-trading-desde-chile.pdf`  (45 pages)
- `como-hacer-trading-desde-chile.epub`
- `como-hacer-trading-desde-chile.azw3` (Mobipocket KF8)
- `hojas-de-referencia.pdf`             (copied from existing product, 4 pages)

## 7. Upload uploads the new files
```bash
npm run upload-files -- --dry-run   # ✅ lists all 4 new files, 0 missing
npm run upload-files                # ← RUN THIS to actually upload (needs BLOB_READ_WRITE_TOKEN)
```
- The new files go to blob keys under `books/como-hacer-trading-desde-chile/es/` — a **different prefix** from the existing product, so existing Blob objects are never overwritten.

## 8. Flow checkout creates a payment for the new slug
- On the new landing page, enter a test email and submit the buy form.
- `POST /api/checkout/flow` reads `getProduct('como-hacer-trading-desde-chile')`, creates a Flow payment for CLP 14.990, and redirects to Flow's hosted page.
- The slug travels in Flow's `optional` field — no code change was needed (slug-driven).

## 9. Flow webhook fulfills the new product
- Complete a sandbox/test payment.
- `POST /api/webhooks/flow` calls `getPaymentStatus`, maps `optional.slug` → product, and fulfills. Verify a 200 and the log line `fulfilled paid order … product: como-hacer-trading-desde-chile`.

## 10. Buyer delivery email arrives
- After fulfillment, the buyer receives the Spanish delivery email (Resend), subject **"Tu descarga: Cómo Hacer Trading Desde Chile"**, heading "¡Gracias por tu compra!", with the product title injected. (Email is data-driven from `product.files`; no change needed.)

## 11. All four download links work
- The email contains 4 buttons: **Descargar PDF · Descargar EPUB · Descargar Kindle / AZW3 · Descargar hojas de referencia**.
- Each goes through `/api/download?token=…&file=<id>`; verify each downloads the correct file with the right filename and content type.

## 12. Admin notification email arrives
- If `ORDER_NOTIFICATION_EMAIL` is set, an internal "New sale: Cómo Hacer Trading Desde Chile" email arrives (no links/secrets). Failure here never blocks buyer delivery.

## 13. Current product still works end-to-end
- Repeat steps 8–12 for `el-trader-que-perdia-ganando` to confirm the existing Flow flow is untouched.

---

## Charts quality check

The book embeds **8 distinct annotated charts** (reused from the original product, originals untouched), referenced **11×** across 7 chapters.

- **Which charts were included** ✅: `ch15_cycn`, `ch15_amci`, `ch15_smx`, `ch15_ser` (the four worst-trade "blowup" charts, high-res), `ch11_obai` (the setup), `ch12_cers` (VWAP / backside fade), `ch12_ezgo` (low-float pop-and-fade), `ch12_allo` (the long-side mistake). Placed in: Cap. 12 (ganar y aun así perder), Cap. 14 (peores operaciones ×4), Cap. 15 (small caps/float/catalizadores), Cap. 16 (short vs long), Cap. 17 (setup + VWAP), Cap. 19 (stop loss), Cap. 20 (premarket/daily loss).
- **Appear in the PDF** ✅: verified visually (e.g., p.55 CYCN) — chart + Spanish caption + "Qué observar" sit together, no orphaning.
- **Embedded in EPUB** ✅: `EPUB/media/file1.png … file8.png` (8 charts + cover).
- **Carried to AZW3** ✅: 9 PNGs inside the AZW3 (8 charts + cover).
- **Caption + close to text** ✅: every chart has a Spanish caption and a "Qué observar" note, placed immediately after the paragraph that discusses it. A one-time `::: note` in Cap. 14 explains the English on-screen labels (SHORT/COVER/ADD/NEXT-DAY).
- **Known limitation:** the chart images carry the original **English on-screen annotations** baked in (platform UI, title lines). They were reused as-is per instruction (don't invent new charts); the Spanish captions + key note address readability. To fully localize, the charts would need to be re-rendered from source data — report-only, not done.

Quick re-verify commands:
```bash
# PDF pages with charts
pdftotext blob-uploads/books/como-hacer-trading-desde-chile/es/como-hacer-trading-desde-chile.pdf - | grep -c "Qué observar"   # -> 11
# EPUB embedded chart images
unzip -l blob-uploads/books/como-hacer-trading-desde-chile/es/como-hacer-trading-desde-chile.epub | grep -c "media/file[1-8].png"  # -> 8
```

## Regression safety notes
- **Additive only:** new product = new config entry + new content folder + new page + new blob prefix. No existing file's behavior changed.
- **Shared infra untouched:** `email.ts`, `flow.ts`, checkout, webhook, download, and `upload-files.ts` are slug/config-driven and were not modified.
- **Pre-existing quirk (not introduced here):** `src/pages/es/index.astro` lists *all* products via `listProducts()` and links each to `/es/<slug>`, including the English product (`/es/day-trading-from-inside-the-problem`, which 404s). This predates this work; the new Chile product links correctly to an existing page. Fix separately if desired.
