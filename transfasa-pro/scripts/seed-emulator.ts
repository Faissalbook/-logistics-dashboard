/**
 * Emulator-only seed: one login per role, for local development and E2E tests.
 * Refuses to run against a real project. Creates no business data (CNV-08).
 */
import { ROLES, type Role } from '../packages/domain/src/index';

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error('Refusing to seed: FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST must be set.');
  process.exit(1);
}
process.env.GCLOUD_PROJECT ??= 'demo-transfasa';

export const SEED_PASSWORD = 'Transfasa#2026';
export const seedEmail = (role: Role) => `${role.toLowerCase().replace('_', '-')}@transfasa.test`;

const { adminAuth } = await import('../functions/src/admin');
const { createUserWithRoles } = await import('../functions/src/users');

const system = { uid: 'system:seed', roles: ['OWNER'] };
for (const role of ROLES) {
  const email = seedEmail(role);
  const existing = await adminAuth.getUserByEmail(email).catch(() => null);
  if (existing) continue;
  await createUserWithRoles(system, {
    email,
    password: SEED_PASSWORD,
    fullName: `Test ${role}`,
    roles: [role],
  });
  console.log(`seeded ${email} [${role}]`);
}
console.log(`Password for all seeded accounts: ${SEED_PASSWORD}`);

/**
 * --e2e: minimal operations fixtures for browser tests. Plates are obviously fake (E2E…)
 * so they can never be mistaken for the real fleet.
 */
if (process.argv.includes('--e2e')) {
  const { db } = await import('../functions/src/admin');
  if (!(await db.collection('vehicles').where('plate', '==', 'E2E001').limit(1).get()).empty) {
    console.log('e2e fixtures already present');
  } else {
    const { saveVehicle, saveDriver, assignVehicle } = await import('../functions/src/ops/fleet');
    const { saveReference } = await import('../functions/src/ops/reference');
    const driverUser = await adminAuth.getUserByEmail(seedEmail('DRIVER'));
    const t1 = await saveVehicle(system, null, { type: 'TRACTOR', plate: 'E2E001', make: 'Sinotruk', model: 'HOWO' });
    await saveVehicle(system, null, { type: 'TRACTOR', plate: 'E2E002', make: 'Shacman', model: 'X3000' });
    const d = await saveDriver(system, null, { fullName: 'Chauffeur E2E', userId: driverUser.uid });
    await assignVehicle(system, { vehicleId: t1.id, driverId: d.id, fromDate: '2026-01-01' });
    const dest = await saveReference(system, 'destination', null, { region: 'Coyah', name: 'Coyah-Centre' });
    await saveReference(system, 'destination', null, { region: 'Conakry', name: 'Sonfonia' });
    const cem = await saveReference(system, 'cementType', null, { label: 'CIMII/AP42.5 N' });
    await saveReference(system, 'rateCard', null, {
      region: 'Coyah', destinationId: dest.id, basis: 'PER_TRIP', revenueRate: 4000000,
      stdFuel: 540000, stdOffload: 600000, stdIncentive: 0, stdOther: 0, validFrom: '2026-01-01',
    });
    void cem;
    console.log('e2e fixtures seeded');
  }
}
