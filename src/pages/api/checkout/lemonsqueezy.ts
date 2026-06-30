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
