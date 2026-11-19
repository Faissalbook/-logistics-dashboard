import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { type ZodType, type ZodTypeDef, ZodError } from 'zod';
import { fieldErrors, todayISO } from '@transfasa/domain';
import type { Actor } from '../audit';

/** Validate with a domain schema; field errors go to the client in `details.fields` for inline display. */
export function parseOrThrow<T>(schema: ZodType<T, ZodTypeDef, unknown>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (e) {
    if (e instanceof ZodError) {
      const fields = fieldErrors(e);
      const first = Object.values(fields)[0] ?? 'Données invalides (Invalid data)';
      throw new HttpsError('invalid-argument', first, { fields });
    }
    throw e;
  }
}

export const today = () => todayISO();

export const stamps = (actor: Actor, isNew: boolean) => ({
  ...(isNew ? { createdAt: FieldValue.serverTimestamp(), createdBy: actor.uid } : {}),
  updatedAt: FieldValue.serverTimestamp(),
  updatedBy: actor.uid,
});

const META = new Set(['createdAt', 'createdBy', 'updatedAt', 'updatedBy', 'validatedAt', 'rolesUpdatedAt']);

/** Business fields only (no server timestamps), for audit before/after. */
export function auditView(data: FirebaseFirestore.DocumentData | undefined | null): Record<string, unknown> | null {
  if (!data) return null;
  return Object.fromEntries(Object.entries(data).filter(([k]) => !META.has(k)));
}

export const notFound = (what: string) => new HttpsError('not-found', `${what} introuvable (${what} not found)`);
export const precondition = (fr: string, en: string) => new HttpsError('failed-precondition', `${fr} (${en})`);

export function optionalId(data: unknown): string | null {
  const id = (data as { id?: unknown } | null)?.id;
  if (id === undefined || id === null || id === '') return null;
  if (typeof id !== 'string' || id.length > 128) throw new HttpsError('invalid-argument', 'id invalide (invalid id)');
  return id;
}

export function requiredId(data: unknown, key = 'id'): string {
  const v = (data as Record<string, unknown> | null)?.[key];
  if (typeof v !== 'string' || !v || v.length > 128) throw new HttpsError('invalid-argument', `${key} requis (${key} required)`);
  return v;
}

/** URL-safe slug used for deterministic ids (destinations). */
export const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
