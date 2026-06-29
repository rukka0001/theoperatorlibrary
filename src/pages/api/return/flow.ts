import type { APIRoute } from 'astro';

// Server-rendered endpoint (Vercel serverless function).
export const prerender = false;

/**
 * Flow `urlReturn` handler.
 *
 * After payment, Flow sends the buyer's BROWSER back to urlReturn via a POST
 * (form-encoded `token`). Our thank-you page is a static, GET-only page, so
 * pointing Flow straight at it returned 405 ("this page isn't working"). This
 * endpoint absorbs Flow's POST (or a plain GET) and 303-redirects the browser
 * to /gracias, which forces a clean GET to the static page.
 *
 * This is NOT order fulfillment: delivery is driven solely by the authoritative
 * server-to-server webhook (urlConfirmation → payment/getStatus). We never trust
 * this browser redirect, so we don't read or verify the token here.
 */
const redirectToGracias: APIRoute = ({ redirect }) => redirect('/gracias', 303);

export const POST = redirectToGracias;
export const GET = redirectToGracias;
