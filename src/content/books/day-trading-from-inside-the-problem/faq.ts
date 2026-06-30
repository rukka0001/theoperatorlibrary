/**
 * FAQ for "Day Trading from Inside the Problem".
 */
import type { BookContent } from '../types';
import { supportEmail } from '../../../config/business';

export const faq: BookContent['faq'] = {
  heading: 'Frequently asked questions',
  items: [
    {
      q: 'Is it a course?',
      a: 'No. It is a practical ebook accompanied by reference sheets. You read it at your own pace and apply what you need, with no classes or platforms.'
    },
    {
      q: 'Does it include signals or alerts?',
      a: 'No. We do not sell signals, alerts, or a trading room. The goal is for you to understand your own process, not to depend on someone else’s.'
    },
    {
      q: 'How do I receive the ebook?',
      a: `After payment you receive an email with download buttons for all files: PDF, EPUB, Kindle/AZW3, and the reference sheets. If you do not see it within a few minutes, check your spam folder or write to us at ${supportEmail}.`
    },
    {
      q: 'How is the payment processed?',
      a: 'Payment is processed securely via Lemon Squeezy in US dollars (USD). The content applies to any English-speaking trader.'
    },
    {
      q: 'Is it financial advice?',
      a: 'No. The material is for educational purposes only. It is not financial advice or an investment recommendation. The decisions you make are your responsibility.'
    },
    {
      q: 'What format does it come in?',
      a: 'The ebook comes in PDF, EPUB, and Kindle/AZW3. The reference sheets and the rules card come as print-ready PDFs you can use on screen or print.'
    }
  ]
};
