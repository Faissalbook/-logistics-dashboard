/**
 * One-time creation of the first OWNER account in a real project (PRD §2: roles are
 * OWNER-assigned, so the first OWNER must be created out of band).
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=sa.json GCLOUD_PROJECT=<project> \
 *     npx tsx scripts/bootstrap-owner.ts <email> "<Full Name>"
 *
 * Prompts for nothing; prints a random temporary password to change at first sign-in.
 */
import { randomBytes } from 'node:crypto';

const [email, fullName] = process.argv.slice(2);
if (!email || !fullName) {
  console.error('Usage: tsx scripts/bootstrap-owner.ts <email> "<Full Name>"');
  process.exit(1);
}

const { db, COL } = await import('../functions/src/admin');
const { createUserWithRoles } = await import('../functions/src/users');

const owners = await db.collection(COL.users).where('roles', 'array-contains', 'OWNER').limit(1).get();
if (!owners.empty) {
  console.error('An OWNER already exists. Use the Users screen to add more accounts.');
  process.exit(1);
}

const password = randomBytes(12).toString('base64url');
const { uid } = await createUserWithRoles({ uid: 'system:bootstrap', roles: ['OWNER'] }, {
  email,
  password,
  fullName,
  roles: ['OWNER'],
});
console.log(`OWNER created: ${email} (uid ${uid})`);
console.log(`Temporary password: ${password}`);
