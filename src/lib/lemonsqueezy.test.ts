import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import {
  buildCheckoutPayload,
  verifyWebhookSignature,
  parseOrderCreated
} from './lemonsqueezy';

describe('buildCheckoutPayload', () => {
  it('nests store/variant relationships and checkout_data', () => {
    const payload = buildCheckoutPayload({
      storeId: '421048',
      variantId: '1853026',
      email: 'buyer@example.com',
      custom: { slug: 'day-trading-from-inside-the-problem' },
      redirectUrl: 'https://x.test/thank-you'
    }) as any;

    expect(payload.data.type).toBe('checkouts');
    expect(payload.data.relationships.store.data.id).toBe('421048');
    expect(payload.data.relationships.variant.data.id).toBe('1853026');
    expect(payload.data.attributes.checkout_data.email).toBe('buyer@example.com');
    expect(payload.data.attributes.checkout_data.custom.slug).toBe(
      'day-trading-from-inside-the-problem'
    );
    expect(payload.data.attributes.product_options.redirect_url).toBe(
      'https://x.test/thank-you'
    );
  });
});

describe('verifyWebhookSignature', () => {
  const secret = 'operator_trader';
  const body = '{"meta":{"event_name":"order_created"}}';
  const good = crypto.createHmac('sha256', secret).update(body).digest('hex');

  it('accepts a valid signature', () => {
    expect(verifyWebhookSignature(body, good, secret)).toBe(true);
  });
  it('rejects a tampered signature', () => {
    expect(verifyWebhookSignature(body, good.replace(/.$/, '0'), secret)).toBe(false);
  });
  it('rejects a missing signature', () => {
    expect(verifyWebhookSignature(body, null, secret)).toBe(false);
  });
  it('rejects when the body differs', () => {
    expect(verifyWebhookSignature(body + ' ', good, secret)).toBe(false);
  });
});

describe('parseOrderCreated', () => {
  const payload = {
    meta: { event_name: 'order_created', custom_data: { slug: 'day-trading-from-inside-the-problem' } },
    data: { id: '99', attributes: { user_email: 'buyer@example.com', status: 'paid', total: 1899, currency: 'USD' } }
  };
  it('extracts the fields we fulfill on', () => {
    expect(parseOrderCreated(payload)).toEqual({
      orderId: '99',
      email: 'buyer@example.com',
      slug: 'day-trading-from-inside-the-problem',
      status: 'paid',
      total: 1899,
      currency: 'USD'
    });
  });
  it('returns null when data is missing', () => {
    expect(parseOrderCreated({ meta: {} })).toBeNull();
  });
});
