import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { type Permission, type Scope, normaliseRoles, scopeFor } from '@transfasa/domain';
import type { Actor } from './audit';

/** Authenticated caller with their roles from the ID token (custom claims). */
export function requireAuth(req: CallableRequest<unknown>): Actor {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Connexion requise (Sign-in required)');
  return { uid: req.auth.uid, roles: normaliseRoles(req.auth.token.roles) };
}

/** Server-side permission check against the domain RBAC matrix (SEC-01). */
export function requirePermission(req: CallableRequest<unknown>, perm: Permission): Actor & { scope: Scope } {
  const actor = requireAuth(req);
  const scope = scopeFor(actor.roles, perm);
  if (!scope) throw new HttpsError('permission-denied', 'Accès refusé (Permission denied)');
  return { ...actor, scope };
}
