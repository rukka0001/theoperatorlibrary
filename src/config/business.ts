/**
 * Centralized business contact emails (non-secret, public-facing).
 *
 * Single source of truth for the addresses shown across the site and used as
 * the reply-to for transactional email. These are intentionally NOT secrets —
 * they appear publicly on legal/contact pages. Each can be overridden via env
 * (CONTACT_EMAIL / SUPPORT_EMAIL) without a redeploy, but sensible defaults are
 * baked in so no env var is required.
 *
 * Note: the transactional SENDER stays in RESEND_FROM_EMAIL (see lib/email.ts);
 * the admin address (chris@) is not public and lives only in env
 * (ORDER_NOTIFICATION_EMAIL), so it is deliberately absent here.
 */
import { getEnv } from '../lib/env';

/** General/website contact address (footer, privacy page). */
export const contactEmail =
  getEnv('CONTACT_EMAIL') ?? 'hello@theoperatorlibrary.com';

/** Customer support address (delivery reply-to, help links, terms page). */
export const supportEmail =
  getEnv('SUPPORT_EMAIL') ?? 'support@theoperatorlibrary.com';
