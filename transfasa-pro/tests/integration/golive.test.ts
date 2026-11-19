import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { adminAuth, db } from '../../functions/src/admin';
import { verifyStoredChain } from '../../functions/src/audit';
import { createUserWithRoles } from '../../functions/src/users';
import { PASSWORD, clientAs, errorCode, runId } from './env';

/** Go-live helpers: first-owner bootstrap without a service account, and in-app legacy import. */
const BOOTSTRAP = 'bootstrap@transfasa.test'; // functions/.env.demo-transfasa
let hiddenOwners: { id: string; roles: string[] }[] = [];

beforeAll(async () => {
  // Simulate a brand-new project: temporarily hide existing OWNER profiles from other suites.
  const owners = await db.collection('users').where('roles', 'array-contains', 'OWNER').get();
  hiddenOwners = owners.docs.map((d) => ({ id: d.id, roles: d.get('roles') }));
  await Promise.all(owners.docs.map((d) => d.ref.update({ roles: ['VIEWER'] })));
  await adminAuth.createUser({ email: BOOTSTRAP, password: PASSWORD }).catch(() => undefined);
  await adminAuth.createUser({ email: `intruder-${runId}@it.test`, password: PASSWORD });
  const scratch = await adminAuth.getUserByEmail(BOOTSTRAP);
  await adminAuth.setCustomUserClaims(scratch.uid, { scratchPlan: 'pro' }); // a claim another app set
});

afterAll(async () => {
  await Promise.all(hiddenOwners.map((o) => db.doc(`users/${o.id}`).update({ roles: o.roles })));
});

describe('claimOwnership', () => {
  it('refuses any other email', async () => {
    const c = await clientAs(`intruder-${runId}@it.test`);
    expect(await errorCode(c.call('claimOwnership')())).toBe('permission-denied');
  });

  it('makes the configured account OWNER once, keeping other apps’ claims', async () => {
    const c = await clientAs(BOOTSTRAP);
    await c.call('claimOwnership')();
    const u = await adminAuth.getUserByEmail(BOOTSTRAP);
    expect(u.customClaims).toEqual({ scratchPlan: 'pro', roles: ['OWNER'] });
    expect((await db.doc(`users/${u.uid}`).get()).get('roles')).toEqual(['OWNER']);
    expect(await errorCode(c.call('claimOwnership')())).toBe('failed-precondition');
    expect((await verifyStoredChain()).ok).toBe(true);
  });
});

describe('importLegacy (in-app migration)', () => {
  const trips = [
    { id: `g1${runId}`, date: '03/01/2026', truck: 'GL0001', cement: 'CIMII/AP42.5 N', region: 'Coyah', dest: 'Wonkifong', tonnage: 40, transport: 4000000, offload: 600000, fuel_cost: 540000, other: 270000, total_cost: 1410000, profit: 2590000 },
  ];
  const expenses = [{ id: `gx${runId}`, date: '10/01/2026', type: 'Repair', amount: 2500000, description: 'Vidange', truck: 'GL0001' }];

  it('only an OWNER can import', async () => {
    const viewer = `gl-viewer-${runId}@it.test`;
    await createUserWithRoles({ uid: 'system:test', roles: ['OWNER'] }, { email: viewer, password: PASSWORD, fullName: 'V', roles: ['ACCOUNTANT'] });
    const c = await clientAs(viewer);
    expect(await errorCode(c.call('importLegacy')({ trips: { voyages: trips }, expenses: { depenses: expenses } }))).toBe('permission-denied');
  });

  it('imports the connector export format and is idempotent', async () => {
    const c = await clientAs(BOOTSTRAP);
    const call = c.call<object, { result: { trips: { created: number; skipped: number } }; planned: { plates: string[] } }>('importLegacy');
    const body = { trips: { voyages: trips }, expenses: { depenses: expenses }, fleet: ['GL0001'] };
    const first = (await call(body)).data;
    expect(first.result.trips).toEqual({ created: 1, skipped: 0 });
    expect(first.planned.plates).toEqual(['GL0001']);
    const again = (await call(body)).data;
    expect(again.result.trips).toEqual({ created: 0, skipped: 1 });
    expect(await errorCode(call({ trips: 'x' }))).toBe('invalid-argument');
  });
});
