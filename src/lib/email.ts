/**
 * Transactional email via Resend (https://resend.com).
 *
 * Used to deliver the download links after a confirmed Flow payment. The Resend
 * client is created lazily so importing this module never throws when the API
 * key is absent (e.g. during build).
 */
import { Resend } from 'resend';
import { requireEnv, getEnv } from './env';
import { supportEmail } from '../config/business';
import type { Product } from '../config/products';

let client: Resend | null = null;

function getClient(): Resend {
  if (!client) {
    client = new Resend(requireEnv('RESEND_API_KEY'));
  }
  return client;
}

export interface SendEmailInput {
  /** Recipient address (or addresses). */
  to: string | string[];
  subject: string;
  html: string;
  /** Optional plaintext alternative (recommended for deliverability). */
  text?: string;
  /** Override the default sender. Defaults to RESEND_FROM_EMAIL. */
  from?: string;
  /** Optional reply-to address. */
  replyTo?: string;
  /**
   * Optional ISO 8601 timestamp (or Resend natural-language string) to schedule
   * the send for later. Used by the lead nurture sequence to fan out follow-ups
   * at signup time. Resend allows scheduling up to 30 days ahead. Omit to send
   * immediately.
   */
  scheduledAt?: string;
}

/**
 * Reusable transactional email sender. Uses RESEND_FROM_EMAIL as the sender
 * unless overridden. Throws on failure so callers can react (retry, 500, etc.).
 *
 * Returns the Resend message id on success.
 */
export async function sendEmail(input: SendEmailInput): Promise<string> {
  const from = input.from ?? requireEnv('RESEND_FROM_EMAIL');

  const { data, error } = await getClient().emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
    ...(input.scheduledAt ? { scheduledAt: input.scheduledAt } : {})
  });

  if (error) {
    throw new Error(
      `Resend failed to send to ${Array.isArray(input.to) ? input.to.join(', ') : input.to}: ${error.message}`
    );
  }

  return data?.id ?? '';
}

/**
 * Add a subscriber to the Resend Audience (the marketing list), if one is
 * configured. Best-effort by design: if RESEND_AUDIENCE_ID is unset we skip
 * silently so lead capture still works (the guide is still delivered). Throws
 * only on an actual Resend API error, which the caller may choose to swallow.
 */
export async function addAudienceContact(email: string): Promise<void> {
  const audienceId = getEnv('RESEND_AUDIENCE_ID');
  if (!audienceId) return;

  const { error } = await getClient().contacts.create({
    audienceId,
    email,
    unsubscribed: false
  });
  if (error) {
    throw new Error(`Resend failed to add contact ${email}: ${error.message}`);
  }
}

export interface DownloadEmailInput {
  to: string;
  product: Product;
  /** Base signed link to /api/download (token only); a `file` id is appended per file. */
  downloadUrl: string;
  /** How long the link is valid, in days (for the copy). */
  ttlDays: number;
}

// ---------------------------------------------------------------------------
// Language copy bundles
// ---------------------------------------------------------------------------

type Locale = 'es' | 'en';

interface DownloadCopy {
  htmlLang: string;
  subject: (title: string) => string;
  heading: string;
  intro: (title: string) => string; // returns HTML (title injected, pre-escaped by caller)
  filesLabel: string;
  expiry: (days: number) => string;
  support: (email: string) => string; // HTML
  supportText: (email: string) => string;
  disclaimer: string;
  thanksText: string;
  paidText: (title: string) => string;
  expiryText: (days: number) => string;
}

const DOWNLOAD_COPY: Record<Locale, DownloadCopy> = {
  es: {
    htmlLang: 'es',
    subject: (t) => `Tu descarga: ${t}`,
    heading: '¡Gracias por tu compra!',
    intro: (t) =>
      `Tu pago fue confirmado. Aquí están tus descargas de <strong>${t}</strong>.`,
    filesLabel: 'Tus archivos',
    expiry: (d) => `Estos enlaces son personales y vencen en ${d} días.`,
    support: (e) =>
      `Si tienes algún problema con la descarga, responde a este correo o escríbenos a <a href="mailto:${e}" style="color:#b45309;text-decoration:underline;">${e}</a>.`,
    supportText: (e) =>
      `Si tienes algún problema con la descarga, responde a este correo o escríbenos a ${e}.`,
    disclaimer:
      'Solo para fines educativos. No es asesoramiento financiero. No incluye alertas ni señales. El trading conlleva riesgo de pérdida de capital.',
    thanksText: '¡Gracias por tu compra!',
    paidText: (t) =>
      `Tu pago fue confirmado. Aquí están tus descargas de "${t}".`,
    expiryText: (d) => `(Estos enlaces son personales y vencen en ${d} días.)`
  },
  en: {
    htmlLang: 'en',
    subject: (t) => `Your download: ${t}`,
    heading: 'Thank you for your purchase!',
    intro: (t) =>
      `Your payment is confirmed. Here are your downloads for <strong>${t}</strong>.`,
    filesLabel: 'Your files',
    expiry: (d) => `These links are personal and expire in ${d} days.`,
    support: (e) =>
      `If you have any trouble downloading, reply to this email or write to us at <a href="mailto:${e}" style="color:#b45309;text-decoration:underline;">${e}</a>.`,
    supportText: (e) =>
      `If you have any trouble downloading, reply to this email or write to us at ${e}.`,
    disclaimer:
      'For educational purposes only. Not financial advice. Does not include alerts or signals. Trading carries the risk of capital loss.',
    thanksText: 'Thank you for your purchase!',
    paidText: (t) => `Your payment is confirmed. Here are your downloads for "${t}".`,
    expiryText: (d) => `(These links are personal and expire in ${d} days.)`
  }
};

function copyFor(language: string): DownloadCopy {
  return DOWNLOAD_COPY[(language as Locale)] ?? DOWNLOAD_COPY.es;
}

// ---------------------------------------------------------------------------
// Download email
// ---------------------------------------------------------------------------

/** Build the per-file download URL from the base (token) URL. */
function fileUrl(baseUrl: string, fileId: string): string {
  const sep = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${sep}file=${encodeURIComponent(fileId)}`;
}

/**
 * Send the post-purchase download email. Throws on failure so the caller (the
 * Flow webhook) can return a non-200 and let Flow retry delivery.
 */
export async function sendDownloadEmail(
  input: DownloadEmailInput
): Promise<void> {
  const { to, product } = input;
  const c = copyFor(product.language);

  await sendEmail({
    to,
    subject: c.subject(product.title),
    html: renderHtml(input, c),
    text: renderText(input, c),
    // Replies (download problems, support) go to the support inbox, not the
    // no-reply delivery sender.
    replyTo: supportEmail
  });
}

// ---------------------------------------------------------------------------
// Order notification email (provider-neutral)
// ---------------------------------------------------------------------------

export interface OrderNotificationInput {
  /** Internal recipient (ORDER_NOTIFICATION_EMAIL). */
  to: string;
  /** Purchased product. */
  product: Product;
  /** Buyer email. */
  buyerEmail: string;
  /** Amount paid, already formatted as a string (e.g. "18.99" or "14990"). */
  amount: string;
  /** Currency code (e.g. CLP). */
  currency: string;
  /** Provider order reference (Flow commerceOrder or LS order id). */
  orderRef: string;
  /** Human status label, e.g. "PAID". */
  statusLabel: string;
  /** When the sale was processed. */
  date: Date;
}

/**
 * Send the INTERNAL order notification (sale alert) to ourselves after the
 * buyer's delivery email has gone out. Intentionally contains NO download links
 * or secrets — just the facts of the sale. Throws on failure; the caller must
 * swallow the error so it never blocks fulfillment.
 */
export async function sendOrderNotificationEmail(
  input: OrderNotificationInput
): Promise<void> {
  await sendEmail({
    to: input.to,
    subject: `New sale: ${input.product.title}`,
    html: renderOrderNotificationHtml(input),
    text: renderOrderNotificationText(input)
  });
}

function renderOrderNotificationText(input: OrderNotificationInput): string {
  return [
    `New sale confirmed.`,
    ``,
    `Product: ${input.product.title}`,
    `Buyer: ${input.buyerEmail}`,
    `Amount: ${input.amount} ${input.currency}`,
    `Currency: ${input.currency}`,
    `Order ref: ${input.orderRef}`,
    `Status: ${input.statusLabel}`,
    `Date/time: ${input.date.toISOString()}`,
    ``,
    `The delivery email was sent to the buyer successfully.`
  ].join('\n');
}

function renderOrderNotificationHtml(input: OrderNotificationInput): string {
  const row = (label: string, value: string) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f0eeec;font-size:13px;color:#78716c;white-space:nowrap;">${escapeHtml(label)}</td>
          <td style="padding:8px 0 8px 16px;border-bottom:1px solid #f0eeec;font-size:14px;color:#1c1917;font-weight:600;">${escapeHtml(value)}</td>
        </tr>`;

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#0c0a09;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0c0a09;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background:#0c0a09;padding:20px 28px;">
                <span style="color:#fafaf9;font-size:13px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">The Operator Library — New sale</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 28px 8px;">
                <h1 style="margin:0 0 16px;font-size:20px;color:#1c1917;">Sale confirmed</h1>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${row('Product', input.product.title)}
                  ${row('Buyer', input.buyerEmail)}
                  ${row('Amount', `${input.amount} ${input.currency}`)}
                  ${row('Currency', input.currency)}
                  ${row('Order ref', input.orderRef)}
                  ${row('Status', input.statusLabel)}
                  ${row('Date/time', input.date.toISOString())}
                </table>
                <p style="margin:20px 0 28px;font-size:13px;line-height:1.6;color:#16a34a;font-weight:600;">
                  ✓ The delivery email was sent to the buyer successfully.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// ---------------------------------------------------------------------------
// Download email render helpers
// ---------------------------------------------------------------------------

function renderText(input: DownloadEmailInput, c: DownloadCopy): string {
  const { product, downloadUrl, ttlDays } = input;
  const files = product.files
    .map((f) => `- ${f.label}: ${fileUrl(downloadUrl, f.id)}`)
    .join('\n');

  return [
    c.thanksText,
    ``,
    c.paidText(product.title),
    ``,
    files,
    ``,
    c.expiryText(ttlDays),
    ``,
    c.supportText(supportEmail),
    ``,
    c.disclaimer,
    `The Operator Library`
  ].join('\n');
}

function renderHtml(input: DownloadEmailInput, c: DownloadCopy): string {
  const { product, downloadUrl, ttlDays } = input;
  const rows = product.files
    .map(
      (f) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0eeec;font-size:14px;color:#44403c;">
            ${escapeHtml(f.label)}
          </td>
          <td align="right" style="padding:10px 0;border-bottom:1px solid #f0eeec;">
            <a href="${fileUrl(downloadUrl, f.id)}" style="display:inline-block;background:#f59e0b;color:#0c0a09;font-weight:700;font-size:13px;text-decoration:none;padding:8px 18px;border-radius:8px;white-space:nowrap;">
              ${escapeHtml(f.ctaLabel)}
            </a>
          </td>
        </tr>`
    )
    .join('');

  return `<!doctype html>
<html lang="${c.htmlLang}">
  <body style="margin:0;padding:0;background:#0c0a09;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0c0a09;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background:#0c0a09;padding:20px 28px;">
                <span style="color:#fafaf9;font-size:13px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">The Operator Library</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px 8px;">
                <h1 style="margin:0 0 12px;font-size:22px;color:#1c1917;">${escapeHtml(c.heading)}</h1>
                <p style="margin:0;font-size:15px;line-height:1.6;color:#44403c;">
                  ${c.intro(escapeHtml(product.title))}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px 8px;">
                <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#78716c;">${escapeHtml(c.filesLabel)}</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
                <p style="margin:16px 0 0;font-size:13px;color:#a8a29e;">
                  ${escapeHtml(c.expiry(ttlDays))}
                </p>
                <p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:#78716c;">
                  ${c.support(supportEmail)}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 28px;border-top:1px solid #e7e5e4;">
                <p style="margin:0;font-size:11px;line-height:1.6;color:#a8a29e;">
                  ${escapeHtml(c.disclaimer)}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
