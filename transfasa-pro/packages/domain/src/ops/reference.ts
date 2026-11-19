/** Operational reference values and normalisers (PRD §6.1, CNV-06). */

export const REGIONS = ['Conakry', 'Coyah', 'Dubréka'] as const;
export type Region = (typeof REGIONS)[number];

const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Canonical region name, accent-insensitive ("Dubreka", "DUBRÉKA" → "Dubréka"); null if unknown. */
export function normaliseRegion(input: string | null | undefined): Region | null {
  if (!input) return null;
  const key = stripAccents(input).trim().toLowerCase();
  return REGIONS.find((r) => stripAccents(r).toLowerCase() === key) ?? null;
}

/** "bk 2195", "BK-2195" → "BK2195". */
export function normalisePlate(input: string | null | undefined): string {
  return (input ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Plates known to be wrong/retired; rows referencing them are flagged, never silently kept (PRD §6.1). */
export const RETIRED_PLATES: readonly string[] = ['AL7834', 'AL8735'];

/** Collapse whitespace; keep accents and case as written. */
export function cleanLabel(input: string | null | undefined): string {
  return (input ?? '').replace(/[‎‏]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Comparison key for destination names so spelling variants group together:
 * accents, case, hyphens and "center/centre" are ignored. "Coyah-Centre" ≡ "Coyah Centre",
 * "Kipe" ≡ "Kipé", "Dubreka center" ≡ "Dubréka Centre".
 */
export function destinationKey(name: string): string {
  return stripAccents(cleanLabel(name))
    .toLowerCase()
    .replace(/[-_/.]+/g, ' ')
    .replace(/\bcenter\b/g, 'centre')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A destination name with no letters or digits (e.g. ".") carries no information. */
export function isMeaningfulName(name: string): boolean {
  return /[\p{L}\p{N}]/u.test(name);
}

/** Stable code for a cement label: "CEM II/A-L 42.5N" → "CEM-II-A-L-42-5N". */
export function cementCode(label: string): string {
  return stripAccents(cleanLabel(label))
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const EXPENSE_TYPES = ['REPAIR', 'TYRES', 'INSURANCE', 'TAXES', 'SALARY', 'OTHER'] as const;
export type ExpenseType = (typeof EXPENSE_TYPES)[number];

export const EXPENSE_TYPE_LABELS: Record<ExpenseType, { fr: string; en: string }> = {
  REPAIR: { fr: 'Réparation', en: 'Repair' },
  TYRES: { fr: 'Pneus', en: 'Tyres' },
  INSURANCE: { fr: 'Assurance', en: 'Insurance' },
  TAXES: { fr: 'Taxes', en: 'Taxes' },
  SALARY: { fr: 'Salaire', en: 'Salary' },
  OTHER: { fr: 'Autre', en: 'Other' },
};

/** Map the current app's expense types ("Repair", "Tires", …). Unknown → null. */
export function mapLegacyExpenseType(input: string | null | undefined): ExpenseType | null {
  const k = stripAccents(input ?? '').trim().toLowerCase();
  const map: Record<string, ExpenseType> = {
    repair: 'REPAIR',
    reparation: 'REPAIR',
    tires: 'TYRES',
    tyres: 'TYRES',
    pneus: 'TYRES',
    insurance: 'INSURANCE',
    assurance: 'INSURANCE',
    taxes: 'TAXES',
    tax: 'TAXES',
    salary: 'SALARY',
    salaire: 'SALARY',
    other: 'OTHER',
    autre: 'OTHER',
  };
  return map[k] ?? null;
}

export const TRIP_STATUSES = ['PLANNED', 'IN_PROGRESS', 'DELIVERED', 'VALIDATED', 'CANCELLED'] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];

export const TRIP_STATUS_LABELS: Record<TripStatus, { fr: string; en: string }> = {
  PLANNED: { fr: 'Planifié', en: 'Planned' },
  IN_PROGRESS: { fr: 'En cours', en: 'In progress' },
  DELIVERED: { fr: 'Livré', en: 'Delivered' },
  VALIDATED: { fr: 'Validé', en: 'Validated' },
  CANCELLED: { fr: 'Annulé', en: 'Cancelled' },
};

/** Trips that count in revenue and profit figures. */
export const COUNTED_TRIP_STATUSES: readonly TripStatus[] = ['DELIVERED', 'VALIDATED'];

/** Allowed status transitions and who may make them (OPS-04). */
export const TRIP_TRANSITIONS: Record<TripStatus, readonly TripStatus[]> = {
  PLANNED: ['IN_PROGRESS', 'DELIVERED', 'CANCELLED'],
  IN_PROGRESS: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['VALIDATED', 'CANCELLED'],
  VALIDATED: ['DELIVERED'], // unlock, requires trip.unlock + reason
  CANCELLED: [],
};

export const VEHICLE_TYPES = ['TRACTOR', 'TRAILER'] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const VEHICLE_STATUSES = ['ACTIVE', 'IN_MAINTENANCE', 'OUT_OF_SERVICE', 'DISPOSED'] as const;
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, { fr: string; en: string }> = {
  ACTIVE: { fr: 'En service', en: 'Active' },
  IN_MAINTENANCE: { fr: 'En maintenance', en: 'In maintenance' },
  OUT_OF_SERVICE: { fr: 'Hors service', en: 'Out of service' },
  DISPOSED: { fr: 'Cédé', en: 'Disposed' },
};
