import type { APIRoute } from 'astro';
import { getEnv } from '../../../lib/env';
import { getLeadMagnet } from '../../../config/lead-magnets';
import { subscribeLead, isValidEmail } from '../../../lib/leads';

// Server-rendered endpoint (Vercel serverless function).
export const prerender = false;

/**
 * POST /api/leads/subscribe
 *
 * Opt-in handler for the free-guide funnel. Accepts a form post with the
 * subscriber `email` and the `magnet` slug, delivers the guide immediately and
 * schedules the nurture sequence (see lib/leads.ts). No order/DB is persisted.
 *
 * On success the browser is redirected to a "check your inbox" page; on a bad
 * email or a delivery failure it goes back to the opt-in page with an error
 * flag so the user can retry.
 */
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData().catch(() => null);
  const email = form?.get('email')?.toString().trim() ?? '';
  const magnetSlug =
    form?.get('magnet')?.toString().trim() ||
    'como-empezar-trading-desde-chile';

  const optInPath = '/es/guia-gratis-trading-chile';

  // Validate before doing any work so a bad email bounces straight back.
  if (!isValidEmail(email) || !getLeadMagnet(magnetSlug)) {
    return redirect(`${optInPath}?error=email`, 303);
  }

  try {
    const siteUrl = getEnv('PUBLIC_SITE_URL') ?? new URL(request.url).origin;
    const result = await subscribeLead({ email, magnetSlug, siteUrl });
    console.log('[leads/subscribe] delivered guide + scheduled nurture', {
      magnet: result.magnet.slug,
      scheduled: result.scheduled,
      audienceAdded: result.audienceAdded
    });
    return redirect('/es/guia-enviada', 303);
  } catch (error) {
    console.error('[leads/subscribe] failed:', error);
    return redirect(`${optInPath}?error=1`, 303);
  }
};
