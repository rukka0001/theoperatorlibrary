/**
 * Signed lead-magnet download tokens.
 *
 * When someone opts in for the free guide we hand them a time-limited, signed
 * link to the PDF. The token carries the lead-magnet slug; /api/leads/download
 * verifies it before streaming the file from Vercel Blob. No database required.
 *
 * This is deliberately SEPARATE from the paid `download-token.ts`:
 *  - it signs with its own secret (LEAD_MAGNET_TOKEN_SECRET), so a giveaway
 *    token can never be confused with (or forged into) a paid-download token;
 *  - its claims carry `magnet`, not `slug`, and are checked against the
 *    lead-magnet catalog, never the paid product catalog.
 */

import { SignJWT, jwtVerify } from 'jose';
import { requireEnv, getEnv } from './env';

export interface LeadMagnetClaims {
  /** Lead-magnet slug the token grants access to. */
  magnet: string;
  /** Subscriber email, for auditing. */
  email: string;
}

function getSecret(): Uint8Array {
  return new TextEncoder().encode(requireEnv('LEAD_MAGNET_TOKEN_SECRET'));
}

function getTtlSeconds(): number {
  return Number(getEnv('LEAD_MAGNET_TOKEN_TTL') ?? 604800);
}

/** Token validity in whole days, for user-facing copy. */
export function getLeadMagnetTtlDays(): number {
  return Math.round(getTtlSeconds() / 86400);
}

/** Create a signed, expiring download token for a lead magnet. */
export async function createLeadMagnetToken(
  claims: LeadMagnetClaims
): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${getTtlSeconds()}s`)
    .sign(getSecret());
}

/** Verify a lead-magnet token and return its claims, or null if invalid/expired. */
export async function verifyLeadMagnetToken(
  token: string
): Promise<LeadMagnetClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.magnet || !payload.email) return null;
    return { magnet: String(payload.magnet), email: String(payload.email) };
  } catch {
    return null;
  }
}
