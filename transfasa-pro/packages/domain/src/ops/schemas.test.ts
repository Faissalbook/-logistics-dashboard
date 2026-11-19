import { describe, expect, it } from 'vitest';
import { fieldErrors, rateCardInputSchema, tripInputSchema, vehicleInputSchema } from './schemas';

const valid = {
  tripDate: '18/11/2026',
  vehicleId: 'v1',
  region: 'Coyah',
  destinationId: 'd1',
  cementCode: 'c1',
  tonnage: 40,
  transportRevenue: 4000000,
  offloadCost: 600000,
  fuelCost: 540000,
  otherCost: 270000,
  otherReason: 'Police',
};
const schema = tripInputSchema('2026-11-19');

describe('tripInputSchema', () => {
  it('accepts DD/MM/YYYY and outputs ISO with defaults', () => {
    const t = schema.parse(valid);
    expect(t).toMatchObject({ tripDate: '2026-11-18', driverIncentive: 0, status: 'DELIVERED', driverId: null });
  });
  it('requires a reason for other costs', () => {
    const r = schema.safeParse({ ...valid, otherReason: '  ' });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).otherReason).toMatch(/Motif requis/);
  });
  it('rejects decimals, negatives, future dates, bad tonnage, unknown region', () => {
    const errs = (o: object) => {
      const r = schema.safeParse({ ...valid, ...o });
      return r.success ? {} : fieldErrors(r.error);
    };
    expect(errs({ fuelCost: 1.5 }).fuelCost).toMatch(/GNF/);
    expect(errs({ offloadCost: -1 }).offloadCost).toMatch(/GNF/);
    expect(errs({ tripDate: '22/11/2026' }).tripDate).toMatch(/futur/);
    expect(errs({ tripDate: '20/11/2026' }).tripDate).toBeUndefined();
    expect(errs({ tripDate: '11/25/2026' }).tripDate).toMatch(/JJ\/MM\/AAAA/);
    expect(errs({ tonnage: 0 }).tonnage).toBeDefined();
    expect(errs({ tonnage: 40.123 }).tonnage).toBeDefined();
    expect(errs({ region: 'Kindia' }).region).toMatch(/Région/);
  });
});

describe('other schemas', () => {
  it('normalises plates', () => {
    expect(vehicleInputSchema.parse({ type: 'TRACTOR', plate: 'bk 2195' }).plate).toBe('BK2195');
  });
  it('rate card date order', () => {
    const r = rateCardInputSchema.safeParse({
      region: 'Coyah', destinationId: 'd', basis: 'PER_TRIP', revenueRate: 1, stdFuel: 0, stdOffload: 0,
      stdIncentive: 0, stdOther: 0, validFrom: '2026-11-01', validTo: '2026-10-01',
    });
    expect(r.success).toBe(false);
  });
});
