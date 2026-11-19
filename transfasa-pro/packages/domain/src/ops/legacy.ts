import { parseDisplayDate } from '../dates';
import { parseGNF } from '../money';
import { computeTrip } from './trip';
import {
  type ExpenseType,
  RETIRED_PLATES,
  cementCode,
  cleanLabel,
  destinationKey,
  isMeaningfulName,
  mapLegacyExpenseType,
  normalisePlate,
  normaliseRegion,
  type Region,
} from './reference';

/** Row shapes exported by the current TransFasa app (transfasa.web.app). */
export interface LegacyTrip {
  id: string;
  date: string;
  truck: string;
  cement: string;
  region: string;
  dest: string;
  tonnage: number | string;
  transport: number | string;
  offload: number | string;
  fuel_cost: number | string;
  other: number | string;
  total_cost?: number | string;
  profit?: number | string;
}

export interface LegacyExpense {
  id: string;
  date: string;
  type: string;
  amount: number | string;
  description: string;
  truck: string | null;
}

export type IssueLevel = 'error' | 'warning';
export interface Issue {
  level: IssueLevel;
  source: 'trip' | 'expense';
  legacyId: string;
  code:
    | 'bad_date'
    | 'bad_amount'
    | 'bad_tonnage'
    | 'unknown_region'
    | 'off_fleet_plate'
    | 'retired_plate'
    | 'empty_destination'
    | 'destination_variant'
    | 'cost_mismatch'
    | 'profit_mismatch'
    | 'unknown_expense_type'
    | 'plate_in_description';
  message: string;
}

export interface NormalisedTrip {
  legacyId: string;
  tripDate: string;
  plate: string;
  region: Region;
  destinationKey: string;
  destinationName: string;
  cementCode: string;
  cementLabel: string;
  tonnage: number;
  transportRevenue: number;
  offloadCost: number;
  fuelCost: number;
  otherCost: number;
  legacy: { dest: string; cement: string; region: string; truck: string };
}

export interface NormalisedExpense {
  legacyId: string;
  expenseDate: string;
  type: ExpenseType;
  amount: number;
  description: string;
  plate: string | null;
  legacy: { type: string; truck: string | null };
}

export interface LegacyImportPlan {
  trips: NormalisedTrip[];
  expenses: NormalisedExpense[];
  /** destinations keyed by region + destinationKey, named after the most frequent spelling */
  destinations: { region: Region; key: string; name: string; variants: Record<string, number> }[];
  cementTypes: { code: string; label: string }[];
  plates: string[];
  issues: Issue[];
}

export const UNSPECIFIED_DESTINATION = 'Non précisé';

/**
 * Turn the current app's export into an import plan. Pure: no I/O, no ids.
 * Rows with errors are excluded and reported; warnings are imported and reported.
 * Nothing is re-attributed silently (e.g. a plate mentioned only in a description stays unassigned).
 */
export function planLegacyImport(
  input: { trips: LegacyTrip[]; expenses: LegacyExpense[] },
  fleetPlates: readonly string[],
): LegacyImportPlan {
  const fleet = new Set(fleetPlates.map(normalisePlate));
  const issues: Issue[] = [];
  const trips: NormalisedTrip[] = [];
  const expenses: NormalisedExpense[] = [];
  const destVariants = new Map<string, { region: Region; key: string; variants: Map<string, number> }>();
  const cements = new Map<string, string>();
  const plates = new Set<string>();

  for (const r of input.trips) {
    const err = (code: Issue['code'], message: string): false => {
      issues.push({ level: 'error', source: 'trip', legacyId: r.id, code, message });
      return false;
    };
    const warn = (code: Issue['code'], message: string) =>
      issues.push({ level: 'warning', source: 'trip', legacyId: r.id, code, message });

    const tripDate = parseDisplayDate(String(r.date ?? ''));
    const region = normaliseRegion(r.region);
    const plate = normalisePlate(r.truck);
    const nums = [r.transport, r.offload, r.fuel_cost, r.other].map((v) => parseGNF(v as string | number));
    const tonnage = typeof r.tonnage === 'number' ? r.tonnage : Number(String(r.tonnage).replace(',', '.'));

    let ok = true;
    if (!tripDate) ok = err('bad_date', `Date "${r.date}"`);
    if (!region) ok = err('unknown_region', `Région "${r.region}"`);
    if (RETIRED_PLATES.includes(plate)) ok = err('retired_plate', `Camion retiré ${plate}`);
    else if (!fleet.has(plate)) ok = err('off_fleet_plate', `Camion hors flotte "${r.truck}"`);
    if (nums.some((n) => n === null || n < 0)) ok = err('bad_amount', 'Montant invalide');
    if (!Number.isFinite(tonnage) || tonnage <= 0 || tonnage > 100) ok = err('bad_tonnage', `Tonnage "${r.tonnage}"`);
    if (!ok || !tripDate || !region) continue;

    const [transportRevenue, offloadCost, fuelCost, otherCost] = nums as number[];
    const computed = computeTrip({
      transportRevenue: transportRevenue!,
      offloadCost: offloadCost!,
      fuelCost: fuelCost!,
      driverIncentive: 0,
      otherCost: otherCost!,
    });
    const legacyCost = r.total_cost === undefined ? null : parseGNF(r.total_cost as string | number);
    const legacyProfit = r.profit === undefined ? null : parseGNF(r.profit as string | number);
    if (legacyCost !== null && legacyCost !== computed.totalDirectCost)
      warn('cost_mismatch', `Coût total ${legacyCost} ≠ ${computed.totalDirectCost}`);
    if (legacyProfit !== null && legacyProfit !== computed.operatingProfit)
      warn('profit_mismatch', `Bénéfice ${legacyProfit} ≠ ${computed.operatingProfit}`);

    let destName = cleanLabel(r.dest);
    if (!isMeaningfulName(destName)) {
      warn('empty_destination', `Destination "${r.dest}" → "${UNSPECIFIED_DESTINATION}"`);
      destName = UNSPECIFIED_DESTINATION;
    }
    const key = destinationKey(destName);
    const dk = `${region}|${key}`;
    const dv = destVariants.get(dk) ?? { region, key, variants: new Map<string, number>() };
    dv.variants.set(destName, (dv.variants.get(destName) ?? 0) + 1);
    destVariants.set(dk, dv);

    const label = cleanLabel(r.cement);
    const code = cementCode(label);
    if (!cements.has(code)) cements.set(code, label);
    plates.add(plate);

    trips.push({
      legacyId: String(r.id),
      tripDate,
      plate,
      region,
      destinationKey: key,
      destinationName: destName,
      cementCode: code,
      cementLabel: label,
      tonnage,
      transportRevenue: transportRevenue!,
      offloadCost: offloadCost!,
      fuelCost: fuelCost!,
      otherCost: otherCost!,
      legacy: { dest: r.dest, cement: r.cement, region: r.region, truck: r.truck },
    });
  }

  const plateRe = new RegExp(`\\b(${[...fleet, ...RETIRED_PLATES].join('|')}|\\d{4})\\b`, 'i');
  for (const r of input.expenses) {
    const err = (code: Issue['code'], message: string): false => {
      issues.push({ level: 'error', source: 'expense', legacyId: r.id, code, message });
      return false;
    };
    const warn = (code: Issue['code'], message: string) =>
      issues.push({ level: 'warning', source: 'expense', legacyId: r.id, code, message });

    const expenseDate = parseDisplayDate(String(r.date ?? ''));
    const amount = parseGNF(r.amount as string | number);
    const type = mapLegacyExpenseType(r.type);
    const plate = r.truck ? normalisePlate(r.truck) : null;
    let ok = true;
    if (!expenseDate) ok = err('bad_date', `Date "${r.date}"`);
    if (amount === null || amount <= 0) ok = err('bad_amount', `Montant "${r.amount}"`);
    if (!type) ok = err('unknown_expense_type', `Type "${r.type}"`);
    if (plate && !fleet.has(plate)) ok = err('off_fleet_plate', `Camion hors flotte "${r.truck}"`);
    if (!ok || !expenseDate || amount === null || !type) continue;

    const description = cleanLabel(r.description);
    const mentioned = plateRe.exec(description);
    if (!plate && mentioned)
      warn('plate_in_description', `Camion cité dans la description mais non affecté : "${description}"`);

    expenses.push({
      legacyId: String(r.id),
      expenseDate,
      type,
      amount,
      description,
      plate,
      legacy: { type: r.type, truck: r.truck },
    });
  }

  const destinations = [...destVariants.values()].map((d) => {
    // Accented spellings win (never strip accents — CNV-06), then the most frequent, then alphabetical.
    const accents = (s: string) => (s.normalize('NFD').match(/[\u0300-\u036f]/g) ?? []).length;
    const sorted = [...d.variants.entries()].sort(
      (a, b) => accents(b[0]) - accents(a[0]) || b[1] - a[1] || a[0].localeCompare(b[0]),
    );
    if (sorted.length > 1)
      issues.push({
        level: 'warning',
        source: 'trip',
        legacyId: '*',
        code: 'destination_variant',
        message: `${d.region}: ${sorted.map(([n, c]) => `"${n}"×${c}`).join(', ')} → "${sorted[0]![0]}"`,
      });
    return { region: d.region, key: d.key, name: sorted[0]![0], variants: Object.fromEntries(sorted) };
  });

  return {
    trips,
    expenses,
    destinations: destinations.sort((a, b) => a.region.localeCompare(b.region) || a.name.localeCompare(b.name)),
    cementTypes: [...cements.entries()].map(([code, label]) => ({ code, label })),
    plates: [...plates].sort(),
    issues,
  };
}
