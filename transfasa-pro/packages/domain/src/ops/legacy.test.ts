import { describe, expect, it } from 'vitest';
import { type LegacyTrip, planLegacyImport } from './legacy';
import { destinationKey, normaliseRegion } from './reference';

const t = (o: Partial<LegacyTrip>): LegacyTrip => ({
  id: '1',
  date: '18/11/2026',
  truck: 'BK2195',
  cement: 'CIMII/AP42.5 N',
  region: 'Coyah',
  dest: 'Coyah-Centre',
  tonnage: 40,
  transport: 4000000,
  offload: 600000,
  fuel_cost: 540000,
  other: 270000,
  total_cost: 1410000,
  profit: 2590000,
  ...o,
});
const FLEET = ['BK2195', 'BN0836', 'AL8734'];

describe('normalisers', () => {
  it('regions and destination keys', () => {
    expect(normaliseRegion('Dubreka')).toBe('Dubréka');
    expect(normaliseRegion('CONAKRY')).toBe('Conakry');
    expect(normaliseRegion('Kindia')).toBeNull();
    expect(destinationKey('Coyah-Centre')).toBe(destinationKey('Coyah Centre'));
    expect(destinationKey('Dubreka center')).toBe(destinationKey('Dubréka Centre'));
    expect(destinationKey('Kipe')).toBe(destinationKey('Kipé'));
    expect(destinationKey('Cosa')).not.toBe(destinationKey('Coza'));
  });
});

describe('planLegacyImport', () => {
  it('imports clean rows and groups destination spellings under the most frequent one', () => {
    const plan = planLegacyImport(
      {
        trips: [
          t({ id: '1' }),
          t({ id: '2' }),
          t({ id: '3', dest: 'Coyah Centre' }),
          t({ id: '4', region: 'Dubreka', dest: 'Ouassou' }),
          t({ id: '5', region: 'Conakry', dest: 'Kipe' }),
          t({ id: '6', region: 'Conakry', dest: 'Kipe' }),
          t({ id: '7', region: 'Conakry', dest: 'Kipé' }),
        ],
        expenses: [],
      },
      FLEET,
    );
    expect(plan.trips).toHaveLength(7);
    expect(plan.trips[3]!.region).toBe('Dubréka');
    expect(plan.destinations.map((d) => [d.region, d.name])).toEqual([
      ['Conakry', 'Kipé'],
      ['Coyah', 'Coyah-Centre'],
      ['Dubréka', 'Ouassou'],
    ]);
    expect(plan.issues.filter((i) => i.code === 'destination_variant')).toHaveLength(2);
  });

  it('rejects off-fleet and retired plates, bad dates and amounts', () => {
    const plan = planLegacyImport(
      {
        trips: [
          t({ id: 'a', truck: 'AL7834' }),
          t({ id: 'b', truck: 'TRK001' }),
          t({ id: 'c', date: '2026/11/18' }),
          t({ id: 'd', fuel_cost: -5 }),
          t({ id: 'e', truck: 'bk 2195' }),
        ],
        expenses: [],
      },
      FLEET,
    );
    expect(plan.trips.map((x) => x.legacyId)).toEqual(['e']);
    expect(plan.issues.filter((i) => i.level === 'error').map((i) => [i.legacyId, i.code])).toEqual([
      ['a', 'retired_plate'],
      ['b', 'off_fleet_plate'],
      ['c', 'bad_date'],
      ['d', 'bad_amount'],
    ]);
  });

  it('flags cost mismatches and empty destinations but keeps the row', () => {
    const plan = planLegacyImport({ trips: [t({ id: 'x', total_cost: 1, dest: '.' })], expenses: [] }, FLEET);
    expect(plan.trips[0]!.destinationName).toBe('Non précisé');
    expect(plan.issues.map((i) => i.code).sort()).toEqual(['cost_mismatch', 'empty_destination']);
  });

  it('expenses: maps types and never infers the truck from the description', () => {
    const plan = planLegacyImport(
      {
        trips: [],
        expenses: [
          { id: 'e1', date: '07/11/2026', type: 'Repair', amount: 2500000, description: 'Vidange', truck: 'BK2195' },
          { id: 'e2', date: '22/05/2026', type: 'Repair', amount: 1500000, description: 'Vidange BK2195', truck: null },
          { id: 'e3', date: '16/04/2026', type: 'Tires', amount: 3300000, description: '3 tires', truck: null },
          { id: 'e4', date: '07/02/2026', type: 'Insurance', amount: 2500000, description: 'AL7834 ins', truck: null },
          { id: 'e5', date: '01/01/2026', type: 'Bonus', amount: 1, description: 'x', truck: null },
        ],
      },
      FLEET,
    );
    expect(plan.expenses.map((e) => [e.legacyId, e.type, e.plate])).toEqual([
      ['e1', 'REPAIR', 'BK2195'],
      ['e2', 'REPAIR', null],
      ['e3', 'TYRES', null],
      ['e4', 'INSURANCE', null],
    ]);
    expect(plan.issues.map((i) => [i.legacyId, i.code])).toEqual([
      ['e2', 'plate_in_description'],
      ['e4', 'plate_in_description'],
      ['e5', 'unknown_expense_type'],
    ]);
  });
});
