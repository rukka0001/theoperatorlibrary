import type { APIRoute } from 'astro';
import { getProduct } from '../../../config/products';
import { getEnv } from '../../../lib/env';
import { getPaymentStatus, FLOW_STATUS } from '../../../lib/flow';
import {
  createDownloadToken,
  getDownloadTtlDays
} from '../../../lib/download-token';
import { sendDownloadEmail } from '../../../lib/email';

// Server-rendered endpoint (Vercel serverless function).
export const prerender = false;

/**
 * POST /api/webhooks/flow
 *
 * Server-to-server confirmation callback from Flow (urlConfirmation). Flow
 * sends a `token`; we call payment/getStatus to get the AUTHORITATIVE state
 * (never trust the callback body alone — getStatus is signed by us and
 * validated by Flow).
 *
 * On a paid order we mint a signed download link and email it to the buyer
 * via Resend.
 *
 * Idempotency: Flow may call this URL more than once for the same order (and
 * the buyer's browser return can race the server callback). We remember the
 * commerceOrders we've already fulfilled in this process so a duplicate
 * confirmation during the SAME runtime won't send a second email.
 *
 * TODO(durable-idempotency): this guard is per-process only. Vercel serverless
 * instances are ephemeral and not shared, so a retry that lands on a cold/other
 * instance can still double-send. Replace `fulfilledOrders` with a durable,
 * atomic "claim" in a DB/KV (e.g. Vercel KV / Postgres) keyed by commerceOrder
 * — insert-if-absent before sending, so exactly one caller ever delivers.
 */
const fulfilledOrders = new Set<string>();

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData().catch(() => null);
  const token = form?.get('token')?.toString();

  if (!token) {
    return new Response('Missing token', { status: 400 });
  }

  try {
    const payment = await getPaymentStatus(token);

    if (payment.status !== FLOW_STATUS.PAID) {
      console.log(
        `[webhooks/flow] order ${payment.commerceOrder} not paid (status ${payment.status})`
      );
      return new Response('OK', { status: 200 });
    }

    const slug = payment.optional?.slug;
    const product = slug ? getProduct(slug) : undefined;
    const email = payment.payer;

    if (!product || !email) {
      // Paid but we can't map it back — log loudly, but don't make Flow retry
      // forever for something that won't resolve.
      console.error(
        `[webhooks/flow] paid order ${payment.commerceOrder} missing product/email`,
        { slug, email }
      );
      return new Response('OK', { status: 200 });
    }

    // Best-effort idempotency: skip if we've already delivered this order in
    // this process. Claim the order BEFORE sending so two near-simultaneous
    // confirmations in the same runtime can't both pass the check.
    if (fulfilledOrders.has(payment.commerceOrder)) {
      console.log(
        `[webhooks/flow] order ${payment.commerceOrder} already fulfilled this runtime — skipping resend`
      );
      return new Response('OK', { status: 200 });
    }
    fulfilledOrders.add(payment.commerceOrder);

    const downloadToken = await createDownloadToken({
      slug: product.slug,
      email
    });
    const siteUrl = getEnv('PUBLIC_SITE_URL') ?? new URL(request.url).origin;
    const downloadUrl = `${siteUrl}/api/download?token=${downloadToken}`;

    try {
      await sendDownloadEmail({
        to: email,
        product,
        downloadUrl,
        ttlDays: getDownloadTtlDays()
      });
    } catch (sendError) {
      // Delivery failed — release the claim so a Flow retry (we return 500
      // below) can attempt to deliver again instead of silently skipping.
      fulfilledOrders.delete(payment.commerceOrder);
      throw sendError;
    }

    console.log('[webhooks/flow] fulfilled paid order', {
      commerceOrder: payment.commerceOrder,
      product: product.slug,
      email
    });

    return new Response('OK', { status: 200 });
  } catch (error) {
    // Transient failure (e.g. getStatus network error): return 500 so Flow
    // retries the confirmation later.
    console.error('[webhooks/flow] error processing confirmation:', error);
    return new Response('Error', { status: 500 });
  }
};
