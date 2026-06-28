import type { APIRoute } from 'astro';
import { getProduct } from '../../../config/products';
import { getEnv } from '../../../lib/env';
import { getPaymentStatus, FLOW_STATUS } from '../../../lib/flow';
import {
  createDownloadToken,
  getDownloadTtlHours
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
 * Idempotency: Flow may call more than once for the same order. Minting a
 * download token is idempotent; a retry may send a duplicate email, which is
 * acceptable for delivery reliability.
 */
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

    const downloadToken = await createDownloadToken({
      slug: product.slug,
      email
    });
    const siteUrl = getEnv('PUBLIC_SITE_URL') ?? new URL(request.url).origin;
    const downloadUrl = `${siteUrl}/api/download?token=${downloadToken}`;

    await sendDownloadEmail({
      to: email,
      product,
      downloadUrl,
      ttlHours: getDownloadTtlHours()
    });

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
