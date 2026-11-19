import Decimal from 'decimal.js';

/**
 * Money rules (PRD CNV-01..03).
 * GNF has no subdivision: every stored/displayed amount is an integer number of francs.
 * All intermediate math uses Decimal, then rounds half-up once per line item.
 */

/** Integer amount of Guinean francs. */
export type GNF = number;

export class MoneyError extends Error {
  override name = 'MoneyError';
}

/** Throws unless `n` is a finite safe integer (a valid stored GNF amount). */
export function assertGNF(n: unknown, field = 'amount'): asserts n is GNF {
  if (typeof n !== 'number' || !Number.isSafeInteger(n)) {
    throw new MoneyError(`${field} must be an integer GNF amount, got ${String(n)}`);
  }
}

/** Throws unless `n` is a non-negative integer GNF amount. */
export function assertNonNegativeGNF(n: unknown, field = 'amount'): asserts n is GNF {
  assertGNF(n, field);
  if (n < 0) throw new MoneyError(`${field} must be >= 0, got ${n}`);
}

/** Round any decimal-like value to whole GNF, half away from zero. */
export function roundGNF(value: Decimal.Value): GNF {
  const r = new Decimal(value).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
  if (!Number.isSafeInteger(r)) throw new MoneyError(`Amount out of range: ${String(value)}`);
  return Object.is(r, -0) ? 0 : r;
}

/** amount × rate, rounded to GNF. `rate` is a fraction (0.18) or decimal string ("0.18"). */
export function applyRate(amount: GNF, rate: Decimal.Value): GNF {
  return roundGNF(new Decimal(amount).times(rate));
}

/** amount × percentage (e.g. 18 for 18 %), rounded to GNF. */
export function applyPercent(amount: GNF, percent: Decimal.Value): GNF {
  return roundGNF(new Decimal(amount).times(percent).dividedBy(100));
}

/** Convert a foreign amount in minor units (cents/fen) to GNF using a rate "1 unit = rate GNF". */
export function convertMinorToGNF(amountMinor: number, fxRate: Decimal.Value, minorPerUnit = 100): GNF {
  if (!Number.isSafeInteger(amountMinor)) throw new MoneyError('amountMinor must be an integer');
  return roundGNF(new Decimal(amountMinor).dividedBy(minorPerUnit).times(fxRate));
}

/** Sum of integer GNF amounts (validated). */
export function sumGNF(amounts: readonly GNF[]): GNF {
  let total = 0;
  for (const a of amounts) {
    assertGNF(a);
    total += a;
  }
  assertGNF(total, 'total');
  return total;
}

/** `2,500,000 GNF` — comma thousands, space, GNF suffix, no decimals. */
export function formatGNF(n: number): string {
  return `${roundGNF(n).toLocaleString('en-US')} GNF`;
}

/** Number part only, `2,500,000` (for table cells where the column header carries the unit). */
export function formatGNFNumber(n: number): string {
  return roundGNF(n).toLocaleString('en-US');
}

/**
 * Parse user/legacy input into GNF. Accepts "2,500,000 GNF", "2 500 000", "2.500.000 FG", "2500000".
 * GNF never has decimals, so every non-digit separator is treated as a thousands separator.
 * Returns null for empty or unparseable input.
 */
export function parseGNF(input: string | number | null | undefined): GNF | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') return Number.isFinite(input) ? roundGNF(input) : null;
  const trimmed = input.trim().replace(/\s*(GNF|FG|FCFA)\s*$/i, '').trim();
  if (trimmed === '') return null;
  const negative = /^-/.test(trimmed);
  const body = negative ? trimmed.slice(1) : trimmed;
  if (!/^\d{1,3}([ ,.\u00a0\u202f]?\d{3})*$|^\d+$/.test(body)) return null;
  const digits = body.replace(/\D/g, '');
  const n = Number(digits);
  if (!Number.isSafeInteger(n)) return null;
  return negative ? -n : n;
}
