/**
 * Lead-magnet catalog (marketing / top-of-funnel).
 *
 * A lead magnet is a FREE giveaway (a PDF guide) exchanged for an email. It is
 * intentionally kept SEPARATE from the paid product catalog in `products.ts`:
 * lead magnets are never sold, never appear in the storefront, and never touch
 * Flow / Lemon Squeezy checkout. Keeping them in their own module means the
 * commerce layer can't accidentally treat a giveaway as a purchasable product.
 *
 * Like the paid catalog, this file is the single source of truth: no database.
 * The `blobKey` is the path of the file inside Vercel Blob and is never exposed
 * to the client — the guide is streamed through a signed link served by
 * /api/leads/download (mirroring the paid /api/download pattern).
 */

export interface LeadMagnetFile {
  /** Download filename presented to the user. */
  fileName: string;
  /** Path of the object inside Vercel Blob (never exposed to the client). */
  blobKey: string;
  contentType: string;
}

export interface LeadMagnet {
  /** Canonical id, used in the signed token and the opt-in form. */
  slug: string;
  title: string;
  subtitle: string;
  /** ISO language code of the guide. */
  language: 'es' | 'en';
  /** The single deliverable file (the free PDF). */
  file: LeadMagnetFile;
  /**
   * Slug of the PAID product this funnel nurtures toward. Used to build the
   * "buy the book" links in the nurture emails. Must match a key in
   * `products.ts`.
   */
  productSlug: string;
}

const CL_MAGNET_PREFIX = 'lead-magnets/como-empezar-trading-desde-chile/es';

export const leadMagnets: Record<string, LeadMagnet> = {
  'como-empezar-trading-desde-chile': {
    slug: 'como-empezar-trading-desde-chile',
    title: 'Cómo empezar a hacer trading desde Chile',
    subtitle:
      'La guía paso a paso para entender brokers, dólares, horarios y costos antes de arriesgar tu dinero.',
    language: 'es',
    file: {
      fileName: 'Como-Empezar-Trading-Desde-Chile.pdf',
      blobKey: `${CL_MAGNET_PREFIX}/como-empezar-trading-desde-chile.pdf`,
      contentType: 'application/pdf'
    },
    productSlug: 'como-hacer-trading-desde-chile'
  }
};

export function getLeadMagnet(slug: string): LeadMagnet | undefined {
  return leadMagnets[slug];
}

export function listLeadMagnets(): LeadMagnet[] {
  return Object.values(leadMagnets);
}
