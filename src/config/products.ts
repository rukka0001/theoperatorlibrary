/**
 * Product catalog for TheOperatorLibrary.
 *
 * There is no database — this file is the single source of truth for the
 * books we sell. Add a new entry here to publish a new product.
 *
 * `blobKey` is the path of the file inside Vercel Blob (the actual deliverable).
 * It is never exposed to the client; downloads go through a signed link served
 * by /api/download.
 */

export interface IncludedItem {
  /** Short label, e.g. "Ebook principal en PDF". */
  label: string;
  /** Optional clarifier, e.g. "125 páginas". */
  note?: string;
}

export interface Bonus {
  title: string;
  description: string;
}

export interface DownloadFile {
  /** URL-safe id used in /api/download?file=<id>. */
  id: string;
  /** Button label shown in the delivery email. */
  label: string;
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
  /** Short tagline shown under the title. */
  subtitle: string;
  author: string;
  /** Launch price in Chilean pesos (CLP) — Flow charges in CLP. */
  priceCLP: number;
  /** Regular/anchor price shown crossed out. Optional. */
  regularPriceCLP?: number;
  /** ISO language code of the book. */
  language: string;
  /** Delivery format summary, e.g. "Ebook digital + hojas de referencia". */
  format: string;
  /** One-paragraph pitch. */
  description: string;
  /** Everything the buyer receives (formats + reference sheets). */
  included: IncludedItem[];
  /** Bonus reference sheets bundled with the book. */
  bonuses: Bonus[];
  /** What the book covers, as bullet topics. */
  coverage: string[];
  /** Structural facts about the book. */
  details: { pages: number; chapters: number; parts: number };
  /** Public cover image path (under /public). */
  coverImage: string;
  /**
   * The actual deliverables, streamed from Vercel Blob by /api/download.
   * Separate from `included` (which is marketing copy with extra notes).
   */
  files: DownloadFile[];
}

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
    format: 'Ebook digital + hojas de referencia',
    description:
      'Una guía sin relleno para el trader que tiene buenas entradas pero malos resultados. ' +
      'Aprende por qué unas pocas pérdidas sin control pueden destruir una cuenta con alto ' +
      'porcentaje de aciertos, y cómo construir un proceso que protege tus ganancias.',
    included: [
      { label: 'Ebook principal en PDF', note: '125 páginas' },
      { label: 'Versión EPUB', note: 'para la mayoría de lectores' },
      { label: 'Versión Kindle / AZW3', note: 'para Amazon Kindle' },
      { label: 'Hoja de Decisión para Short' },
      { label: 'Hoja VWAP Long / Short' },
      { label: 'Hoja de Revisión de 50 Trades' },
      { label: 'Tarjeta de Reglas de Riesgo Diario' }
    ],
    bonuses: [
      {
        title: 'Hoja de Decisión para Short',
        description:
          'Un checklist para decidir cuándo un short tiene sentido y cuándo estás solo persiguiendo el precio.'
      },
      {
        title: 'Hoja VWAP Long / Short',
        description:
          'Referencia rápida para leer el VWAP en setups long y short sin dudar en el momento.'
      },
      {
        title: 'Hoja de Revisión de 50 Trades',
        description:
          'Plantilla para revisar tus últimas 50 operaciones y encontrar dónde se fuga tu capital.'
      },
      {
        title: 'Tarjeta de Reglas de Riesgo Diario',
        description:
          'Tus límites de riesgo del día en una sola tarjeta, para frenar antes de que un mal día se vuelva catastrófico.'
      }
    ],
    coverage: [
      'Trading vs inversión: en qué juego estás realmente.',
      'Short vs long y cuándo conviene cada uno.',
      'Small caps, float, VWAP, frontside y backside.',
      'Brokers, locates y comisiones que se comen tus ganancias.',
      'Riesgo, stops y cómo evitar el sobretrading.',
      'Psicología, journaling y revisión sistemática de trades.'
    ],
    details: { pages: 125, chapters: 23, parts: 8 },
    coverImage: '/covers/el-trader-que-perdia-ganando.png',
    files: [
      {
        id: 'pdf',
        label: 'Ebook principal (PDF)',
        fileName: 'El-Trader-Que-Perdia-Ganando.pdf',
        blobKey: 'books/el-trader-que-perdia-ganando/ebook.pdf',
        contentType: 'application/pdf'
      },
      {
        id: 'epub',
        label: 'Versión EPUB',
        fileName: 'El-Trader-Que-Perdia-Ganando.epub',
        blobKey: 'books/el-trader-que-perdia-ganando/ebook.epub',
        contentType: 'application/epub+zip'
      },
      {
        id: 'azw3',
        label: 'Versión Kindle / AZW3',
        fileName: 'El-Trader-Que-Perdia-Ganando.azw3',
        blobKey: 'books/el-trader-que-perdia-ganando/ebook.azw3',
        contentType: 'application/octet-stream'
      },
      {
        id: 'hoja-short',
        label: 'Hoja de Decisión para Short',
        fileName: 'Hoja-Decision-Short.pdf',
        blobKey: 'books/el-trader-que-perdia-ganando/hoja-decision-short.pdf',
        contentType: 'application/pdf'
      },
      {
        id: 'hoja-vwap',
        label: 'Hoja VWAP Long / Short',
        fileName: 'Hoja-VWAP-Long-Short.pdf',
        blobKey: 'books/el-trader-que-perdia-ganando/hoja-vwap.pdf',
        contentType: 'application/pdf'
      },
      {
        id: 'hoja-revision',
        label: 'Hoja de Revisión de 50 Trades',
        fileName: 'Hoja-Revision-50-Trades.pdf',
        blobKey: 'books/el-trader-que-perdia-ganando/hoja-revision-50.pdf',
        contentType: 'application/pdf'
      },
      {
        id: 'tarjeta-riesgo',
        label: 'Tarjeta de Reglas de Riesgo Diario',
        fileName: 'Tarjeta-Reglas-Riesgo-Diario.pdf',
        blobKey: 'books/el-trader-que-perdia-ganando/tarjeta-riesgo-diario.pdf',
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
