/**
 * Flow payment gateway client (https://www.flow.cl).
 *
 * Flow signs every request with an HMAC-SHA256 signature:
 *   1. Take all request params (except `s`).
 *   2. Sort them alphabetically by key name.
 *   3. Concatenate them as `key1value1key2value2...` (no separators).
 *   4. HMAC-SHA256 the result with the secret key; hex digest → `s`.
 *   5. Send `s` alongside the other params.
 *
 * GET requests send params as a query string; POST requests send them as
 * application/x-www-form-urlencoded. Amounts for CLP are whole integers.
 */
import crypto from 'node:crypto';
import { requireEnv, getEnv } from './env';

/** Flow payment status codes returned by payment/getStatus. */
export const FLOW_STATUS = {
  PENDING: 1,
  PAID: 2,
  REJECTED: 3,
  CANCELED: 4
} as const;

function apiUrl(): string {
  // Default to production; sandbox is https://sandbox.flow.cl/api
  return getEnv('FLOW_API_URL') ?? 'https://www.flow.cl/api';
}

/** Build the Flow `s` signature for a set of params. */
function sign(params: Record<string, string>, secretKey: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => key + params[key])
    .join('');
  return crypto.createHmac('sha256', secretKey).update(toSign).digest('hex');
}

/** Attach `apiKey` + signature `s` to a param set. */
function withSignature(params: Record<string, string>): Record<string, string> {
  const apiKey = requireEnv('FLOW_API_KEY');
  const secretKey = requireEnv('FLOW_SECRET_KEY');
  const signed = { apiKey, ...params };
  return { ...signed, s: sign(signed, secretKey) };
}

export interface CreatePaymentInput {
  /** Unique order id we generate. */
  commerceOrder: string;
  /** What the buyer is paying for (shown by Flow). */
  subject: string;
  /** Amount in CLP (whole integer). */
  amount: number;
  /** Buyer email. */
  email: string;
  /** Server-to-server confirmation URL (our webhook). */
  urlConfirmation: string;
  /** Browser return URL after payment. */
  urlReturn: string;
  /** Arbitrary data echoed back by getStatus (e.g. the product slug). */
  optional?: Record<string, string>;
  /** Defaults to CLP. */
  currency?: string;
}

export interface CreatePaymentResult {
  token: string;
  flowOrder: number;
  /** Base payment URL from Flow. */
  url: string;
  /** Fully-formed URL to redirect the buyer to (`url?token=...`). */
  redirectUrl: string;
}

/** Create a Flow payment order. */
export async function createPayment(
  input: CreatePaymentInput
): Promise<CreatePaymentResult> {
  const params = withSignature({
    commerceOrder: input.commerceOrder,
    subject: input.subject,
    currency: input.currency ?? 'CLP',
    amount: String(input.amount),
    email: input.email,
    urlConfirmation: input.urlConfirmation,
    urlReturn: input.urlReturn,
    ...(input.optional
      ? { optional: JSON.stringify(input.optional) }
      : {})
  });

  const res = await fetch(`${apiUrl()}/payment/create`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params)
  });

  const data = (await res.json()) as Record<string, any>;
  if (!res.ok || data.code) {
    throw new Error(
      `Flow payment/create failed: ${data.message ?? `HTTP ${res.status}`}`
    );
  }

  return {
    token: data.token,
    flowOrder: data.flowOrder,
    url: data.url,
    redirectUrl: `${data.url}?token=${data.token}`
  };
}

export interface FlowPaymentStatus {
  flowOrder: number;
  commerceOrder: string;
  /** See FLOW_STATUS. */
  status: number;
  subject: string;
  amount: string;
  /** Buyer email (payer). */
  payer: string;
  /** Echoed `optional` payload we sent at creation, parsed back to an object. */
  optional: Record<string, string> | null;
  /** Raw Flow response, for logging/debugging. */
  raw: Record<string, any>;
}

/** Fetch the authoritative status of a payment by its token. */
export async function getPaymentStatus(
  token: string
): Promise<FlowPaymentStatus> {
  const params = withSignature({ token });
  const qs = new URLSearchParams(params).toString();

  const res = await fetch(`${apiUrl()}/payment/getStatus?${qs}`);
  const data = (await res.json()) as Record<string, any>;
  if (!res.ok || data.code) {
    throw new Error(
      `Flow payment/getStatus failed: ${data.message ?? `HTTP ${res.status}`}`
    );
  }

  let optional: Record<string, string> | null = null;
  if (data.optional) {
    try {
      optional =
        typeof data.optional === 'string'
          ? JSON.parse(data.optional)
          : data.optional;
    } catch {
      optional = null;
    }
  }

  return {
    flowOrder: data.flowOrder,
    commerceOrder: data.commerceOrder,
    status: Number(data.status),
    subject: data.subject,
    amount: String(data.amount),
    payer: data.payer,
    optional,
    raw: data
  };
}
