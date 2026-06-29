import type { APIRoute } from 'astro';
import crypto from 'node:crypto';
import { getProduct } from '../../../config/products';
import { getEnv } from '../../../lib/env';
import { createPayment } from '../../../lib/flow';

// Server-rendered endpoint (Vercel serverless function).
export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/checkout/flow
 *
 * Creates a Flow payment for a product and redirects the buyer to Flow's
 * hosted payment page.
 *
 * No order is persisted (no database): the product slug travels in Flow's
 * `optional` field and the buyer email is the Flow payer, so the webhook can
 * fulfill the order from the authoritative getStatus response alone.
 */
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData().catch(() => null);
  const slug = form?.get('slug')?.toString().trim() ?? '';
  const email = form?.get('email')?.toString().trim() ?? '';

  const product = getProduct(slug);
  if (!product || !EMAIL_RE.test(email)) {
    return redirect('/error-pago', 303);
  }

  try {
    const siteUrl = getEnv('PUBLIC_SITE_URL') ?? new URL(request.url).origin;

    // Unique, short, opaque order id (Flow caps commerceOrder length).
    const commerceOrder = `TOL-${Date.now().toString(36)}-${crypto
      .randomUUID()
      .slice(0, 8)}`;

    const payment = await createPayment({
      commerceOrder,
      subject: product.title,
      amount: product.priceCLP,
      email,
      urlConfirmation: `${siteUrl}/api/webhooks/flow`,
      // Flow POSTs the buyer's browser back to urlReturn; /gracias is static
      // (GET-only) so we route through an endpoint that redirects to it.
      urlReturn: `${siteUrl}/api/return/flow`,
      optional: { slug: product.slug }
    });

    return redirect(payment.redirectUrl, 303);
  } catch (error) {
    console.error('[checkout/flow] failed to create payment:', error);
    return redirect('/error-pago', 303);
  }
};
