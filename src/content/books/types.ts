/**
 * Shape of the sales/marketing content for a book landing page.
 *
 * Every book under src/content/books/<slug>/ exports a `content: BookContent`
 * (assembled in its index.ts). The reusable <BookPage> component renders any
 * book given its `Product` (commerce data) + `BookContent` (copy), so adding a
 * book is: add a product entry + a content folder + a thin page wrapper.
 *
 * Some string fields may contain trusted inline HTML (e.g. <strong>) and are
 * rendered with `set:html`. Content is authored by us, never user input.
 */

export interface IncludedItem {
  label: string;
  /** Optional clarifier, e.g. "125 páginas". */
  note?: string;
}

export interface Bonus {
  title: string;
  description: string;
  /** Public image path for the bonus preview card. */
  image: string;
}

export type StatTone = 'win' | 'loss' | 'neutral';

export interface StatCard {
  value: string;
  label: string;
  note: string;
  tone: StatTone;
}

export interface ProblemBar {
  label: string;
  sign: string;
  tone: 'win' | 'loss';
  /** Bar fill width as a percentage (0–100). */
  widthPct: number;
}

export interface Preview {
  title: string;
  teaser: string;
}

export interface Faq {
  q: string;
  a: string;
}

export interface BookContent {
  hero: {
    badge: string;
    bundleLine: string;
    /** Note under the buy form. */
    buyNote: string;
    /** Trust callout box. */
    trust: string;
  };
  included: {
    heading: string;
    intro: string;
    items: IncludedItem[];
  };
  why: {
    eyebrow: string;
    heading: string;
    /** Paragraphs; may contain trusted inline HTML. */
    paragraphs: string[];
  };
  problem: {
    heading: string;
    intro: string;
    stats: StatCard[];
    bars: ProblemBar[];
    barsCaption: string;
  };
  bonuses: {
    badge: string;
    heading: string;
    intro: string;
    items: Bonus[];
  };
  audience: {
    forTitle: string;
    forItems: string[];
    notForTitle: string;
    notForItems: string[];
  };
  coverage: {
    heading: string;
    intro: string;
    details: { pages: number; chapters: number; parts: number };
    topics: string[];
  };
  preview: {
    eyebrow: string;
    heading: string;
    intro: string;
    items: Preview[];
  };
  faq: {
    heading: string;
    items: Faq[];
  };
  finalCta: {
    heading: string;
    buyNote: string;
    disclaimer: string;
  };
  /** Short label for the sticky mobile buy bar, e.g. "Ebook + 4 bonos". */
  stickyLabel: string;
}
