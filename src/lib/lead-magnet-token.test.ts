import { describe, it, expect, beforeAll } from 'vitest';
import {
  createLeadMagnetToken,
  verifyLeadMagnetToken,
  getLeadMagnetTtlDays
} from './lead-magnet-token';

beforeAll(() => {
  process.env.LEAD_MAGNET_TOKEN_SECRET = 'test-secret-for-lead-magnet-tokens';
});

describe('lead-magnet token', () => {
  it('round-trips valid claims', async () => {
    const token = await createLeadMagnetToken({
      magnet: 'como-empezar-trading-desde-chile',
      email: 'lead@example.cl'
    });
    const claims = await verifyLeadMagnetToken(token);
    expect(claims).toEqual({
      magnet: 'como-empezar-trading-desde-chile',
      email: 'lead@example.cl'
    });
  });

  it('rejects a tampered token', async () => {
    const token = await createLeadMagnetToken({
      magnet: 'como-empezar-trading-desde-chile',
      email: 'lead@example.cl'
    });
    const tampered = token.slice(0, -2) + (token.endsWith('a') ? 'bb' : 'aa');
    expect(await verifyLeadMagnetToken(tampered)).toBeNull();
  });

  it('rejects garbage', async () => {
    expect(await verifyLeadMagnetToken('not-a-jwt')).toBeNull();
  });

  it('exposes TTL in whole days (default 7)', () => {
    expect(getLeadMagnetTtlDays()).toBe(7);
  });
});
