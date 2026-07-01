import type { APIRoute } from 'astro';
import { getEnv } from '../../../lib/env';
import { runLeadDigest } from '../../../lib/lead-digest';

// Server-rendered endpoint (Vercel serverless function).
export const prerender = false;

/**
 * GET /api/cron/lead-digest
 *
 * Invoked once a day by Vercel Cron (see vercel.json). Emails a summary of the
 * last 24h of free-guide signups to the operator. Protected by CRON_SECRET:
 * Vercel attaches `Authorization: Bearer <CRON_SECRET>` to cron requests when
 * that env var is set, so we reject anything without it.
 */
export const GET: APIRoute = async ({ request }) => {
  const secret = getEnv('CRON_SECRET');
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  try {
    const result = await runLeadDigest();
    console.log('[cron/lead-digest]', result);
    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  } catch (error) {
    console.error('[cron/lead-digest] failed:', error);
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
};
