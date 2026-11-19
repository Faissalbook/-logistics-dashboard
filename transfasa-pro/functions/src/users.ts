import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { type Role, isRole, normaliseRoles } from '@transfasa/domain';
import { COL, adminAuth, db } from './admin';
import { type Actor, auditedTransaction } from './audit';

export interface CreateUserInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string | null;
  roles: Role[];
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseCreateUserInput(data: unknown): CreateUserInput {
  const d = (data ?? {}) as Record<string, unknown>;
  const email = typeof d.email === 'string' ? d.email.trim().toLowerCase() : '';
  const password = typeof d.password === 'string' ? d.password : '';
  const fullName = typeof d.fullName === 'string' ? d.fullName.trim() : '';
  const phone = typeof d.phone === 'string' && d.phone.trim() ? d.phone.trim() : null;
  const roles = parseRoles(d.roles);
  if (!EMAIL.test(email)) throw new HttpsError('invalid-argument', 'E-mail invalide (Invalid email)');
  if (password.length < 8)
    throw new HttpsError('invalid-argument', 'Au moins 8 caractères (At least 8 characters)');
  if (!fullName) throw new HttpsError('invalid-argument', 'Nom complet requis (Full name required)');
  return { email, password, fullName, phone, roles };
}

export function parseRoles(value: unknown): Role[] {
  if (!Array.isArray(value) || value.some((r) => !isRole(r)))
    throw new HttpsError('invalid-argument', 'Rôle inconnu (Unknown role)');
  const roles = normaliseRoles(value);
  if (roles.length === 0)
    throw new HttpsError('invalid-argument', 'Choisir au moins un rôle (Select at least one role)');
  return roles;
}

/** Create an Auth user + profile doc + claims, audit-logged (PRD §2, AUD-04). */
export async function createUserWithRoles(actor: Actor, input: CreateUserInput): Promise<{ uid: string }> {
  let uid: string;
  try {
    const rec = await adminAuth.createUser({
      email: input.email,
      password: input.password,
      displayName: input.fullName,
    });
    uid = rec.uid;
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === 'auth/email-already-exists')
      throw new HttpsError('already-exists', 'E-mail déjà utilisé (Email already in use)');
    throw e;
  }

  const profile = {
    email: input.email,
    fullName: input.fullName,
    phone: input.phone ?? null,
    roles: input.roles,
    disabled: false,
  };
  try {
    await auditedTransaction(actor, async (tx, record) => {
      tx.create(db.collection(COL.users).doc(uid), {
        ...profile,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: actor.uid,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: actor.uid,
        rolesUpdatedAt: FieldValue.serverTimestamp(),
      });
      record({ action: 'user_create', entity: 'user', entityId: uid, before: null, after: profile });
    });
    await adminAuth.setCustomUserClaims(uid, { roles: input.roles });
  } catch (e) {
    // Keep Auth and Firestore consistent: roll back the Auth account if the profile failed.
    await adminAuth.deleteUser(uid).catch(() => undefined);
    throw e;
  }
  return { uid };
}

/** Replace a user's roles (OWNER only, enforced by the caller). */
export async function setRoles(actor: Actor, uid: string, roles: Role[]): Promise<void> {
  if (uid === actor.uid && !roles.includes('OWNER'))
    throw new HttpsError(
      'failed-precondition',
      'Vous ne pouvez pas retirer votre propre rôle de gérant (You cannot remove your own owner role)',
    );
  const ref = db.collection(COL.users).doc(uid);
  await auditedTransaction(actor, async (tx, record) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', 'Utilisateur introuvable (User not found)');
    const before = normaliseRoles(snap.get('roles'));
    tx.update(ref, {
      roles,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid,
      rolesUpdatedAt: FieldValue.serverTimestamp(),
    });
    record({ action: 'role_change', entity: 'user', entityId: uid, before: { roles: before }, after: { roles } });
  });
  await adminAuth.setCustomUserClaims(uid, { roles });
}

/** Enable/disable an account; disabling also revokes refresh tokens. */
export async function setDisabled(actor: Actor, uid: string, disabled: boolean): Promise<void> {
  if (uid === actor.uid)
    throw new HttpsError('failed-precondition', 'Action impossible sur votre propre compte (Not allowed on your own account)');
  const ref = db.collection(COL.users).doc(uid);
  await auditedTransaction(actor, async (tx, record) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', 'Utilisateur introuvable (User not found)');
    tx.update(ref, { disabled, updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid });
    record({
      action: 'user_disable',
      entity: 'user',
      entityId: uid,
      before: { disabled: Boolean(snap.get('disabled')) },
      after: { disabled },
    });
  });
  await adminAuth.updateUser(uid, { disabled });
  if (disabled) await adminAuth.revokeRefreshTokens(uid);
}
