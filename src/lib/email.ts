/**
 * Transactional email via Resend (https://resend.com).
 *
 * Used to deliver the download links after a confirmed Flow payment. The Resend
 * client is created lazily so importing this module never throws when the API
 * key is absent (e.g. during build).
 */
import { Resend } from 'resend';
import { requireEnv } from './env';
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
    replyTo: input.replyTo
  });

  if (error) {
    throw new Error(
      `Resend failed to send to ${Array.isArray(input.to) ? input.to.join(', ') : input.to}: ${error.message}`
    );
  }

  return data?.id ?? '';
}

export interface DownloadEmailInput {
  to: string;
  product: Product;
  /** Base signed link to /api/download (token only); a `file` id is appended per file. */
  downloadUrl: string;
  /** How long the link is valid, in hours (for the copy). */
  ttlHours: number;
}

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

  await sendEmail({
    to,
    subject: `Tu descarga: ${product.title}`,
    html: renderHtml(input),
    text: renderText(input)
  });
}

function renderText({ product, downloadUrl, ttlHours }: DownloadEmailInput): string {
  const files = product.files
    .map((f) => `- ${f.label}: ${fileUrl(downloadUrl, f.id)}`)
    .join('\n');

  return [
    `¡Gracias por tu compra!`,
    ``,
    `Tu pago fue confirmado. Aquí están tus descargas de "${product.title}".`,
    ``,
    files,
    ``,
    `(Estos enlaces son personales y vencen en ${ttlHours} horas.)`,
    ``,
    `Solo para fines educativos. No es asesoramiento financiero.`,
    `The Operator Library`
  ].join('\n');
}

function renderHtml({ product, downloadUrl, ttlHours }: DownloadEmailInput): string {
  const rows = product.files
    .map(
      (f) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0eeec;font-size:14px;color:#44403c;">
            ${escapeHtml(f.label)}
          </td>
          <td align="right" style="padding:10px 0;border-bottom:1px solid #f0eeec;">
            <a href="${fileUrl(downloadUrl, f.id)}" style="display:inline-block;background:#f59e0b;color:#0c0a09;font-weight:700;font-size:13px;text-decoration:none;padding:8px 18px;border-radius:8px;white-space:nowrap;">
              Descargar
            </a>
          </td>
        </tr>`
    )
    .join('');

  return `<!doctype html>
<html lang="es">
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
                <h1 style="margin:0 0 12px;font-size:22px;color:#1c1917;">¡Gracias por tu compra!</h1>
                <p style="margin:0;font-size:15px;line-height:1.6;color:#44403c;">
                  Tu pago fue confirmado. Aquí están tus descargas de
                  <strong>${escapeHtml(product.title)}</strong>.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px 8px;">
                <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#78716c;">Tus archivos</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
                <p style="margin:16px 0 0;font-size:13px;color:#a8a29e;">
                  Estos enlaces son personales y vencen en ${ttlHours} horas.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 28px;border-top:1px solid #e7e5e4;">
                <p style="margin:0;font-size:11px;line-height:1.6;color:#a8a29e;">
                  Solo para fines educativos. No es asesoramiento financiero. No incluye
                  alertas ni señales. El trading conlleva riesgo de pérdida de capital.
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
