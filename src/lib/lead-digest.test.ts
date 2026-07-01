import { describe, it, expect } from 'vitest';
import { filterRecent, buildDigest } from './lead-digest';
import type { AudienceContact } from './email';

const now = new Date('2026-07-01T12:00:00.000Z');

function c(email: string, hoursAgo: number): AudienceContact {
  return {
    email,
    createdAt: new Date(now.getTime() - hoursAgo * 3_600_000).toISOString()
  };
}

describe('filterRecent', () => {
  it('keeps only contacts within the window, newest first', () => {
    const contacts = [
      c('old@x.cl', 30), // outside 24h
      c('a@x.cl', 2),
      c('b@x.cl', 10),
      c('edge@x.cl', 23.5)
    ];
    const recent = filterRecent(contacts, now, 24 * 3_600_000);
    expect(recent.map((r) => r.email)).toEqual(['a@x.cl', 'b@x.cl', 'edge@x.cl']);
  });

  it('drops contacts with unparseable timestamps', () => {
    const contacts = [{ email: 'bad@x.cl', createdAt: 'not-a-date' }, c('ok@x.cl', 1)];
    expect(filterRecent(contacts, now).map((r) => r.email)).toEqual(['ok@x.cl']);
  });

  it('returns empty when nothing is recent', () => {
    expect(filterRecent([c('old@x.cl', 100)], now)).toEqual([]);
  });
});

describe('buildDigest', () => {
  it('summarizes leads with singular/plural subject', () => {
    expect(buildDigest([c('a@x.cl', 1)], 24).subject).toContain('1 nuevo lead');
    const two = buildDigest([c('a@x.cl', 1), c('b@x.cl', 2)], 24);
    expect(two.subject).toContain('2 nuevos leads');
    expect(two.text).toContain('a@x.cl');
    expect(two.text).toContain('b@x.cl');
  });
});
