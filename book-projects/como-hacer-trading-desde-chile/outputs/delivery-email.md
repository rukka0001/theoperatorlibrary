# Delivery Email — Cómo Hacer Trading Desde Chile

**Important:** the live delivery email is **generated automatically** by `src/lib/email.ts` from the product config. It is **data-driven and shared** with the existing Spanish product, so the new product already gets a correct Spanish email with **no code change** — and the existing product is not affected. This document records the copy it produces and one optional wording nuance.

---

## What the buyer receives (auto-generated)

- **Subject:** `Tu descarga: Cómo Hacer Trading Desde Chile`
- **Heading:** ¡Gracias por tu compra!
- **Intro:** Tu pago fue confirmado. Aquí están tus descargas de **Cómo Hacer Trading Desde Chile**.
- **Buttons (one per file, from product config):**
  - **Descargar PDF**
  - **Descargar EPUB**
  - **Descargar Kindle / AZW3**
  - **Descargar hojas de referencia**
- **Expiry line:** Estos enlaces son personales y vencen en N días.
- **Support line:** Si tienes algún problema con la descarga, responde a este correo o escríbenos a **support@theoperatorlibrary.com**.
- **Disclaimer:** Solo para fines educativos. No es asesoramiento financiero. No incluye alertas ni señales. El trading conlleva riesgo de pérdida de capital.

This matches the Phase 7 spec: thank-you for the purchase by title, the four download buttons, the exact support line, and an educational disclaimer.

---

## One optional wording nuance (your decision)

The Phase 7 brief's disclaimer reads:

> Solo para fines educativos. **No es asesoramiento financiero, legal ni tributario.** El trading conlleva riesgo de pérdida de capital.

The shared live email currently says:

> Solo para fines educativos. **No es asesoramiento financiero. No incluye alertas ni señales.** El trading conlleva riesgo de pérdida de capital.

The difference is "**legal ni tributario**". I did **not** change `email.ts`, because its Spanish disclaimer is **shared with the existing `el-trader-que-perdia-ganando` product**, and the brief says not to alter the existing product's flow.

If you want the exact Phase 7 disclaimer wording in the delivery email, pick one:
- **(A)** Update the shared `DOWNLOAD_COPY.es.disclaimer` in `src/lib/email.ts` — simplest, but also changes the existing Spanish product's email disclaimer (likely fine, arguably an improvement).
- **(B)** Make the email disclaimer per-product (small refactor: read it from product config) — keeps the existing product byte-for-byte identical.

Recommended: **(A)** if you're comfortable with both Spanish products sharing the stronger "financiero, legal ni tributario" disclaimer; otherwise **(B)**.

---

## Heading nuance (optional)

The brief suggested `Gracias por comprar "Cómo Hacer Trading Desde Chile"`. The live email conveys this via heading "¡Gracias por tu compra!" + an intro that injects the title in bold. If you want the title in the heading itself, that is also a shared-template change (same A/B tradeoff as above). Left unchanged to protect the existing product.
