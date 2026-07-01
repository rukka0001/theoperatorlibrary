/**
 * Create (or reuse) the Resend Audience/Segment that free-guide subscribers are
 * added to, and print its id for RESEND_AUDIENCE_ID.
 *
 * Resend has migrated "Audiences" to "Segments"; in the SDK `resend.audiences`
 * is an alias for `resend.segments`, and our lead capture adds contacts to it
 * via the legacy `contacts.create({ audienceId })` path. This script is
 * idempotent: if a segment with the target name already exists it reuses it
 * instead of creating a duplicate.
 *
 * Usage:
 *   npm run setup:lead-audience
 *   LEAD_AUDIENCE_NAME="Otro nombre" npm run setup:lead-audience
 */
import { Resend } from 'resend';
import { requireEnv, getEnv } from '../src/lib/env.ts';

const NAME = getEnv('LEAD_AUDIENCE_NAME') ?? 'Guía gratis trading Chile';

async function main(): Promise<void> {
  const resend = new Resend(requireEnv('RESEND_API_KEY'));

  const existing = await resend.audiences.list();
  const match = existing.data?.data?.find((a) => a.name === NAME);

  let id: string;
  if (match) {
    id = match.id;
    console.log(`Reusing existing audience "${NAME}"`);
  } else {
    const { data, error } = await resend.audiences.create({ name: NAME });
    if (error || !data) {
      throw new Error(`Failed to create audience: ${error?.message}`);
    }
    id = data.id;
    console.log(`Created audience "${NAME}"`);
  }

  console.log(`\nRESEND_AUDIENCE_ID=${id}\n`);
  console.log('Add the line above to your .env (and to Vercel env for prod).');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
