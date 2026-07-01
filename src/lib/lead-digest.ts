/**
 * Daily "new leads" digest for the free-guide funnel.
 *
 * The funnel has no database — the Resend Audience is the lead store. Once a day
 * a Vercel Cron hits /api/cron/lead-digest, which calls runLeadDigest() to pull
 * the audience's contacts, keep the ones created in the last window, and email a
 * summary to the operator. A zero-lead day sends nothing.
 */
import {
  listAudienceContacts,
  sendEmail,
  type AudienceContact
} from './email';
import { getEnv } from './env';

const DAY_MS = 86_400_000;

/** Contacts created within `windowMs` before `now`, newest first. */
export function filterRecent(
  contacts: AudienceContact[],
  now: Date,
  windowMs: number = DAY_MS
): AudienceContact[] {
  const cutoff = now.getTime() - windowMs;
  return contacts
    .filter((c) => {
      const t = Date.parse(c.createdAt);
      return Number.isFinite(t) && t >= cutoff;
    })
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface Digest {
  subject: string;
  html: string;
  text: string;
}

/** Build the digest email for a set of new leads. */
export function buildDigest(leads: AudienceContact[], windowHours: number): Digest {
  const n = leads.length;
  const subject = `${n} nuevo${n === 1 ? '' : 's'} lead${n === 1 ? '' : 's'} — Guía gratis trading Chile`;

  const rows = leads
    .map((l) => {
      const when = new Date(l.createdAt).toISOString().replace('T', ' ').slice(0, 16);
      return `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f0eeec;font-size:14px;color:#1c1917;">${escapeHtml(l.email)}</td>
          <td style="padding:8px 0 8px 16px;border-bottom:1px solid #f0eeec;font-size:13px;color:#78716c;white-space:nowrap;">${when} UTC</td>
        </tr>`;
    })
    .join('');

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#0c0a09;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0c0a09;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;">
          <tr><td style="background:#0c0a09;padding:20px 28px;">
            <span style="color:#fafaf9;font-size:13px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">The Operator Library — Leads</span>
          </td></tr>
          <tr><td style="padding:28px 28px 8px;">
            <h1 style="margin:0 0 6px;font-size:20px;color:#1c1917;">${n} nuevo${n === 1 ? '' : 's'} lead${n === 1 ? '' : 's'}</h1>
            <p style="margin:0 0 16px;font-size:13px;color:#78716c;">Guía gratis trading Chile · últimas ${windowHours} h</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
            <p style="margin:20px 0 8px;font-size:12px;color:#a8a29e;">Lista completa en Resend → Audiences → “Guía gratis trading Chile”.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = [
    `${n} nuevo${n === 1 ? '' : 's'} lead${n === 1 ? '' : 's'} — Guía gratis trading Chile (últimas ${windowHours} h)`,
    '',
    ...leads.map(
      (l) => `- ${l.email}  (${new Date(l.createdAt).toISOString().slice(0, 16).replace('T', ' ')} UTC)`
    ),
    '',
    'Lista completa en Resend → Audiences → "Guía gratis trading Chile".'
  ].join('\n');

  return { subject, html, text };
}

export interface RunDigestResult {
  total: number;
  recent: number;
  sent: boolean;
}

/**
 * Collect the audience, keep the last `windowHours` of signups, and email the
 * digest to LEAD_NOTIFICATION_EMAIL (falling back to ORDER_NOTIFICATION_EMAIL).
 * Sends nothing when there are no new leads or no recipient configured.
 */
export async function runLeadDigest(options?: {
  now?: Date;
  windowHours?: number;
}): Promise<RunDigestResult> {
  const now = options?.now ?? new Date();
  const windowHours = options?.windowHours ?? 24;

  const to =
    getEnv('LEAD_NOTIFICATION_EMAIL') ?? getEnv('ORDER_NOTIFICATION_EMAIL');

  const all = await listAudienceContacts();
  const recent = filterRecent(all, now, windowHours * 3_600_000);

  if (recent.length === 0 || !to) {
    return { total: all.length, recent: recent.length, sent: false };
  }

  const digest = buildDigest(recent, windowHours);
  await sendEmail({ to, subject: digest.subject, html: digest.html, text: digest.text });

  return { total: all.length, recent: recent.length, sent: true };
}
