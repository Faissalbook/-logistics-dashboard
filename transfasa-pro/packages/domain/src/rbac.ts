/**
 * Role-based access control — single source of truth for PRD §9.1.
 * Firestore rules and Cloud Function guards are tested against this matrix (SEC-04).
 */

export const ROLES = [
  'OWNER',
  'PROCUREMENT',
  'INSPECTOR',
  'CUSTOMS',
  'FLEET_MANAGER',
  'DRIVER',
  'ACCOUNTANT',
  'VIEWER',
] as const;
export type Role = (typeof ROLES)[number];

export function isRole(v: unknown): v is Role {
  return typeof v === 'string' && (ROLES as readonly string[]).includes(v);
}

export const PERMISSIONS = [
  // Module 1 — import & sourcing
  'supplier.read',
  'supplier.write',
  'inspection.read',
  'inspection.fill',
  'inspection.override',
  'purchase.approve',
  'landedCost.read',
  'landedCost.estimate.write',
  'landedCost.actual.write',
  'landedCost.actual.validate',
  'tariff.read',
  'tariff.write',
  'fx.write',
  'freightRate.write',
  'registration.read',
  'registration.write',
  'registration.write.fleetSteps',
  // Fleet
  'vehicle.read',
  'vehicle.commission',
  // Module 2 — operations
  'trip.read',
  'trip.write',
  'trip.validate',
  'trip.unlock',
  'expense.read',
  'expense.write',
  'expense.validate',
  'refData.read',
  'refData.write',
  'period.close',
  // Administration
  'user.read',
  'user.manage',
  'settings.read',
  'settings.write',
  'audit.read',
  // Dashboards & exports
  'dashboard.import',
  'dashboard.ops',
  'export.run',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/**
 * all      — every record
 * own      — records linked to the user (driver's own trips, own receipts, own truck)
 * assigned — records explicitly assigned to the user (inspector's inspections)
 */
export type Scope = 'all' | 'own' | 'assigned';

type Grants = Partial<Record<Permission, Scope>>;

const all = (...perms: Permission[]): Grants => Object.fromEntries(perms.map((p) => [p, 'all' as const]));

export const ROLE_GRANTS: Readonly<Record<Role, Readonly<Grants>>> = {
  OWNER: all(...PERMISSIONS),

  PROCUREMENT: all(
    'supplier.read',
    'supplier.write',
    'inspection.read',
    'landedCost.read',
    'landedCost.estimate.write',
    'landedCost.actual.write',
    'tariff.read',
    'freightRate.write',
    'vehicle.read',
    'refData.read',
    'settings.read',
    'dashboard.import',
    'export.run',
  ),

  INSPECTOR: {
    'inspection.read': 'assigned',
    'inspection.fill': 'assigned',
    'refData.read': 'all',
    'settings.read': 'all',
  },

  CUSTOMS: all(
    'landedCost.read',
    'landedCost.estimate.write',
    'landedCost.actual.write',
    'tariff.read',
    'registration.read',
    'registration.write',
    'vehicle.read',
    'refData.read',
    'settings.read',
    'dashboard.import',
    'export.run',
  ),

  FLEET_MANAGER: all(
    'inspection.read',
    'registration.read',
    'registration.write.fleetSteps',
    'vehicle.read',
    'vehicle.commission',
    'trip.read',
    'trip.write',
    'trip.validate',
    'expense.read',
    'expense.write',
    'refData.read',
    'refData.write',
    'settings.read',
    'dashboard.ops',
    'export.run',
  ),

  DRIVER: {
    'vehicle.read': 'own',
    'trip.read': 'own',
    'trip.write': 'own',
    'expense.read': 'own',
    'expense.write': 'own',
    'dashboard.ops': 'own',
    'refData.read': 'all',
    'settings.read': 'all',
  },

  ACCOUNTANT: all(
    'supplier.read',
    'inspection.read',
    'landedCost.read',
    'landedCost.actual.validate',
    'tariff.read',
    'fx.write',
    'registration.read',
    'vehicle.read',
    'trip.read',
    'trip.unlock',
    'expense.read',
    'expense.write',
    'expense.validate',
    'refData.read',
    'period.close',
    'settings.read',
    'audit.read',
    'dashboard.import',
    'dashboard.ops',
    'export.run',
  ),

  VIEWER: all(
    'supplier.read',
    'inspection.read',
    'landedCost.read',
    'tariff.read',
    'registration.read',
    'vehicle.read',
    'trip.read',
    'expense.read',
    'refData.read',
    'settings.read',
    'dashboard.import',
    'dashboard.ops',
    'export.run',
  ),
};

const SCOPE_RANK: Record<Scope, number> = { assigned: 1, own: 1, all: 2 };

/** Widest scope any of the user's roles grants for `perm`, or null if none. */
export function scopeFor(roles: readonly string[] | undefined | null, perm: Permission): Scope | null {
  let best: Scope | null = null;
  for (const r of roles ?? []) {
    if (!isRole(r)) continue;
    const s = ROLE_GRANTS[r][perm];
    if (s && (best === null || SCOPE_RANK[s] > SCOPE_RANK[best])) best = s;
  }
  return best;
}

/** True if any role grants `perm` with any scope. Use `scopeFor` when row-level scope matters. */
export function can(roles: readonly string[] | undefined | null, perm: Permission): boolean {
  return scopeFor(roles, perm) !== null;
}

/** True only if any role grants `perm` on every record. */
export function canAll(roles: readonly string[] | undefined | null, perm: Permission): boolean {
  return scopeFor(roles, perm) === 'all';
}

/** Normalise an untrusted roles value (e.g. from a token claim) to a sorted, de-duplicated Role[]. */
export function normaliseRoles(value: unknown): Role[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isRole))].sort((a, b) => ROLES.indexOf(a) - ROLES.indexOf(b));
}

export const ROLE_LABELS: Record<Role, { fr: string; en: string }> = {
  OWNER: { fr: 'Gérant', en: 'Owner' },
  PROCUREMENT: { fr: 'Achats', en: 'Procurement' },
  INSPECTOR: { fr: 'Inspecteur', en: 'Inspector' },
  CUSTOMS: { fr: 'Transitaire', en: 'Customs & Registration' },
  FLEET_MANAGER: { fr: 'Chef de parc', en: 'Fleet Manager' },
  DRIVER: { fr: 'Chauffeur', en: 'Driver' },
  ACCOUNTANT: { fr: 'Comptable', en: 'Accountant' },
  VIEWER: { fr: 'Observateur', en: 'Viewer' },
};
