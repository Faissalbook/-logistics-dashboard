import { beforeAll, describe, expect, it } from 'vitest';
import { ROLES, type Role, type AuditEntry } from '@transfasa/domain';
import { adminAuth, db } from '../../functions/src/admin';
import { createUserWithRoles } from '../../functions/src/users';
import { PASSWORD, clientAs, errorCode, runId } from './env';

const email = (tag: string) => `${tag.toLowerCase().replace('_', '-')}-${runId}@it.test`;
const system = { uid: 'system:test', roles: ['OWNER'] };
const uids = {} as Record<Role, string>;

async function auditEntries(): Promise<AuditEntry[]> {
  const snap = await db.collection('audit_log').orderBy('__name__').get();
  return snap.docs.map((d) => d.data() as AuditEntry);
}

beforeAll(async () => {
  for (const r of ROLES) {
    const { uid } = await createUserWithRoles(system, {
      email: email(r),
      password: PASSWORD,
      fullName: `IT ${r}`,
      roles: [r],
    });
    uids[r] = uid;
  }
});

describe('createUser — authorisation (SEC-01, SEC-04)', () => {
  it('rejects unauthenticated callers', async () => {
    const c = await clientAs(null);
    const code = await errorCode(c.call('createUser')({}));
    expect(code).toBe('unauthenticated');
  });

  it.each(ROLES)('role %s', async (role) => {
    const c = await clientAs(email(role));
    const res = c.call<object, { uid: string }>('createUser')({
      email: email(`new-by-${role}`),
      password: PASSWORD,
      fullName: `Created by ${role}`,
      roles: ['VIEWER'],
    });
    if (role === 'OWNER') {
      const { data } = await res;
      const user = await adminAuth.getUser(data.uid);
      expect(user.customClaims).toEqual({ roles: ['VIEWER'] });
      const profile = await db.doc(`users/${data.uid}`).get();
      expect(profile.get('roles')).toEqual(['VIEWER']);
    } else {
      expect(await errorCode(res)).toBe('permission-denied');
    }
  });

  it('validates input', async () => {
    const c = await clientAs(email('OWNER'));
    const create = c.call('createUser');
    expect(await errorCode(create({ email: 'bad', password: PASSWORD, fullName: 'X', roles: ['VIEWER'] }))).toBe(
      'invalid-argument',
    );
    expect(
      await errorCode(create({ email: email('x1'), password: PASSWORD, fullName: 'X', roles: ['ADMIN'] })),
    ).toBe('invalid-argument');
    expect(await errorCode(create({ email: email('x2'), password: PASSWORD, fullName: 'X', roles: [] }))).toBe(
      'invalid-argument',
    );
    expect(await errorCode(create({ email: email('DRIVER'), password: PASSWORD, fullName: 'X', roles: ['VIEWER'] }))).toBe(
      'already-exists',
    );
  });
});

describe('setUserRoles', () => {
  it('OWNER changes roles; claims, profile and audit entry follow', async () => {
    const c = await clientAs(email('OWNER'));
    await c.call('setUserRoles')({ uid: uids.VIEWER, roles: ['VIEWER', 'ACCOUNTANT'] });
    expect((await adminAuth.getUser(uids.VIEWER)).customClaims).toEqual({ roles: ['ACCOUNTANT', 'VIEWER'] });
    const last = (await auditEntries()).at(-1)!;
    expect(last).toMatchObject({
      action: 'role_change',
      entity: 'user',
      entityId: uids.VIEWER,
      actorId: uids.OWNER,
      actorRoles: ['OWNER'],
      before: { roles: ['VIEWER'] },
      after: { roles: ['ACCOUNTANT', 'VIEWER'] },
    });
    await c.call('setUserRoles')({ uid: uids.VIEWER, roles: ['VIEWER'] });
  });

  it('OWNER cannot remove their own OWNER role', async () => {
    const c = await clientAs(email('OWNER'));
    expect(await errorCode(c.call('setUserRoles')({ uid: uids.OWNER, roles: ['VIEWER'] }))).toBe(
      'failed-precondition',
    );
  });

  it('non-owners are denied', async () => {
    const c = await clientAs(email('FLEET_MANAGER'));
    expect(await errorCode(c.call('setUserRoles')({ uid: uids.DRIVER, roles: ['OWNER'] }))).toBe('permission-denied');
  });

  it('unknown user → not-found', async () => {
    const c = await clientAs(email('OWNER'));
    expect(await errorCode(c.call('setUserRoles')({ uid: 'nope', roles: ['VIEWER'] }))).toBe('not-found');
  });
});

describe('setUserDisabled', () => {
  it('disables and re-enables an account, audit-logged', async () => {
    const c = await clientAs(email('OWNER'));
    await c.call('setUserDisabled')({ uid: uids.INSPECTOR, disabled: true });
    expect((await adminAuth.getUser(uids.INSPECTOR)).disabled).toBe(true);
    expect(await errorCode(clientAs(email('INSPECTOR')))).not.toBeNull();
    await c.call('setUserDisabled')({ uid: uids.INSPECTOR, disabled: false });
    expect((await adminAuth.getUser(uids.INSPECTOR)).disabled).toBe(false);
    const actions = (await auditEntries()).slice(-2).map((e) => [e.action, e.after]);
    expect(actions).toEqual([
      ['user_disable', { disabled: true }],
      ['user_disable', { disabled: false }],
    ]);
  });
});

describe('recordSession (AUD-04)', () => {
  it('logs a fresh sign-in', async () => {
    const c = await clientAs(email('DRIVER'));
    const { data } = await c.call<void, { recorded: boolean }>('recordSession')();
    expect(data.recorded).toBe(true);
    expect((await auditEntries()).at(-1)).toMatchObject({ action: 'login', actorId: uids.DRIVER, entity: 'session' });
  });
});

describe('audit chain (AUD-01, AUD-02)', () => {
  it('stays linear under concurrent writes', async () => {
    const c = await clientAs(email('OWNER'));
    const set = c.call('setUserRoles');
    await Promise.all(
      Array.from({ length: 8 }, (_, i) => set({ uid: uids.VIEWER, roles: i % 2 ? ['VIEWER'] : ['VIEWER', 'DRIVER'] })),
    );
    await set({ uid: uids.VIEWER, roles: ['VIEWER'] });
    const entries = await auditEntries();
    entries.forEach((e, i) => expect(e.seq).toBe(i + 1));
    const { data } = await c.call<void, { ok: boolean; count: number }>('verifyAuditChain')();
    expect(data).toMatchObject({ ok: true, count: entries.length });
  });

  it('verification is limited to audit readers', async () => {
    expect((await (await clientAs(email('ACCOUNTANT'))).call<void, { ok: boolean }>('verifyAuditChain')()).data.ok).toBe(
      true,
    );
    expect(await errorCode((await clientAs(email('DRIVER'))).call('verifyAuditChain')())).toBe('permission-denied');
  });

  it('detects tampering', async () => {
    const ref = db.doc('audit_log/000000000002');
    const original = (await ref.get()).data()!;
    await ref.update({ after: { roles: ['OWNER'] } });
    const c = await clientAs(email('OWNER'));
    const { data } = await c.call<void, { ok: boolean; brokenAtSeq?: number }>('verifyAuditChain')();
    expect(data).toMatchObject({ ok: false, brokenAtSeq: 2 });
    await ref.set(original);
    expect((await c.call<void, { ok: boolean }>('verifyAuditChain')()).data.ok).toBe(true);
  });
});
