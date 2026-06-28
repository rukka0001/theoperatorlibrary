/**
 * Signed download tokens.
 *
 * After a confirmed payment we hand the buyer a time-limited, signed link to
 * their file. The token carries the product slug; /api/download verifies it
 * before streaming the file from Vercel Blob. No database required.
 *
 * The download itself (streaming from Vercel Blob) is still a placeholder; the
 * token signing/verification below is real.
 */

import { SignJWT, jwtVerify } from 'jose';
import { requireEnv, getEnv } from './env';

export interface DownloadClaims {
  /** Product slug the token grants access to. */
  slug: string;
  /** Buyer email, for auditing/auth. */
  email: string;
}

function getSecret(): Uint8Array {
  return new TextEncoder().encode(requireEnv('DOWNLOAD_TOKEN_SECRET'));
}

function getTtlSeconds(): number {
  return Number(getEnv('DOWNLOAD_TOKEN_TTL') ?? 86400);
}

/** Token validity in whole hours, for user-facing copy. */
export function getDownloadTtlHours(): number {
  return Math.round(getTtlSeconds() / 3600);
}

/** Create a signed, expiring download token for a product. */
export async function createDownloadToken(
  claims: DownloadClaims
): Promise<string> {
  // TODO(MVP): confirm claims shape once checkout flow is finalized.
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${getTtlSeconds()}s`)
    .sign(getSecret());
}

/** Verify a download token and return its claims, or null if invalid/expired. */
export async function verifyDownloadToken(
  token: string
): Promise<DownloadClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return { slug: String(payload.slug), email: String(payload.email) };
  } catch {
    return null;
  }
}
