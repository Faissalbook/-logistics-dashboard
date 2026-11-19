import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, setLogLevel } from 'firebase/firestore';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { type Permission, ROLES, type Role, can, canAll, scopeFor } from '@transfasa/domain';
import { PROJECT_ID } from './env';

/**
 * SEC-04 — every path × every role is checked against the domain RBAC matrix.
 * Add a row here whenever a phase opens a new collection.
 */
type Principal = { name: string; uid: string | null; roles: Role[] };
type Case = {
  name: string;
  path: (p: Principal) => string;
  op: 'read' | 'write';
  allowed: (p: Principal) => boolean;
};

const PRINCIPALS: Principal[] = [
  { name: 'unauthenticated', uid: null, roles: [] },
  { name: 'no-role', uid: 'u-none', roles: [] },
  ...ROLES.map((r) => ({ name: r, uid: `u-${r.toLowerCase()}`, roles: [r] })),
];

const signedIn = (p: Principal) => p.uid !== null;
const DRIVER_UID = 'u-driver';
/** Doc owned by the DRIVER principal: readable with 'all' scope, or 'own' scope by that driver. */
const ownDoc = (perm: Permission) => (p: Principal) =>
  canAll(p.roles, perm) || (scopeFor(p.roles, perm) === 'own' && p.uid === DRIVER_UID);

const CASES: Case[] = [
  { name: 'read own profile', path: (p) => `users/${p.uid ?? 'x'}`, op: 'read', allowed: signedIn },
  { name: 'read another profile', path: () => 'users/someone-else', op: 'read', allowed: (p) => can(p.roles, 'user.read') },
  { name: 'write own profile', path: (p) => `users/${p.uid ?? 'x'}`, op: 'write', allowed: () => false },
  { name: 'write another profile', path: () => 'users/someone-else', op: 'write', allowed: () => false },
  { name: 'read audit log', path: () => 'audit_log/000000000001', op: 'read', allowed: (p) => can(p.roles, 'audit.read') },
  { name: 'write audit log', path: () => 'audit_log/000000000001', op: 'write', allowed: () => false },
  { name: 'read audit head', path: () => 'system/audit_head', op: 'read', allowed: (p) => p.roles.includes('OWNER') },
  { name: 'write audit head', path: () => 'system/audit_head', op: 'write', allowed: () => false },
  { name: 'read settings', path: () => 'settings/app', op: 'read', allowed: (p) => can(p.roles, 'settings.read') },
  { name: 'write settings', path: () => 'settings/app', op: 'write', allowed: () => false },
  // Phase 1 — operations
  { name: 'read vehicle (other driver)', path: () => 'vehicles/v-other', op: 'read', allowed: (p) => canAll(p.roles, 'vehicle.read') },
  { name: 'read vehicle (own truck)', path: () => 'vehicles/v-own', op: 'read', allowed: ownDoc('vehicle.read') },
  { name: 'write vehicle', path: () => 'vehicles/v-own', op: 'write', allowed: () => false },
  { name: 'read assignment', path: () => 'vehicle_assignments/a1', op: 'read', allowed: (p) => canAll(p.roles, 'vehicle.read') },
  { name: 'write assignment', path: () => 'vehicle_assignments/a1', op: 'write', allowed: () => false },
  { name: 'read driver (other)', path: () => 'drivers/d-other', op: 'read', allowed: (p) => canAll(p.roles, 'trip.read') },
  { name: 'read driver (own record)', path: () => 'drivers/d-own', op: 'read', allowed: ownDoc('trip.read') },
  { name: 'write driver', path: () => 'drivers/d-own', op: 'write', allowed: () => false },
  { name: 'read destination', path: () => 'destinations/x', op: 'read', allowed: (p) => can(p.roles, 'refData.read') },
  { name: 'write destination', path: () => 'destinations/x', op: 'write', allowed: () => false },
  { name: 'read cement type', path: () => 'cement_types/x', op: 'read', allowed: (p) => can(p.roles, 'refData.read') },
  { name: 'write cement type', path: () => 'cement_types/x', op: 'write', allowed: () => false },
  { name: 'read rate card', path: () => 'rate_cards/x', op: 'read', allowed: (p) => can(p.roles, 'refData.read') },
  { name: 'write rate card', path: () => 'rate_cards/x', op: 'write', allowed: () => false },
  { name: 'read trip (other driver)', path: () => 'trips/t-other', op: 'read', allowed: (p) => canAll(p.roles, 'trip.read') },
  { name: 'read trip (own)', path: () => 'trips/t-own', op: 'read', allowed: ownDoc('trip.read') },
  { name: 'write trip', path: () => 'trips/t-own', op: 'write', allowed: () => false },
  { name: 'read expense (other)', path: () => 'expenses/e-other', op: 'read', allowed: (p) => canAll(p.roles, 'expense.read') },
  { name: 'read expense (own)', path: () => 'expenses/e-own', op: 'read', allowed: ownDoc('expense.read') },
  { name: 'write expense', path: () => 'expenses/e-own', op: 'write', allowed: () => false },
  { name: 'read unknown collection', path: () => 'anything/x', op: 'read', allowed: () => false },
  { name: 'write unknown collection', path: () => 'anything/x', op: 'write', allowed: () => false },
];

setLogLevel('silent');

let env: RulesTestEnvironment;

beforeAll(async () => {
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(':');
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host, port: Number(port), rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8') },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/someone-else'), { fullName: 'Other', roles: ['VIEWER'] });
    await setDoc(doc(db, 'settings/app'), { vatRegistered: null });
    await setDoc(doc(db, 'vehicles/v-own'), { plate: 'BK2195', currentDriverUserId: DRIVER_UID });
    await setDoc(doc(db, 'vehicles/v-other'), { plate: 'BN0836', currentDriverUserId: 'someone-else' });
    await setDoc(doc(db, 'vehicle_assignments/a1'), { vehicleId: 'v-own' });
    await setDoc(doc(db, 'drivers/d-own'), { fullName: 'Own', userId: DRIVER_UID });
    await setDoc(doc(db, 'drivers/d-other'), { fullName: 'Other', userId: 'someone-else' });
    for (const c of ['destinations', 'cement_types', 'rate_cards']) await setDoc(doc(db, `${c}/x`), { name: 'x' });
    await setDoc(doc(db, 'trips/t-own'), { driverUserId: DRIVER_UID });
    await setDoc(doc(db, 'trips/t-other'), { driverUserId: 'someone-else' });
    await setDoc(doc(db, 'expenses/e-own'), { createdBy: DRIVER_UID });
    await setDoc(doc(db, 'expenses/e-other'), { createdBy: 'someone-else' });
    for (const p of PRINCIPALS) if (p.uid) await setDoc(doc(db, `users/${p.uid}`), { roles: p.roles });
  });
});

afterAll(async () => {
  await env?.cleanup();
});

describe.each(PRINCIPALS)('firestore.rules as $name', (p) => {
  it.each(CASES)('$name', async (c) => {
    const ctx = p.uid
      ? env.authenticatedContext(p.uid, p.roles.length ? { roles: p.roles } : {})
      : env.unauthenticatedContext();
    const ref = doc(ctx.firestore(), c.path(p));
    const op: Promise<unknown> = c.op === 'read' ? getDoc(ref) : setDoc(ref, { tampered: true }, { merge: true });
    if (c.allowed(p)) await assertSucceeds(op);
    else await assertFails(op);
  });
});
