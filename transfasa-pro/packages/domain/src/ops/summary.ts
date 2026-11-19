import Decimal from 'decimal.js';
import type { GNF } from '../money';
import { COUNTED_TRIP_STATUSES, type TripStatus } from './reference';

export interface SummaryTrip {
  tripDate: string; // ISO
  status: TripStatus;
  vehicleId: string;
  vehiclePlate: string;
  region: string;
  cementCode: string;
  cementLabel: string;
  driverId: string | null;
  driverName: string | null;
  tonnage: number;
  transportRevenue: GNF;
  totalDirectCost: GNF;
}

export interface SummaryExpense {
  expenseDate: string; // ISO
  amount: GNF;
  vehicleId: string | null;
}

export interface Figures {
  trips: number;
  tonnage: number;
  revenue: GNF;
  directCosts: GNF;
  operatingProfit: GNF;
}

export interface FiguresWithExpenses extends Figures {
  expenses: GNF;
  netProfit: GNF;
  /** net profit ÷ revenue × 100, 1 decimal; null when revenue is 0 */
  netMarginPct: number | null;
}

export interface OpsSummary {
  total: FiguresWithExpenses & {
    avgRevenuePerTrip: GNF | null;
    avgProfitPerTrip: GNF | null;
    avgTonnagePerTrip: number | null;
    revenuePerTonne: GNF | null;
  };
  byMonth: (FiguresWithExpenses & { month: string })[];
  /** expenses = truck-specific expenses only (matches the current app's "dépenses camion") */
  byVehicle: (FiguresWithExpenses & { vehicleId: string; plate: string })[];
  byRegion: (Figures & { region: string })[];
  byCement: (Figures & { cementCode: string; label: string })[];
  byDriver: (Figures & { driverId: string | null; name: string | null })[];
}

const zero = (): { trips: number; tonnage: Decimal; revenue: number; directCosts: number } => ({
  trips: 0,
  tonnage: new Decimal(0),
  revenue: 0,
  directCosts: 0,
});
type Acc = ReturnType<typeof zero>;

const add = (acc: Acc, t: SummaryTrip) => {
  acc.trips += 1;
  acc.tonnage = acc.tonnage.plus(t.tonnage);
  acc.revenue += t.transportRevenue;
  acc.directCosts += t.totalDirectCost;
};

const figures = (a: Acc): Figures => ({
  trips: a.trips,
  tonnage: a.tonnage.toDecimalPlaces(2).toNumber(),
  revenue: a.revenue,
  directCosts: a.directCosts,
  operatingProfit: a.revenue - a.directCosts,
});

const withExpenses = (f: Figures, expenses: GNF): FiguresWithExpenses => {
  const netProfit = f.operatingProfit - expenses;
  return {
    ...f,
    expenses,
    netProfit,
    netMarginPct: f.revenue === 0 ? null : new Decimal(netProfit).times(100).dividedBy(f.revenue).toDecimalPlaces(1).toNumber(),
  };
};

const div = (a: number, b: number): GNF | null =>
  b === 0 ? null : new Decimal(a).dividedBy(b).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();

/**
 * Operations summary (PRD §6.6) — same figures as the current app's dashboard:
 * trips, tonnage, revenue, direct costs, operating profit, expenses, net profit.
 * Only DELIVERED and VALIDATED trips count. Caller filters by period.
 */
export function summarise(trips: readonly SummaryTrip[], expenses: readonly SummaryExpense[]): OpsSummary {
  const counted = trips.filter((t) => COUNTED_TRIP_STATUSES.includes(t.status));
  const total = zero();
  const months = new Map<string, Acc>();
  const vehicles = new Map<string, { acc: Acc; plate: string }>();
  const regions = new Map<string, Acc>();
  const cements = new Map<string, { acc: Acc; label: string }>();
  const drivers = new Map<string, { acc: Acc; id: string | null; name: string | null }>();

  const get = <K, V>(m: Map<K, V>, k: K, init: () => V): V => {
    let v = m.get(k);
    if (!v) m.set(k, (v = init()));
    return v;
  };

  for (const t of counted) {
    add(total, t);
    add(get(months, t.tripDate.slice(0, 7), zero), t);
    add(get(vehicles, t.vehicleId, () => ({ acc: zero(), plate: t.vehiclePlate })).acc, t);
    add(get(regions, t.region, zero), t);
    add(get(cements, t.cementCode, () => ({ acc: zero(), label: t.cementLabel })).acc, t);
    add(get(drivers, t.driverId ?? '', () => ({ acc: zero(), id: t.driverId, name: t.driverName })).acc, t);
  }

  let expenseTotal = 0;
  const expenseByMonth = new Map<string, number>();
  const expenseByVehicle = new Map<string, number>();
  for (const e of expenses) {
    expenseTotal += e.amount;
    const m = e.expenseDate.slice(0, 7);
    expenseByMonth.set(m, (expenseByMonth.get(m) ?? 0) + e.amount);
    if (e.vehicleId) expenseByVehicle.set(e.vehicleId, (expenseByVehicle.get(e.vehicleId) ?? 0) + e.amount);
    if (!months.has(m)) months.set(m, zero());
  }

  const totalFigures = withExpenses(figures(total), expenseTotal);
  return {
    total: {
      ...totalFigures,
      avgRevenuePerTrip: div(totalFigures.revenue, totalFigures.trips),
      avgProfitPerTrip: div(totalFigures.netProfit, totalFigures.trips),
      avgTonnagePerTrip:
        total.trips === 0 ? null : total.tonnage.dividedBy(total.trips).toDecimalPlaces(2).toNumber(),
      revenuePerTonne: total.tonnage.isZero()
        ? null
        : new Decimal(total.revenue).dividedBy(total.tonnage).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber(),
    },
    byMonth: [...months.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, acc]) => ({ month, ...withExpenses(figures(acc), expenseByMonth.get(month) ?? 0) })),
    byVehicle: [...vehicles.entries()]
      .map(([vehicleId, v]) => ({
        vehicleId,
        plate: v.plate,
        ...withExpenses(figures(v.acc), expenseByVehicle.get(vehicleId) ?? 0),
      }))
      .sort((a, b) => b.revenue - a.revenue),
    byRegion: [...regions.entries()].map(([region, acc]) => ({ region, ...figures(acc) })).sort((a, b) => b.revenue - a.revenue),
    byCement: [...cements.entries()]
      .map(([cementCode, c]) => ({ cementCode, label: c.label, ...figures(c.acc) }))
      .sort((a, b) => b.revenue - a.revenue),
    byDriver: [...drivers.values()]
      .map((d) => ({ driverId: d.id, name: d.name, ...figures(d.acc) }))
      .sort((a, b) => b.revenue - a.revenue),
  };
}
