import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (getApps().length === 0) initializeApp();

export const db = getFirestore();
export const adminAuth = getAuth();

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
