/**
 * Lead-capture orchestration for the free-guide funnel.
 *
 * On opt-in we, in order:
 *   1. mint a signed, expiring link to the guide PDF,
 *   2. send the delivery email immediately (critical — throws on failure),
 *   3. add the subscriber to the Resend Audience (best-effort),
 *   4. fan out the rest of the nurture sequence with Resend `scheduledAt`
 *      (best-effort), so no cron/database is needed to drip emails.
 *
 * Steps 3–4 are best-effort: a failure there is logged but never blocks the
 * subscriber from getting their guide.
 */
import { getLeadMagnet, type LeadMagnet } from '../config/lead-magnets';
import { getProduct } from '../config/products';
import {
  createLeadMagnetToken,
  getLeadMagnetTtlDays
} from './lead-magnet-token';
import { addAudienceContact, sendEmail } from './email';
import { buildNurtureSequence, type NurtureContext } from './lead-emails';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

/**
 * Days-from-signup for the four scheduled follow-ups (nurture emails #2–#5).
 * Email #1 is sent immediately (offset 0) and is not in this list.
 *
 * Email #3 (day 3) introduces the launch offer; email #5 lands on day 6 as a
 * soft last-call. All within Resend's 30-day scheduling window.
 */
export const NURTURE_OFFSET_DAYS = [1, 3, 5, 6] as const;

const DAY_MS = 86_400_000;

/** ISO timestamps for the scheduled follow-ups, relative to `now`. */
export function nurtureSendTimes(now: Date): string[] {
  return NURTURE_OFFSET_DAYS.map((days) =>
    new Date(now.getTime() + days * DAY_MS).toISOString()
  );
}

export interface SubscribeInput {
  email: string;
  /** Lead-magnet slug from the opt-in form. */
  magnetSlug: string;
  /** Absolute site origin for building links. */
  siteUrl: string;
  /** Injectable clock, for tests. Defaults to now. */
  now?: Date;
}

export interface SubscribeResult {
  magnet: LeadMagnet;
  scheduled: number;
  audienceAdded: boolean;
}

/**
 * Run the full opt-in flow. Throws if the email is invalid, the magnet/product
 * is unknown, or the immediate delivery email fails (so the endpoint can return
 * a non-2xx and the user can retry). Best-effort steps never throw.
 */
export async function subscribeLead(
  input: SubscribeInput
): Promise<SubscribeResult> {
  const email = input.email.trim();
  if (!isValidEmail(email)) {
    throw new Error('invalid_email');
  }

  const magnet = getLeadMagnet(input.magnetSlug);
  if (!magnet) {
    throw new Error('unknown_magnet');
  }

  const product = getProduct(magnet.productSlug);
  if (!product) {
    // Misconfiguration: the magnet points at a product that doesn't exist.
    throw new Error('unknown_product');
  }

  const now = input.now ?? new Date();

  // 1. Signed, expiring link to the guide.
  const token = await createLeadMagnetToken({ magnet: magnet.slug, email });
  const guideDownloadUrl = `${input.siteUrl}/api/leads/download?token=${token}`;

  const ctx: NurtureContext = {
    siteUrl: input.siteUrl,
    guideDownloadUrl,
    product,
    magnet
  };
  const sequence = buildNurtureSequence(ctx, getLeadMagnetTtlDays());
  const [deliveryEmail, ...followUps] = sequence;

  // 2. Deliver the guide now. Critical: let failures propagate.
  await sendEmail({
    to: email,
    subject: deliveryEmail.subject,
    html: deliveryEmail.html,
    text: deliveryEmail.text
  });

  // 3. Add to the marketing list (best-effort).
  let audienceAdded = false;
  try {
    await addAudienceContact(email);
    audienceAdded = true;
  } catch (error) {
    console.error('[leads] failed to add contact to audience:', error);
  }

  // 4. Schedule the follow-ups (best-effort, one failure doesn't stop others).
  const sendTimes = nurtureSendTimes(now);
  let scheduled = 0;
  await Promise.all(
    followUps.map(async (mail, i) => {
      try {
        await sendEmail({
          to: email,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          scheduledAt: sendTimes[i]
        });
        scheduled++;
      } catch (error) {
        console.error(
          `[leads] failed to schedule nurture email ${mail.key}:`,
          error
        );
      }
    })
  );

  return { magnet, scheduled, audienceAdded };
}
