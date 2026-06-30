/**
 * Assembled landing-page content for "El Trader Que Perdía Ganando".
 * The page imports `content` from this directory.
 */
import type { BookContent } from '../types';
import {
  hero,
  included,
  why,
  bonuses,
  audience,
  coverage,
  finalCta,
  stickyLabel,
  ui
} from './copy';
import { problem, preview } from './sections';
import { faq } from './faq';

export const content: BookContent = {
  hero,
  included,
  why,
  problem,
  bonuses,
  audience,
  coverage,
  preview,
  faq,
  finalCta,
  ui,
  stickyLabel
};
