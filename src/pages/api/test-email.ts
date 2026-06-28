import type { APIRoute } from 'astro';
import { getEnv } from '../../lib/env';
import { sendEmail } from '../../lib/email';

// Server-rendered endpoint (Vercel serverless function).
export const prerender = false;

/**
 * GET /api/test-email?key=<secret>&to=<address>
 *
 * Manual smoke test for the Resend wiring. Sends a small plaintext+HTML email
 * from RESEND_FROM_EMAIL so you can confirm the API key, verified domain, and
 * sender are all working end-to-end — without going through the full Flow
 * purchase flow.
 *
 * SAFETY:
 *  - Disabled by default. It only works when TEST_EMAIL_KEY is set in the
 *    environment, and the request must pass ?key= matching it. Without that
 *    env var the route 404s, so it can never be used as an open email relay.
 *  - Never echoes secrets back in the response or logs.
 */
export const GET: APIRoute = async ({ request }) => {
  const expectedKey = getEnv('TEST_EMAIL_KEY');

  // Off unless explicitly enabled via env. Return 404 to avoid advertising it.
  if (!expectedKey) {
    return new Response('Not found', { status: 404 });
  }

  const url = new URL(request.url);
  const providedKey = url.searchParams.get('key');

  // Constant-ish comparison is overkill here, but avoid leaking via timing of
  // length and never reveal the expected value.
  if (providedKey !== expectedKey) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Default to the verified sender address (always a safe, owned mailbox).
  const to = url.searchParams.get('to') || getEnv('RESEND_FROM_EMAIL');
  if (!to) {
    return json({ ok: false, error: 'No recipient: pass ?to= or set RESEND_FROM_EMAIL' }, 400);
  }

  try {
    const id = await sendEmail({
      to,
      subject: 'Test email — The Operator Library',
      text: 'This is a test email confirming Resend is wired correctly.',
      html: '<p>This is a <strong>test email</strong> confirming Resend is wired correctly.</p>'
    });

    return json({ ok: true, id, to });
  } catch (error) {
    // Surface a generic message to the client; log details server-side only.
    console.error('[test-email] send failed:', error);
    return json({ ok: false, error: 'Send failed — check server logs.' }, 502);
  }
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}
