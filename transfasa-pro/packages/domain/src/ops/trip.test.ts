import { describe, expect, it } from 'vitest';
import { bagsFor, computeTrip, fuelCostFrom, roundTonnage } from './trip';

describe('computeTrip (PRD §6.4)', () => {
  it('matches the current app on a Coyah-Centre 40 t trip', () => {
    expect(
      computeTrip({ transportRevenue: 4000000, offloadCost: 600000, fuelCost: 540000, driverIncentive: 0, otherCost: 270000 }),
    ).toEqual({ totalDirectCost: 1410000, operatingProfit: 2590000 });
  });
  it('includes the driver incentive and allows a loss', () => {
    expect(
      computeTrip({ transportRevenue: 1000000, offloadCost: 500000, fuelCost: 480000, driverIncentive: 100000, otherCost: 0 }),
    ).toEqual({ totalDirectCost: 1080000, operatingProfit: -80000 });
  });
  it('rejects non-integer amounts', () => {
    expect(() =>
      computeTrip({ transportRevenue: 1, offloadCost: 0.5, fuelCost: 0, driverIncentive: 0, otherCost: 0 }),
    ).toThrow();
  });
});

describe('helpers', () => {
  it('fuel, bags, tonnage rounding', () => {
    expect(fuelCostFrom('45.5', 12000)).toBe(546000);
    expect(bagsFor(40)).toBe(800);
    expect(bagsFor('35.5')).toBe(710);
    expect(roundTonnage('40.005')).toBe(40.01);
  });
});
