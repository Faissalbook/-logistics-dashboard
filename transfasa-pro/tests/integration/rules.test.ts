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
import { ROLES, type Role, can } from '@transfasa/domain';
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
