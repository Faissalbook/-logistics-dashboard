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
