import { beforeAll, describe, expect, it } from 'vitest';
import { ROLES, type Role } from '@transfasa/domain';
import { db } from '../../functions/src/admin';
import { verifyStoredChain } from '../../functions/src/audit';
import { createUserWithRoles } from '../../functions/src/users';
import { PASSWORD, clientAs, errorCode, runId } from './env';

/** Phase 1 operations: fleet, reference data, trips, expenses, dashboard (OPS-01..06, FLT-05, SEC-01). */
const email = (tag: string) => `ops-${tag.toLowerCase().replace('_', '-')}-${runId}@it.test`;
const uid = {} as Record<Role, string>;
type Client = Awaited<ReturnType<typeof clientAs>>;
const as = {} as Record<Role, Client>;
const ids: Record<string, string> = {};

async function fieldsOf(p: Promise<unknown>): Promise<Record<string, string>> {
  try {
    await p;
    return {};
  } catch (e) {
    return ((e as { details?: { fields?: Record<string, string> } }).details?.fields ?? {}) as Record<string, string>;
  }
}

const tripData = (o: Record<string, unknown> = {}) => ({
  tripDate: '18/11/2026',
  vehicleId: ids.bk,
  driverId: ids.driver,
  region: 'Coyah',
  destinationId: ids.dest,
  cementCode: ids.cement,
  tonnage: 40,
  transportRevenue: 4000000,
  offloadCost: 600000,
  fuelCost: 540000,
  otherCost: 270000,
  otherReason: 'Police',
  ...o,
});

beforeAll(async () => {
  const system = { uid: 'system:test', roles: ['OWNER'] };
  for (const r of ROLES) {
    uid[r] = (await createUserWithRoles(system, { email: email(r), password: PASSWORD, fullName: `Ops ${r}`, roles: [r] })).uid;
    as[r] = await clientAs(email(r));
  }
  const owner = as.OWNER;
  ids.bk = ((await owner.call('saveVehicle')({ data: { type: 'TRACTOR', plate: `BK${runId.toUpperCase()}` } })).data as { id: string }).id;
  ids.bn = ((await owner.call('saveVehicle')({ data: { type: 'TRACTOR', plate: `BN${runId}` } })).data as { id: string }).id;
  ids.out = ((await owner.call('saveVehicle')({ data: { type: 'TRACTOR', plate: `OS${runId}`, status: 'OUT_OF_SERVICE' } })).data as { id: string }).id;
  ids.driver = ((await owner.call('saveDriver')({ data: { fullName: 'Chauffeur Test', userId: uid.DRIVER } })).data as { id: string }).id;
  await owner.call('assignVehicle')({ vehicleId: ids.bk, driverId: ids.driver, fromDate: '01/01/2026' });
  ids.dest = ((await owner.call('saveReference')({ kind: 'destination', data: { region: 'Coyah', name: `Coyah-Centre ${runId}` } })).data as { id: string }).id;
  ids.cement = ((await owner.call('saveReference')({ kind: 'cementType', data: { label: `CIMII/AP42.5 N ${runId}` } })).data as { id: string }).id;
});

describe('fleet & reference data', () => {
  it('assignment denormalises the driver onto the truck', async () => {
    const v = (await db.doc(`vehicles/${ids.bk}`).get()).data()!;
    expect(v).toMatchObject({ currentDriverId: ids.driver, currentDriverName: 'Chauffeur Test', currentDriverUserId: uid.DRIVER });
  });

  it('rejects a duplicate plate with an inline field error', async () => {
    const f = await fieldsOf(as.OWNER.call('saveVehicle')({ data: { type: 'TRACTOR', plate: `bk ${runId}` } }));
    expect(f.plate).toMatch(/déjà utilisée/);
  });

  it('a driver cannot be on two trucks', async () => {
    expect(await errorCode(as.OWNER.call('assignVehicle')({ vehicleId: ids.bn, driverId: ids.driver, fromDate: '01/02/2026' }))).toBe(
      'failed-precondition',
    );
  });

  it.each(ROLES)('saveVehicle as %s', async (r) => {
    const res = as[r].call('saveVehicle')({ data: { type: 'TRAILER', plate: `TR${r.slice(0, 3)}${runId}` } });
    if (r === 'OWNER' || r === 'FLEET_MANAGER') expect(await errorCode(res)).toBeNull();
    else expect(await errorCode(res)).toBe('permission-denied');
  });

  it.each(ROLES)('saveReference as %s', async (r) => {
    const res = as[r].call('saveReference')({ kind: 'destination', data: { region: 'Conakry', name: `Kipé ${r} ${runId}` } });
    if (r === 'OWNER' || r === 'FLEET_MANAGER') expect(await errorCode(res)).toBeNull();
    else expect(await errorCode(res)).toBe('permission-denied');
  });

  it('destination ids ignore spelling variants, so duplicates are refused', async () => {
    const f = await fieldsOf(
      as.OWNER.call('saveReference')({ kind: 'destination', data: { region: 'Coyah', name: `Coyah Centre ${runId}` } }),
    );
    expect(f.name).toMatch(/déjà existante/);
  });

  it('rate card must point at a destination in its region', async () => {
    const res = as.OWNER.call('saveReference')({
      kind: 'rateCard',
      data: { region: 'Conakry', destinationId: ids.dest, basis: 'PER_TRIP', revenueRate: 4000000, stdFuel: 540000, stdOffload: 600000, stdIncentive: 0, stdOther: 270000, validFrom: '01/01/2026' },
    });
    expect(await errorCode(res)).toBe('not-found');
    const ok = await as.FLEET_MANAGER.call('saveReference')({
      kind: 'rateCard',
      data: { region: 'Coyah', destinationId: ids.dest, basis: 'PER_TRIP', revenueRate: 4000000, stdFuel: 540000, stdOffload: 600000, stdIncentive: 0, stdOther: 270000, validFrom: '01/01/2026' },
    });
    expect((ok.data as { id: string }).id).toBeTruthy();
  });
});

describe('trips (OPS-01..04)', () => {
  it('fleet manager creates a trip; the server computes totals and denormalises names', async () => {
    const { data } = await as.FLEET_MANAGER.call('saveTrip')({
      data: { ...tripData(), totalDirectCost: 1, operatingProfit: 999999999 },
    });
    ids.trip = (data as { id: string }).id;
    const t = (await db.doc(`trips/${ids.trip}`).get()).data()!;
    expect(t).toMatchObject({
      tripDate: '2026-11-18',
      month: '2026-11',
      status: 'DELIVERED',
      totalDirectCost: 1410000,
      operatingProfit: 2590000,
      vehiclePlate: `BK${runId.toUpperCase()}`,
      driverName: 'Chauffeur Test',
      driverUserId: uid.DRIVER,
      bags: 800,
      createdBy: uid.FLEET_MANAGER,
    });
  });

  it.each(ROLES)('saveTrip as %s', async (r) => {
    const code = await errorCode(as[r].call('saveTrip')({ data: tripData() }));
    expect(code).toBe(r === 'OWNER' || r === 'FLEET_MANAGER' ? null : 'permission-denied');
  });

  it('returns field errors for invalid input', async () => {
    const f = await fieldsOf(as.FLEET_MANAGER.call('saveTrip')({ data: tripData({ fuelCost: 1.5, otherReason: '', tripDate: '31/02/2026' }) }));
    expect(Object.keys(f).sort()).toEqual(['fuelCost', 'otherReason', 'tripDate']);
  });

  it('refuses a truck that is not in service', async () => {
    const f = await fieldsOf(as.FLEET_MANAGER.call('saveTrip')({ data: tripData({ vehicleId: ids.out }) }));
    expect(f.vehicleId).toMatch(/non en service/);
  });

  it('driver can mark own trip delivered with a delivery note, not someone else’s', async () => {
    const planned = (await as.FLEET_MANAGER.call('saveTrip')({ data: tripData({ status: 'PLANNED' }) })).data as { id: string };
    await as.DRIVER.call('setTripStatus')({ id: planned.id, status: 'DELIVERED', deliveryNoteNo: 'BL-77' });
    expect((await db.doc(`trips/${planned.id}`).get()).data()).toMatchObject({ status: 'DELIVERED', deliveryNoteNo: 'BL-77' });

    const other = (await as.FLEET_MANAGER.call('saveTrip')({ data: tripData({ status: 'PLANNED', vehicleId: ids.bn, driverId: null }) }))
      .data as { id: string };
    expect(await errorCode(as.DRIVER.call('setTripStatus')({ id: other.id, status: 'DELIVERED' }))).toBe('permission-denied');
    expect(await errorCode(as.DRIVER.call('setTripStatus')({ id: planned.id, status: 'VALIDATED' }))).toBe('permission-denied');
  });

  it('validated trips are locked; unlock needs trip.unlock and a reason', async () => {
    await as.FLEET_MANAGER.call('setTripStatus')({ id: ids.trip, status: 'VALIDATED' });
    expect(await errorCode(as.FLEET_MANAGER.call('saveTrip')({ id: ids.trip, data: tripData({ fuelCost: 1 }) }))).toBe('failed-precondition');
    expect(await errorCode(as.FLEET_MANAGER.call('setTripStatus')({ id: ids.trip, status: 'DELIVERED', reason: 'x' }))).toBe('permission-denied');
    expect(await errorCode(as.ACCOUNTANT.call('setTripStatus')({ id: ids.trip, status: 'DELIVERED' }))).toBe('invalid-argument');
    await as.ACCOUNTANT.call('setTripStatus')({ id: ids.trip, status: 'DELIVERED', reason: 'Erreur carburant' });
    await as.FLEET_MANAGER.call('saveTrip')({ id: ids.trip, data: tripData({ fuelCost: 600000 }) });
    expect((await db.doc(`trips/${ids.trip}`).get()).get('operatingProfit')).toBe(2530000);
    const last = (await db.collection('audit_log').orderBy('seq', 'desc').limit(2).get()).docs.map((d) => d.data());
    expect(last[1]).toMatchObject({ action: 'status_change', reason: 'Erreur carburant', actorId: uid.ACCOUNTANT });
    expect(last[0]).toMatchObject({ action: 'update', entity: 'trip', before: { fuelCost: 540000 }, after: { fuelCost: 600000 } });
  });

  it('invalid transitions are refused', async () => {
    const t = (await as.FLEET_MANAGER.call('saveTrip')({ data: tripData() })).data as { id: string };
    await as.FLEET_MANAGER.call('setTripStatus')({ id: t.id, status: 'CANCELLED', reason: 'Doublon' });
    expect(await errorCode(as.OWNER.call('setTripStatus')({ id: t.id, status: 'DELIVERED' }))).toBe('failed-precondition');
  });
});

describe('expenses (§6.5)', () => {
  it('driver records own expense; cannot edit others; validated entries are locked', async () => {
    const own = (await as.DRIVER.call('saveExpense')({ data: { expenseDate: '17/11/2026', type: 'OTHER', amount: 50000, description: 'Ticket pesée' } }))
      .data as { id: string };
    const mgr = (await as.FLEET_MANAGER.call('saveExpense')({
      data: { expenseDate: '07/11/2026', type: 'REPAIR', amount: 2500000, description: 'Vidange', vehicleId: ids.bk },
    })).data as { id: string };
    expect((await db.doc(`expenses/${mgr.id}`).get()).data()).toMatchObject({ vehiclePlate: `BK${runId.toUpperCase()}`, status: 'RECORDED', month: '2026-11' });
    expect(await errorCode(as.DRIVER.call('saveExpense')({ id: mgr.id, data: { expenseDate: '07/11/2026', type: 'REPAIR', amount: 1, description: 'x' } }))).toBe(
      'permission-denied',
    );
    expect(await errorCode(as.FLEET_MANAGER.call('validateExpense')({ id: own.id }))).toBe('permission-denied');
    await as.ACCOUNTANT.call('validateExpense')({ id: own.id });
    expect(await errorCode(as.DRIVER.call('deleteExpense')({ id: own.id, reason: 'x' }))).toBe('failed-precondition');
    expect(await errorCode(as.FLEET_MANAGER.call('deleteExpense')({ id: mgr.id }))).toBe('invalid-argument');
  });

  it.each(['PROCUREMENT', 'INSPECTOR', 'CUSTOMS', 'VIEWER'] as Role[])('%s cannot record expenses', async (r) => {
    expect(
      await errorCode(as[r].call('saveExpense')({ data: { expenseDate: '17/11/2026', type: 'OTHER', amount: 1, description: 'x' } })),
    ).toBe('permission-denied');
  });
});

describe('opsSummary (§6.6)', () => {
  it('owner sees trips and expenses; driver sees own trips only', async () => {
    const period = { from: '01/11/2026', to: '30/11/2026' };
    const owner = (await as.OWNER.call('opsSummary')(period)).data as { total: { trips: number; expenses: number }; byVehicle: { plate: string }[] };
    expect(owner.total.trips).toBeGreaterThan(0);
    expect(owner.total.expenses).toBeGreaterThan(0);
    const driver = (await as.DRIVER.call('opsSummary')(period)).data as { total: { trips: number; expenses: number }; byVehicle: { plate: string }[] };
    expect(driver.total.expenses).toBe(0);
    expect(driver.byVehicle.map((v) => v.plate)).toEqual([`BK${runId.toUpperCase()}`]);
    expect(await errorCode(as.INSPECTOR.call('opsSummary')(period))).toBe('permission-denied');
    expect(await errorCode(as.OWNER.call('opsSummary')({ from: '30/11/2026', to: '01/11/2026' }))).toBe('invalid-argument');
  });

  it('the audit chain is intact after all operations', async () => {
    expect((await verifyStoredChain()).ok).toBe(true);
  });
});
