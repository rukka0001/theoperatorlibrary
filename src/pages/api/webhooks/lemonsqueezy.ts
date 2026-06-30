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
