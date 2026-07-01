/**
 * Send the full 5-email lead-nurture sequence IMMEDIATELY to a test inbox, for
 * manual QA. Unlike a real opt-in, this:
 *   - sends all 5 emails now (no Day 1/3/5/6 scheduling),
 *   - prefixes every subject with "[TEST]",
 *   - does NOT add the recipient to any Resend Audience (no permanent subscribe),
 *   - mints a REAL signed guide link so Email 1's download button is live.
 *
 * Usage:
 *   npm run send:test-lead-emails
 *   LEAD_TEST_TO=you@example.com npm run send:test-lead-emails
 *
 * Requires RESEND_API_KEY, RESEND_FROM_EMAIL, LEAD_MAGNET_TOKEN_SECRET (loaded
 * from .env by the npm script).
 *
 * Link targets (override with env):
 *   - Paid-book CTA links → PUBLIC_SITE_URL or https://theoperatorlibrary.com
 *     (the product page is already live in production).
 *   - Guide download link → LEAD_TEST_GUIDE_BASE or http://localhost:4321
 *     (the lead endpoints aren't deployed yet; the local dev server serves them,
 *     and the guide PDF must be uploaded to Blob for the bytes to stream).
 */
import { getEnv, requireEnv } from '../src/lib/env.ts';
import { getLeadMagnet } from '../src/config/lead-magnets.ts';
import { getProduct } from '../src/config/products.ts';
import {
  createLeadMagnetToken,
  getLeadMagnetTtlDays
} from '../src/lib/lead-magnet-token.ts';
import {
  buildNurtureSequence,
  type NurtureContext
} from '../src/lib/lead-emails.ts';
import { sendEmail } from '../src/lib/email.ts';

const TO = getEnv('LEAD_TEST_TO') ?? 'chris@theoperatorlibrary.com';
const PRODUCT_BASE = getEnv('PUBLIC_SITE_URL') ?? 'https://theoperatorlibrary.com';
const GUIDE_BASE = getEnv('LEAD_TEST_GUIDE_BASE') ?? 'http://localhost:4321';
const MAGNET_SLUG = 'como-empezar-trading-desde-chile';
// --dry-run builds + renders + signs everything but sends nothing (safe QA).
const DRY_RUN = process.argv.includes('--dry-run');

async function main(): Promise<void> {
  requireEnv('RESEND_API_KEY');
  requireEnv('RESEND_FROM_EMAIL');

  const magnet = getLeadMagnet(MAGNET_SLUG);
  if (!magnet) throw new Error(`Unknown lead magnet: ${MAGNET_SLUG}`);
  const product = getProduct(magnet.productSlug);
  if (!product) throw new Error(`Unknown product: ${magnet.productSlug}`);

  const token = await createLeadMagnetToken({ magnet: magnet.slug, email: TO });
  const guideDownloadUrl = `${GUIDE_BASE}/api/leads/download?token=${token}`;

  const ctx: NurtureContext = {
    siteUrl: PRODUCT_BASE,
    guideDownloadUrl,
    product,
    magnet
  };
  const sequence = buildNurtureSequence(ctx, getLeadMagnetTtlDays());

  console.log(`Sending ${sequence.length} test emails to ${TO}`);
  console.log(`  book CTA base:   ${PRODUCT_BASE}`);
  console.log(`  guide link base: ${GUIDE_BASE}\n`);

  for (const [i, mail] of sequence.entries()) {
    if (DRY_RUN) {
      const bytes = Buffer.byteLength(mail.html, 'utf8');
      console.log(
        `  • #${i + 1} ${mail.key}\n      subject: [TEST] ${mail.subject}\n      html ok: ${bytes} bytes`
      );
      continue;
    }
    const id = await sendEmail({
      to: TO,
      subject: `[TEST] ${mail.subject}`,
      html: mail.html,
      text: mail.text
    });
    console.log(`  ✓ #${i + 1} ${mail.key} → ${TO} (resend id ${id})`);
  }

  console.log(
    DRY_RUN
      ? `\nDry run OK. Guide link: ${guideDownloadUrl}\nNothing sent. Run without --dry-run to send.`
      : '\nDone. All 5 sent immediately. Recipient was NOT added to any audience (test mode).'
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
