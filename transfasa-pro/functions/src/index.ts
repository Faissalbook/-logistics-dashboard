import { setGlobalOptions } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { COL, DOC, db } from './admin';
import { appendAudit, verifyStoredChain } from './audit';
import { requireAuth, requirePermission } from './guards';
import { claimOwnership as claimOwnershipOp, createUserWithRoles, parseCreateUserInput, parseRoles, setDisabled, setRoles } from './users';
import { importLegacyPlan, storedSummary } from './ops/legacyImport';
import { type LegacySummary, planLegacyImport, reconcile } from '@transfasa/domain';
import { createHash } from 'node:crypto';
import { optionalId } from './ops/common';
import { deleteExpense as deleteExpenseOp, saveExpense as saveExpenseOp, validateExpense as validateExpenseOp } from './ops/expenses';
import { assignVehicle as assignVehicleOp, saveDriver as saveDriverOp, saveVehicle as saveVehicleOp } from './ops/fleet';
import { saveReference as saveReferenceOp } from './ops/reference';
import { opsSummary as opsSummaryOp } from './ops/summary';
import { saveTrip as saveTripOp, setTripStatus as setTripStatusOp } from './ops/trips';

// Closest Google Cloud region with full Firebase support for Conakry users.
export const REGION = 'europe-west1';
setGlobalOptions({ region: REGION, maxInstances: 10 });

const uidArg = (data: unknown): string => {
  const uid = (data as { uid?: unknown } | null)?.uid;
  if (typeof uid !== 'string' || uid.length === 0 || uid.length > 128)
    throw new HttpsError('invalid-argument', 'uid requis (uid required)');
  return uid;
};

/** OWNER creates an account with roles. */
export const createUser = onCall(async (req) => {
  const actor = requirePermission(req, 'user.manage');
  return createUserWithRoles(actor, parseCreateUserInput(req.data));
});

/** OWNER replaces a user's roles. */
export const setUserRoles = onCall(async (req) => {
  const actor = requirePermission(req, 'user.manage');
  const uid = uidArg(req.data);
  await setRoles(actor, uid, parseRoles((req.data as { roles?: unknown }).roles));
  return { ok: true };
});

/** OWNER enables or disables an account. */
export const setUserDisabled = onCall(async (req) => {
  const actor = requirePermission(req, 'user.manage');
  const uid = uidArg(req.data);
  const disabled = (req.data as { disabled?: unknown }).disabled;
  if (typeof disabled !== 'boolean') throw new HttpsError('invalid-argument', 'disabled: boolean');
  await setDisabled(actor, uid, disabled);
  return { ok: true };
});

/** Called by the client right after sign-in so logins are in the audit log (AUD-04). */
export const recordSession = onCall(async (req) => {
  const actor = requireAuth(req);
  const authTime = Number(req.auth?.token.auth_time ?? 0);
  // Only count a fresh sign-in (token issued within 5 min of authentication), not token refreshes.
  if (authTime && Date.now() / 1000 - authTime > 300) return { recorded: false };
  await appendAudit(actor, {
    action: 'login',
    entity: 'session',
    entityId: actor.uid,
    after: { authTime, provider: req.auth?.token.firebase?.sign_in_provider ?? null },
  });
  return { recorded: true };
});

/** On-demand chain verification (OWNER, ACCOUNTANT). */
export const verifyAuditChain = onCall(async (req) => {
  requirePermission(req, 'audit.read');
  const result = await verifyStoredChain();
  await db
    .collection(COL.system)
    .doc(DOC.auditVerification)
    .set({ ...result, checkedAt: new Date().toISOString(), trigger: 'manual' });
  return result;
});

/** Nightly chain verification (AUD-02). Alerts via log severity until notifications ship (P6). */
export const verifyAuditChainNightly = onSchedule({ schedule: '17 2 * * *', timeZone: 'Africa/Conakry' }, async () => {
  const result = await verifyStoredChain();
  await db
    .collection(COL.system)
    .doc(DOC.auditVerification)
    .set({ ...result, checkedAt: new Date().toISOString(), trigger: 'nightly' });
  if (!result.ok) logger.error('AUDIT CHAIN BROKEN', result);
  else logger.info('Audit chain verified', result);
});

// ---------------------------------------------------------------- Phase 1 — operations

const payload = (data: unknown) => (data as { data?: unknown } | null)?.data;

/** Vehicles (legacy onboarding FLT-05): OWNER, FLEET_MANAGER. Body: { id?, data }. */
export const saveVehicle = onCall(async (req) => {
  const actor = requirePermission(req, 'vehicle.commission');
  return saveVehicleOp(actor, optionalId(req.data), payload(req.data));
});

/** Drivers: refData.write. Body: { id?, data }. */
export const saveDriver = onCall(async (req) => {
  const actor = requirePermission(req, 'refData.write');
  return saveDriverOp(actor, optionalId(req.data), payload(req.data));
});

/** Assign driver/trailer to a tractor: refData.write. Body: AssignmentInput. */
export const assignVehicle = onCall(async (req) => {
  const actor = requirePermission(req, 'refData.write');
  return assignVehicleOp(actor, req.data);
});

/** Destinations, cement types, rate cards: refData.write. Body: { kind, id?, data }. */
export const saveReference = onCall(async (req) => {
  const actor = requirePermission(req, 'refData.write');
  return saveReferenceOp(actor, (req.data as { kind?: unknown } | null)?.kind, optionalId(req.data), payload(req.data));
});

/** Create/edit trip: trip.write (all scope). Body: { id?, data }. */
export const saveTrip = onCall(async (req) => {
  const actor = requirePermission(req, 'trip.write');
  return saveTripOp(actor, optionalId(req.data), payload(req.data));
});

/** Trip status transitions; permission depends on the transition (see ops/trips.ts). */
export const setTripStatus = onCall(async (req) => {
  const actor = requirePermission(req, 'trip.read');
  return setTripStatusOp(actor, req.data);
});

/** Expenses: expense.write (drivers: own). Body: { id?, data }. */
export const saveExpense = onCall(async (req) => {
  const actor = requirePermission(req, 'expense.write');
  return saveExpenseOp(actor, optionalId(req.data), payload(req.data));
});

export const deleteExpense = onCall(async (req) => {
  const actor = requirePermission(req, 'expense.write');
  await deleteExpenseOp(actor, req.data);
  return { ok: true };
});

export const validateExpense = onCall(async (req) => {
  const actor = requirePermission(req, 'expense.validate');
  await validateExpenseOp(actor, req.data);
  return { ok: true };
});

/** Operations dashboard: dashboard.ops (drivers: own trips only). Body: { from, to, vehicleId? }. */
export const opsSummary = onCall(async (req) => {
  const actor = requirePermission(req, 'dashboard.ops');
  return opsSummaryOp(actor, req.data);
});

// ---------------------------------------------------------------- Go-live helpers

/** Become the first OWNER (see users.ts claimOwnership). */
export const claimOwnership = onCall(async (req) => {
  const actor = requireAuth(req);
  await claimOwnershipOp(actor.uid, req.auth?.token.email);
  return { ok: true };
});

/**
 * OWNER imports the current app's export from the browser (PRD §12) — same code path as
 * scripts/migrate-legacy.ts. Body: { trips, expenses, summary?, fleet?, dryRun? }.
 */
export const importLegacy = onCall({ timeoutSeconds: 540, memory: '512MiB' }, async (req) => {
  const actor = requirePermission(req, 'user.manage');
  const d = (req.data ?? {}) as Record<string, unknown>;
  const pick = (v: unknown, key: string) =>
    Array.isArray(v) ? v : Array.isArray((v as Record<string, unknown> | null)?.[key]) ? (v as Record<string, unknown[]>)[key] : null;
  const trips = pick(d.trips, 'voyages');
  const expenses = pick(d.expenses, 'depenses');
  if (!trips || !expenses) throw new HttpsError('invalid-argument', 'Fichiers voyages et dépenses requis (trips and expenses files required)');
  const fleet = Array.isArray(d.fleet) && d.fleet.length ? (d.fleet as string[]) : ['BK2195', 'BN0836', 'AL8734'];
  const plan = planLegacyImport({ trips: trips as never, expenses: expenses as never }, fleet);
  const source = createHash('sha256').update(JSON.stringify([trips, expenses])).digest('hex').slice(0, 12);
  const result = d.dryRun ? null : await importLegacyPlan(plan, source, actor);
  const recon = !d.dryRun && d.summary ? reconcile(d.summary as LegacySummary, await storedSummary()) : null;
  return {
    source,
    planned: { trips: plan.trips.length, expenses: plan.expenses.length, destinations: plan.destinations.length, plates: plan.plates },
    result,
    issues: plan.issues,
    reconciliation: recon,
  };
});
