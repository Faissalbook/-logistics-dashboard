import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (getApps().length === 0) initializeApp();

/**
 * Firestore database id. '(default)' locally; a named database (e.g. "transfasa") when
 * TransFasa shares a Firebase project with another app, so neither app touches the other's data.
 * Set per project in functions/.env.<projectId>.
 */
export const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || '(default)';
export const db = DATABASE_ID === '(default)' ? getFirestore() : getFirestore(getApp(), DATABASE_ID);
export const adminAuth = getAuth();

/** Set the TransFasa roles claim without erasing claims another app on the same project may use. */
export async function setRolesClaim(uid: string, roles: string[]): Promise<void> {
  const user = await adminAuth.getUser(uid);
  await adminAuth.setCustomUserClaims(uid, { ...(user.customClaims ?? {}), roles });
}

/** Firestore collection & document names (PRD §8, mapped to Firestore). */
export const COL = {
  users: 'users',
  auditLog: 'audit_log',
  system: 'system',
  settings: 'settings',
  vehicles: 'vehicles',
  drivers: 'drivers',
  assignments: 'vehicle_assignments',
  destinations: 'destinations',
  cementTypes: 'cement_types',
  rateCards: 'rate_cards',
  trips: 'trips',
  expenses: 'expenses',
} as const;

export const DOC = {
  auditHead: 'audit_head',
  auditVerification: 'audit_verification',
} as const;
