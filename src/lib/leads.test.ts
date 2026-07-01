import { describe, it, expect } from 'vitest';
import { isValidEmail, nurtureSendTimes, NURTURE_OFFSET_DAYS } from './leads';

describe('isValidEmail', () => {
  it('accepts a normal address', () => {
    expect(isValidEmail('lead@example.cl')).toBe(true);
  });

  it('rejects malformed addresses', () => {
    expect(isValidEmail('nope')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('a b@c.cl')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('nurtureSendTimes', () => {
  it('schedules one ISO timestamp per follow-up offset', () => {
    const now = new Date('2026-07-01T12:00:00.000Z');
    const times = nurtureSendTimes(now);
    expect(times).toHaveLength(NURTURE_OFFSET_DAYS.length);
    expect(times).toEqual([
      '2026-07-02T12:00:00.000Z', // +1 day
      '2026-07-04T12:00:00.000Z', // +3 days
      '2026-07-06T12:00:00.000Z', // +5 days
      '2026-07-07T12:00:00.000Z' // +6 days
    ]);
  });

  it('keeps every follow-up within Resend 30-day window', () => {
    const now = new Date();
    for (const iso of nurtureSendTimes(now)) {
      const days = (new Date(iso).getTime() - now.getTime()) / 86_400_000;
      expect(days).toBeGreaterThan(0);
      expect(days).toBeLessThanOrEqual(30);
    }
  });
});
