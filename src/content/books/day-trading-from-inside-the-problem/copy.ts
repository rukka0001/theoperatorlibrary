/**
 * Marketing copy for "Day Trading from Inside the Problem" (English edition).
 */
import type { BookContent } from '../types';

const imageBase = '/images/books/day-trading-from-inside-the-problem';

export const hero: BookContent['hero'] = {
  badge: 'Digital ebook + 4 bonuses included',
  bundleLine:
    'Includes PDF ebook + EPUB + Kindle/AZW3 + 4 printable reference sheets.',
  buyNote: 'Delivered by email after payment · Secure checkout via Lemon Squeezy.',
  trust:
    'This is not a signals room. No alerts. No promises of profit. It is a practical guide to building process, risk, and discipline.'
};

export const included: BookContent['included'] = {
  heading: 'What you get today',
  intro:
    'It is not just the book: it is the complete package to take what you read into your trading.',
  items: [
    { label: 'Main ebook in PDF', note: '125 pages' },
    { label: 'EPUB version', note: 'for most e-readers' },
    { label: 'Kindle / AZW3 version', note: 'for Amazon Kindle' },
    { label: 'Short Decision Sheet' },
    { label: 'VWAP Long / Short Sheet' },
    { label: '50-Trade Review Sheet' },
    { label: 'Daily Risk Rules Card' }
  ]
};

export const why: BookContent['why'] = {
  eyebrow: 'Why this book exists',
  heading: 'You can win most of your trades and still lose money.',
  paragraphs: [
    'Most traders think their problem is entries. They hunt for the perfect setup, another strategy, another signals room. But the real hole is usually somewhere else.',
    'You can be right on 70% of your trades and still end the month in the red, because <strong class="text-stone-100">a few uncontrolled losses erase weeks of gains.</strong> It is not the market: it is the lack of a system that protects your account when things get ugly.',
    'This book exists to show you where your capital actually leaks and how to start building a process —risk rules, journaling, and review— that keeps your bad days small.'
  ]
};

export const bonuses: BookContent['bonuses'] = {
  badge: 'Included at no extra cost',
  heading: '4 practical bonuses to use while you trade',
  intro:
    'Reference sheets designed to help you decide faster and with clear rules.',
  items: [
    {
      title: 'Short Decision Sheet',
      description:
        'A checklist for deciding when a short makes sense and when you are just chasing price.',
      image: `${imageBase}/bonus-1.png`
    },
    {
      title: 'VWAP Long / Short Sheet',
      description:
        'A quick reference for reading the VWAP on long and short setups without hesitating in the moment.',
      image: `${imageBase}/bonus-2.png`
    },
    {
      title: '50-Trade Review Sheet',
      description:
        'A template to review your last 50 trades and find where your capital leaks.',
      image: `${imageBase}/bonus-3.png`
    },
    {
      title: 'Daily Risk Rules Card',
      description:
        'Your daily risk limits on a single card, to stop before a bad day turns catastrophic.',
      image: `${imageBase}/bonus-4.png`
    }
  ]
};

export const audience: BookContent['audience'] = {
  forTitle: 'Who it is for',
  forItems: [
    'Traders who have good entries but poor results.',
    'Those who win plenty of trades and still do not see their account grow.',
    'Small-cap traders who want clear risk rules.',
    'Those ready to review their process honestly.'
  ],
  notForTitle: 'Who it is NOT for',
  notForItems: [
    'Anyone looking to get rich quick or for guaranteed profits.',
    'Anyone who wants signals or alerts to copy without understanding.',
    'Anyone unwilling to review their own trades.',
    'Anyone expecting a shortcut instead of a process.'
  ]
};

export const coverage: BookContent['coverage'] = {
  heading: 'What the book covers',
  intro: 'From the fundamentals to psychology, in a structured journey.',
  details: { pages: 125, chapters: 23, parts: 8 },
  topics: [
    'Trading vs investing: which game you are really playing.',
    'Short vs long and when each one makes sense.',
    'Small caps, float, VWAP, frontside and backside.',
    'Brokers, locates, and commissions that eat your profits.',
    'Risk, stops, and how to avoid overtrading.',
    'Psychology, journaling, and systematic trade review.'
  ]
};

export const finalCta: BookContent['finalCta'] = {
  heading: 'Start building a process that protects your account',
  buyNote: 'You receive an email with the download buttons after payment.',
  disclaimer:
    'For educational purposes only. Not financial advice. Does not include alerts or signals. Trading carries the risk of capital loss.'
};

export const stickyLabel = 'Ebook + 4 bonuses';

export const ui: BookContent['ui'] = {
  launchSuffix: 'launch price',
  previewBadge: 'Preview',
  bonusWord: 'Bonus',
  pagesLabel: 'pages',
  chaptersLabel: 'chapters',
  partsLabel: 'parts',
  coverAltPrefix: 'Cover of',
  previewAltPrefix: 'Preview:',
  stickyCta: 'Buy now',
  emailPlaceholder: 'you@example.com',
  buyCta: 'Buy now'
};
