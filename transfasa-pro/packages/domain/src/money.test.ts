import { describe, expect, it } from 'vitest';
import {
  applyPercent,
  applyRate,
  assertNonNegativeGNF,
  convertMinorToGNF,
  formatGNF,
  formatGNFNumber,
  parseGNF,
  roundGNF,
  sumGNF,
} from './money';

describe('formatGNF (CNV-01)', () => {
  it('uses comma thousands and GNF suffix', () => {
    expect(formatGNF(2500000)).toBe('2,500,000 GNF');
    expect(formatGNF(0)).toBe('0 GNF');
    expect(formatGNF(728136000)).toBe('728,136,000 GNF');
    expect(formatGNF(-1500)).toBe('-1,500 GNF');
  });
  it('never emits decimals', () => {
    expect(formatGNF(1234.5)).toBe('1,235 GNF');
    expect(formatGNFNumber(999.4)).toBe('999');
  });
});

describe('roundGNF (CNV-03)', () => {
  it('rounds half away from zero, not banker', () => {
    expect(roundGNF('0.5')).toBe(1);
    expect(roundGNF('2.5')).toBe(3);
    expect(roundGNF('-2.5')).toBe(-3);
    expect(roundGNF('-0.4')).toBe(0);
  });
  it('avoids float error', () => {
    // 0.1 + 0.2 style traps
    expect(applyRate(374778455, '0.18')).toBe(67460122);
    expect(applyPercent(351245038, '0.5')).toBe(1756225);
  });
});

describe('convertMinorToGNF (CNV-02)', () => {
  it('converts USD cents at a captured rate (PRD §5.5.4 customs value)', () => {
    // 40,842.45 USD → but PRD uses unrounded CIF; here we test cents path
    expect(convertMinorToGNF(4084245, '8600')).toBe(351245070);
    expect(convertMinorToGNF(100, '8600.123456')).toBe(8600);
  });
});

describe('parseGNF', () => {
  it.each([
    ['2,500,000 GNF', 2500000],
    ['2 500 000', 2500000],
    ['2.500.000 FG', 2500000],
    ['2\u202f500\u202f000 GNF', 2500000],
    ['2500000', 2500000],
    ['-1,000', -1000],
    [' 540000 gnf ', 540000],
  ])('%s → %d', (input, expected) => {
    expect(parseGNF(input)).toBe(expected);
  });
  it.each(['', 'abc', '1,23', '12,34,567'])('rejects %j', (input) => {
    expect(parseGNF(input)).toBeNull();
  });
});

describe('guards', () => {
  it('sumGNF validates integers', () => {
    expect(sumGNF([540000, 600000, 270000])).toBe(1410000);
    expect(() => sumGNF([1.5])).toThrow();
  });
  it('assertNonNegativeGNF rejects negatives', () => {
    expect(() => assertNonNegativeGNF(-1)).toThrow();
    expect(() => assertNonNegativeGNF(0)).not.toThrow();
  });
});
