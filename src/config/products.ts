/**
 * Product catalog for TheOperatorLibrary (commerce layer).
 *
 * There is no database — this file is the single source of truth for the books
 * we sell. It holds only commerce data: identity, pricing, cover image, and the
 * deliverable files. All sales/marketing copy for a book lives separately in
 * src/content/books/<slug>/ and is consumed by the landing page.
 *
 * `blobKey` is the path of a deliverable inside Vercel Blob. It is never exposed
 * to the client; downloads go through a signed link served by /api/download.
 */

export interface DownloadFile {
  /** URL-safe id used in /api/download?file=<id>. */
  id: string;
  /** Row label shown beside the button in the delivery email. */
  label: string;
  /** Download button text in the delivery email (e.g. "Descargar PDF"). */
  ctaLabel: string;
  /** Filename presented to the buyer on download. */
  fileName: string;
  /** Pathname of the file inside Vercel Blob. Never exposed to the client. */
  blobKey: string;
  /** MIME type sent with the download. */
  contentType: string;
}

export interface Product {
  /** URL slug under /es/<slug> and the canonical product id. */
  slug: string;
  /** Display title. */
  title: string;
  /** Short tagline shown under the title and on catalog cards. */
  subtitle: string;
  author: string;
  /** Launch price in Chilean pesos (CLP) — Flow charges in CLP. */
  priceCLP: number;
  /** Regular/anchor price shown crossed out. Optional. */
  regularPriceCLP?: number;
  /** ISO language code of the book. */
  language: string;
  /** Public cover image path (under /public). */
  coverImage: string;
  /**
   * The actual deliverables, streamed from Vercel Blob by /api/download.
   */
  files: DownloadFile[];
}

const BLOB_PREFIX = 'books/el-trader-que-perdia-ganando/es';

export const products: Record<string, Product> = {
  'el-trader-que-perdia-ganando': {
    slug: 'el-trader-que-perdia-ganando',
    title: 'El Trader Que Perdía Ganando',
    subtitle:
      'Cómo puedes ganar la mayoría de tus trades y aun así perder dinero — y cómo empezar a construir un sistema que proteja tu cuenta.',
    author: 'Chris Ruzicka',
    priceCLP: 14990,
    regularPriceCLP: 29990,
    language: 'es',
    coverImage: '/images/books/el-trader-que-perdia-ganando/cover.png',
    files: [
      {
        id: 'pdf',
        label: 'Ebook principal (PDF)',
        ctaLabel: 'Descargar PDF',
        fileName: 'El-Trader-Que-Perdia-Ganando.pdf',
        blobKey: `${BLOB_PREFIX}/el-trader-que-perdia-ganando.pdf`,
        contentType: 'application/pdf'
      },
      {
        id: 'epub',
        label: 'Versión EPUB',
        ctaLabel: 'Descargar EPUB',
        fileName: 'El-Trader-Que-Perdia-Ganando.epub',
        blobKey: `${BLOB_PREFIX}/el-trader-que-perdia-ganando.epub`,
        contentType: 'application/epub+zip'
      },
      {
        id: 'azw3',
        label: 'Versión Kindle / AZW3',
        ctaLabel: 'Descargar Kindle / AZW3',
        fileName: 'El-Trader-Que-Perdia-Ganando.azw3',
        blobKey: `${BLOB_PREFIX}/el-trader-que-perdia-ganando.azw3`,
        contentType: 'application/octet-stream'
      },
      {
        id: 'hojas',
        label: 'Hojas de referencia (4 incluidas)',
        ctaLabel: 'Descargar hojas de referencia',
        fileName: 'Hojas-de-Referencia.pdf',
        blobKey: `${BLOB_PREFIX}/hojas-de-referencia.pdf`,
        contentType: 'application/pdf'
      }
    ]
  }
};

/** Look up a product by slug. Returns undefined if it doesn't exist. */
export function getProduct(slug: string): Product | undefined {
  return products[slug];
}

/** All products as an array, for listings. */
export function listProducts(): Product[] {
  return Object.values(products);
}

/** Format a CLP amount as e.g. "$14.990". */
export function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(amount);
}
