import { setGlobalOptions } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { COL, DOC, db } from './admin';
import { appendAudit, verifyStoredChain } from './audit';
import { requireAuth, requirePermission } from './guards';
import { createUserWithRoles, parseCreateUserInput, parseRoles, setDisabled, setRoles } from './users';

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
