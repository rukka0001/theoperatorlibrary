import type { APIRoute } from 'astro';
import { getEnv } from '../../lib/env';
import { getProduct } from '../../config/products';
import {
  createDownloadToken,
  getDownloadTtlDays
} from '../../lib/download-token';
import { sendDownloadEmail } from '../../lib/email';

// Server-rendered endpoint (Vercel serverless function).
export const prerender = false;

/**
 * GET /api/test-delivery?key=<secret>&to=<address>&slug=<product-slug>
 *
 * TEMPORARY manual test of the post-purchase delivery flow WITHOUT a Flow
 * payment. It mints a REAL signed download token (createDownloadToken) and
 * sends the REAL delivery email (sendDownloadEmail) — the exact same code the
 * Flow webhook runs on a paid order. The four download buttons therefore use
 * the production token system and stream from private Vercel Blob.
 *
 * SAFETY:
 *  - Disabled by default. Works only when TEST_SECRET is set in the
 *    environment AND the request passes ?key= matching it. Without that env
 *    var the route 404s, so it can never be used as an open relay.
 *  - Never echoes secrets back in the response or logs.
 *
 * REMOVE THIS FILE (and unset TEST_SECRET) once delivery is verified.
 */
export const GET: APIRoute = async ({ request }) => {
  const expectedKey = getEnv('TEST_SECRET');

  // Off unless explicitly enabled via env. 404 to avoid advertising it.
  if (!expectedKey) {
    return new Response('Not found', { status: 404 });
  }

  const url = new URL(request.url);
  const providedKey = url.searchParams.get('key');
  if (providedKey !== expectedKey) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Default recipient to the verified sender mailbox (always owned/safe).
  const to = url.searchParams.get('to') || getEnv('RESEND_FROM_EMAIL');
  if (!to) {
    return json(
      { ok: false, error: 'No recipient: pass ?to= or set RESEND_FROM_EMAIL' },
      400
    );
  }

  const slug = url.searchParams.get('slug') || 'el-trader-que-perdia-ganando';
  const product = getProduct(slug);
  if (!product) {
    return json({ ok: false, error: `Unknown product slug: ${slug}` }, 404);
  }

  try {
    // Real signed token — identical to what the Flow webhook mints.
    const downloadToken = await createDownloadToken({
      slug: product.slug,
      email: to as string
    });

    const siteUrl = getEnv('PUBLIC_SITE_URL') ?? new URL(request.url).origin;
    const downloadUrl = `${siteUrl}/api/download?token=${downloadToken}`;

    await sendDownloadEmail({
      to: to as string,
      product,
      downloadUrl,
      ttlDays: getDownloadTtlDays()
    });

    return json({ ok: true, to, slug: product.slug, files: product.files.length });
  } catch (error) {
    // Generic message to the client; details go to server logs only.
    console.error('[test-delivery] send failed:', error);
    return json({ ok: false, error: 'Send failed — check server logs.' }, 502);
  }
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}
