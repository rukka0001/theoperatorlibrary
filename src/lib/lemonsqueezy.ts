/**
 * Lemon Squeezy client (https://www.lemonsqueezy.com).
 *
 * Sells the English (USD) edition. Two halves:
 *  - Checkout creation: POST /v1/checkouts (JSON:API) → hosted checkout URL.
 *  - Webhook verification: order_created is signed with X-Signature =
 *    HMAC-SHA256(rawBody, LEMONSQUEEZY_WEBHOOK_SECRET). The signed payload is
 *    authoritative, so (unlike Flow) there is no status round-trip.
 *
 * Test mode vs live is determined by which API key is configured — no code change.
 */
import crypto from 'node:crypto';
import { requireEnv } from './env';

const API_BASE = 'https://api.lemonsqueezy.com/v1';
const JSON_API = 'application/vnd.api+json';

export interface CheckoutInput {
  variantId: string;
  email: string;
  custom: Record<string, string>;
  redirectUrl: string;
}

/** Build the JSON:API body for POST /v1/checkouts. Pure — no network. */
export function buildCheckoutPayload(
  input: CheckoutInput & { storeId: string }
): object {
  return {
    data: {
      type: 'checkouts',
      attributes: {
        checkout_data: { email: input.email, custom: input.custom },
        product_options: { redirect_url: input.redirectUrl }
      },
      relationships: {
        store: { data: { type: 'stores', id: input.storeId } },
        variant: { data: { type: 'variants', id: input.variantId } }
      }
    }
  };
}

/** Create a hosted checkout and return its URL. Throws on API error. */
export async function createCheckout(
  input: CheckoutInput
): Promise<{ url: string }> {
  const apiKey = requireEnv('LEMONSQUEEZY_API_KEY');
  const storeId = requireEnv('LEMONSQUEEZY_STORE_ID');

  const res = await fetch(`${API_BASE}/checkouts`, {
    method: 'POST',
    headers: {
      Accept: JSON_API,
      'Content-Type': JSON_API,
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(buildCheckoutPayload({ ...input, storeId }))
  });

  const data = (await res.json()) as Record<string, any>;
  if (!res.ok || !data?.data?.attributes?.url) {
    const detail =
      data?.errors?.[0]?.detail ?? data?.message ?? `HTTP ${res.status}`;
    throw new Error(`Lemon Squeezy checkout create failed: ${detail}`);
  }
  return { url: data.data.attributes.url as string };
}

/** Verify the X-Signature header against the raw request body. */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(signature, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export interface OrderCreated {
  orderId: string;
  email: string;
  /** Echoed checkout custom data; the product slug we set at checkout. */
  slug: string | null;
  status: string;
  /** Amount in cents. */
  total: number;
  currency: string;
}

/** Extract the fields we fulfill on from an order_created payload. */
export function parseOrderCreated(payload: any): OrderCreated | null {
  const attrs = payload?.data?.attributes;
  const id = payload?.data?.id;
  if (!attrs || !id) return null;
  return {
    orderId: String(id),
    email: String(attrs.user_email ?? ''),
    slug: payload?.meta?.custom_data?.slug ?? null,
    status: String(attrs.status ?? ''),
    total: Number(attrs.total ?? 0),
    currency: String(attrs.currency ?? '')
  };
}
