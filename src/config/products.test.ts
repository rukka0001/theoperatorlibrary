import { describe, it, expect } from 'vitest';
import { formatPrice } from './products';

describe('formatPrice', () => {
  it('formats CLP with no decimals', () => {
    expect(formatPrice(14990, 'CLP')).toBe('$14.990');
  });

  it('formats USD with two decimals', () => {
    expect(formatPrice(18.99, 'USD')).toBe('$18.99');
  });
});
