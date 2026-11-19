import { describe, expect, it } from 'vitest';
import { fileDate, formatDate, formatDateTime, parseDisplayDate } from './dates';

describe('formatDate (CNV-04)', () => {
  it('formats ISO dates as DD/MM/YYYY without timezone shift', () => {
    expect(formatDate('2026-03-15')).toBe('15/03/2026');
    expect(formatDate('2026-01-01')).toBe('01/01/2026');
  });
  it('formats timestamps in Conakry time (UTC+0)', () => {
    expect(formatDate('2026-11-18T23:59:00Z')).toBe('18/11/2026');
    expect(formatDateTime('2026-04-30T14:32:10Z')).toBe('30/04/2026 14:32');
  });
  it('throws on invalid input', () => {
    expect(() => formatDate('not a date')).toThrow(RangeError);
  });
});

describe('parseDisplayDate', () => {
  it('parses DD/MM/YYYY only', () => {
    expect(parseDisplayDate('18/11/2026')).toBe('2026-11-18');
    expect(parseDisplayDate('5/3/2026')).toBe('2026-03-05');
    expect(parseDisplayDate('2026-11-18')).toBe('2026-11-18');
  });
  it('rejects US order and impossible dates', () => {
    expect(parseDisplayDate('11/25/2026')).toBeNull();
    expect(parseDisplayDate('31/02/2026')).toBeNull();
    expect(parseDisplayDate('29/02/2028')).toBe('2028-02-29');
    expect(parseDisplayDate('')).toBeNull();
  });
});

describe('fileDate', () => {
  it('uses ISO for filenames', () => {
    expect(fileDate(Date.UTC(2026, 3, 30, 10))).toBe('2026-04-30');
  });
});
