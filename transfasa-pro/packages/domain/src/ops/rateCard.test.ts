import { describe, expect, it } from 'vitest';
import { type RateCard, matchRateCard, rateCardRevenue } from './rateCard';

const base: RateCard = {
  id: 'base',
  region: 'Coyah',
  destinationId: 'coyah-centre',
  cementCode: null,
  vehicleId: null,
  basis: 'PER_TRIP',
  revenueRate: 4000000,
  stdFuel: 540000,
  stdOffload: 600000,
  stdIncentive: 0,
  stdOther: 270000,
  validFrom: '2026-01-01',
  validTo: null,
  active: true,
};
const q = { region: 'Coyah', destinationId: 'coyah-centre', cementCode: 'CIMII', vehicleId: 'v1', tripDate: '2026-11-18' };

describe('matchRateCard (§6.3)', () => {
  it('finds the generic card', () => {
    expect(matchRateCard([base], q)?.id).toBe('base');
  });
  it('prefers the most specific card', () => {
    const cards = [
      base,
      { ...base, id: 'cement', cementCode: 'CIMII' },
      { ...base, id: 'vehicle', vehicleId: 'v1' },
      { ...base, id: 'both', cementCode: 'CIMII', vehicleId: 'v1' },
    ];
    expect(matchRateCard(cards, q)?.id).toBe('both');
    expect(matchRateCard(cards.slice(0, 3), q)?.id).toBe('cement');
  });
  it('ignores cards for another cement/vehicle, inactive or out-of-date cards', () => {
    const cards = [
      { ...base, id: 'other-cement', cementCode: 'CIMI' },
      { ...base, id: 'inactive', active: false },
      { ...base, id: 'expired', validTo: '2026-06-30' },
      { ...base, id: 'future', validFrom: '2026-12-01' },
    ];
    expect(matchRateCard(cards, q)).toBeNull();
  });
  it('latest validFrom wins a tie', () => {
    expect(matchRateCard([base, { ...base, id: 'new', validFrom: '2026-10-01' }], q)?.id).toBe('new');
  });
});

describe('rateCardRevenue', () => {
  it('per trip vs per tonne', () => {
    expect(rateCardRevenue({ basis: 'PER_TRIP', revenueRate: 4000000 }, 40)).toBe(4000000);
    expect(rateCardRevenue({ basis: 'PER_TONNE', revenueRate: 85714 }, 35)).toBe(2999990);
    expect(rateCardRevenue({ basis: 'PER_TONNE', revenueRate: 100000 }, '40.5')).toBe(4050000);
  });
});
