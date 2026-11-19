import { describe, expect, it } from 'vitest';
import { type SummaryTrip, summarise } from './summary';

const trip = (o: Partial<SummaryTrip>): SummaryTrip => ({
  tripDate: '2026-11-18',
  status: 'VALIDATED',
  vehicleId: 'bk',
  vehiclePlate: 'BK2195',
  region: 'Coyah',
  cementCode: 'CIMII',
  cementLabel: 'CIMII/AP42.5 N',
  driverId: null,
  driverName: null,
  tonnage: 40,
  transportRevenue: 4000000,
  totalDirectCost: 1410000,
  ...o,
});

describe('summarise (PRD §6.6, legacy dashboard parity)', () => {
  const trips = [
    trip({}),
    trip({ tripDate: '2026-11-16', vehicleId: 'bn', vehiclePlate: 'BN0836', region: 'Conakry', tonnage: 35, transportRevenue: 3000000, totalDirectCost: 1080000, cementCode: 'CIMI', cementLabel: 'CIMI/42.5 R CPA' }),
    trip({ tripDate: '2026-10-02', tonnage: 40.25 }),
    trip({ status: 'CANCELLED', transportRevenue: 999 }),
    trip({ status: 'PLANNED', transportRevenue: 999 }),
  ];
  const expenses = [
    { expenseDate: '2026-11-07', amount: 2500000, vehicleId: 'bk' },
    { expenseDate: '2026-11-01', amount: 1000000, vehicleId: null },
    { expenseDate: '2026-09-15', amount: 500000, vehicleId: null },
  ];
  const s = summarise(trips, expenses);

  it('totals count only delivered/validated trips', () => {
    expect(s.total).toMatchObject({
      trips: 3,
      tonnage: 115.25,
      revenue: 11000000,
      directCosts: 3900000,
      operatingProfit: 7100000,
      expenses: 4000000,
      netProfit: 3100000,
      netMarginPct: 28.2,
      avgRevenuePerTrip: 3666667,
      avgTonnagePerTrip: 38.42,
    });
  });

  it('by month includes months with expenses only', () => {
    expect(s.byMonth.map((m) => [m.month, m.trips, m.expenses, m.netProfit])).toEqual([
      ['2026-09', 0, 500000, -500000],
      ['2026-10', 1, 0, 2590000],
      ['2026-11', 2, 3500000, 1010000],
    ]);
  });

  it('by vehicle carries truck-specific expenses only', () => {
    expect(s.byVehicle.map((v) => [v.plate, v.trips, v.operatingProfit, v.expenses])).toEqual([
      ['BK2195', 2, 5180000, 2500000],
      ['BN0836', 1, 1920000, 0],
    ]);
  });

  it('by region and cement', () => {
    expect(s.byRegion.map((r) => [r.region, r.trips])).toEqual([
      ['Coyah', 2],
      ['Conakry', 1],
    ]);
    expect(s.byCement.map((c) => [c.label, c.tonnage])).toEqual([
      ['CIMII/AP42.5 N', 80.25],
      ['CIMI/42.5 R CPA', 35],
    ]);
  });

  it('empty input', () => {
    const e = summarise([], []);
    expect(e.total).toMatchObject({ trips: 0, revenue: 0, netMarginPct: null, avgRevenuePerTrip: null });
  });
});
