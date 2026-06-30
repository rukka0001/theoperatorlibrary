/**
 * Product catalog for TheOperatorLibrary (commerce layer).
 *
 * No database — this file is the single source of truth for the books we sell:
 * identity, provider, pricing, cover, and deliverable files. Sales/marketing copy
 * lives separately in src/content/books/<slug>/.
 *
 * `blobKey` is the path of a deliverable inside Vercel Blob, never exposed to the
 * client; downloads go through a signed link served by /api/download.
 */

export interface DownloadFile {
  id: string;
  label: string;
  ctaLabel: string;
  fileName: string;
  blobKey: string;
  contentType: string;
}

export interface Product {
  /** URL slug under /<lang>/<slug> and the canonical product id. */
  slug: string;
  title: string;
  subtitle: string;
  author: string;
  /** ISO language code of the book and its landing page. */
  language: 'es' | 'en';
  /** Which payment gateway sells this product. */
  provider: 'flow' | 'lemonsqueezy';
  /** ISO currency code (e.g. 'CLP', 'USD'). */
  currency: string;
  /**
   * Launch price. For Flow this is the charged amount (CLP integer). For Lemon
   * Squeezy the LS variant price is authoritative; this is display-only and must
   * match the variant.
   */
  price: number;
  /** Regular/anchor price shown crossed out. Optional. */
  regularPrice?: number;
  coverImage: string;
  files: DownloadFile[];
  /** Lemon Squeezy specifics (present when provider === 'lemonsqueezy'). */
  lemonSqueezy?: { variantId: string };
}

const ES_BLOB_PREFIX = 'books/el-trader-que-perdia-ganando/es';
const EN_BLOB_PREFIX = 'books/day-trading-from-inside-the-problem/en';

export const products: Record<string, Product> = {
  'el-trader-que-perdia-ganando': {
    slug: 'el-trader-que-perdia-ganando',
    title: 'El Trader Que Perdía Ganando',
    subtitle:
      'Cómo puedes ganar la mayoría de tus trades y aun así perder dinero — y cómo empezar a construir un sistema que proteja tu cuenta.',
    author: 'Chris Ruzicka',
    language: 'es',
    provider: 'flow',
    currency: 'CLP',
    price: 14990,
    regularPrice: 29990,
    coverImage: '/images/books/el-trader-que-perdia-ganando/cover.png',
    files: [
      {
        id: 'pdf',
        label: 'Ebook principal (PDF)',
        ctaLabel: 'Descargar PDF',
        fileName: 'El-Trader-Que-Perdia-Ganando.pdf',
        blobKey: `${ES_BLOB_PREFIX}/el-trader-que-perdia-ganando.pdf`,
        contentType: 'application/pdf'
      },
      {
        id: 'epub',
        label: 'Versión EPUB',
        ctaLabel: 'Descargar EPUB',
        fileName: 'El-Trader-Que-Perdia-Ganando.epub',
        blobKey: `${ES_BLOB_PREFIX}/el-trader-que-perdia-ganando.epub`,
        contentType: 'application/epub+zip'
      },
      {
        id: 'azw3',
        label: 'Versión Kindle / AZW3',
        ctaLabel: 'Descargar Kindle / AZW3',
        fileName: 'El-Trader-Que-Perdia-Ganando.azw3',
        blobKey: `${ES_BLOB_PREFIX}/el-trader-que-perdia-ganando.azw3`,
        contentType: 'application/octet-stream'
      },
      {
        id: 'hojas',
        label: 'Hojas de referencia (4 incluidas)',
        ctaLabel: 'Descargar hojas de referencia',
        fileName: 'Hojas-de-Referencia.pdf',
        blobKey: `${ES_BLOB_PREFIX}/hojas-de-referencia.pdf`,
        contentType: 'application/pdf'
      }
    ]
  },
  'day-trading-from-inside-the-problem': {
    slug: 'day-trading-from-inside-the-problem',
    title: 'Day Trading from Inside the Problem',
    subtitle:
      'How you can win most of your trades and still lose money — and how to start building a system that protects your account.',
    author: 'Chris Ruzicka',
    language: 'en',
    provider: 'lemonsqueezy',
    currency: 'USD',
    price: 18.99,
    regularPrice: 38.99,
    coverImage: '/images/books/day-trading-from-inside-the-problem/cover.png',
    lemonSqueezy: { variantId: '1853026' },
    files: [
      {
        id: 'pdf',
        label: 'Main ebook (PDF)',
        ctaLabel: 'Download PDF',
        fileName: 'Day-Trading-From-Inside-The-Problem.pdf',
        blobKey: `${EN_BLOB_PREFIX}/day-trading-from-inside-the-problem.pdf`,
        contentType: 'application/pdf'
      },
      {
        id: 'epub',
        label: 'EPUB version',
        ctaLabel: 'Download EPUB',
        fileName: 'Day-Trading-From-Inside-The-Problem.epub',
        blobKey: `${EN_BLOB_PREFIX}/day-trading-from-inside-the-problem.epub`,
        contentType: 'application/epub+zip'
      },
      {
        id: 'azw3',
        label: 'Kindle / AZW3 version',
        ctaLabel: 'Download Kindle / AZW3',
        fileName: 'Day-Trading-From-Inside-The-Problem.azw3',
        blobKey: `${EN_BLOB_PREFIX}/day-trading-from-inside-the-problem.azw3`,
        contentType: 'application/octet-stream'
      },
      {
        id: 'sheets',
        label: 'Reference sheets (4 included)',
        ctaLabel: 'Download reference sheets',
        fileName: 'Reference-Sheets.pdf',
        blobKey: `${EN_BLOB_PREFIX}/reference-sheets.pdf`,
        contentType: 'application/pdf'
      }
    ]
  }
};

export function getProduct(slug: string): Product | undefined {
  return products[slug];
}

export function listProducts(): Product[] {
  return Object.values(products);
}

/** Format a price for display in its currency (e.g. "$14.990" CLP, "$18.99" USD). */
export function formatPrice(amount: number, currency: string): string {
  const locale = currency === 'CLP' ? 'es-CL' : 'en-US';
  const maximumFractionDigits = currency === 'CLP' ? 0 : 2;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits
  }).format(amount);
}
