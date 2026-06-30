/**
 * Data-driven visual sections for "Day Trading from Inside the Problem":
 * the "problem in numbers" stat block and the book preview cards.
 */
import type { BookContent } from '../types';

export const problem: BookContent['problem'] = {
  heading: 'The problem, in numbers',
  intro:
    'An illustrative example of how a high win rate can hide an account that loses.',
  stats: [
    {
      value: '73%',
      label: 'winning trades',
      note: 'A win rate almost anyone would take.',
      tone: 'win'
    },
    {
      value: '−$',
      label: 'and still losing money',
      note: 'Because the size of the losses outweighs the frequency of the wins.',
      tone: 'loss'
    },
    {
      value: '5',
      label: 'trades caused almost all the damage',
      note: 'Identifying and controlling them changes the whole equity curve.',
      tone: 'neutral'
    }
  ],
  bars: [
    { label: 'Profit from the winning trades', sign: '+', tone: 'win', widthPct: 55 },
    {
      label: 'Loss from a few uncontrolled trades',
      sign: '−',
      tone: 'loss',
      widthPct: 78
    }
  ],
  barsCaption: 'Illustrative example. Does not represent real or guaranteed results.'
};

export const preview: BookContent['preview'] = {
  eyebrow: 'Book preview',
  heading: 'A look at what you will read',
  intro:
    'Three passages that show the tone: direct, honest, and written from inside the problem.',
  items: [
    {
      title: 'The five words that cost me everything',
      teaser:
        'The phrase almost every trader repeats right before turning a small loss into a catastrophe.'
    },
    {
      title: 'The receipt',
      teaser:
        'What you really pay every time you break your own rules — beyond the number on the screen.'
    },
    {
      title: 'The only math that matters',
      teaser:
        'Why your win rate can lie to you and which number you should look at instead.'
    }
  ]
};
