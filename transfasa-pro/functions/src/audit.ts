import { createHash, randomUUID } from 'node:crypto';
import type { QueryDocumentSnapshot, Transaction } from 'firebase-admin/firestore';
import {
  type AuditAction,
  type AuditEntry,
  type AuditPayload,
  type ChainVerification,
  chainAuditEntry,
  verifyAuditChain,
} from '@transfasa/domain';
import { COL, DOC, db } from './admin';

export const sha256 = (s: string): string => createHash('sha256').update(s, 'utf8').digest('hex');

const headRef = () => db.collection(COL.system).doc(DOC.auditHead);
const entryId = (seq: number) => String(seq).padStart(12, '0');

export interface Actor {
  uid: string;
  roles: string[];
}

export interface AuditRecord {
  action: AuditAction;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
}

export type Recorder = (rec: AuditRecord) => void;

/**
 * Run `fn` in a Firestore transaction and append every audit record it emits to the
 * hash chain in the same transaction (AUD-01/02). The chain head is read first, so
 * concurrent writers serialise on it and the chain can never fork.
 * `fn` must do all of its own reads before its writes (Firestore rule).
 */
export async function auditedTransaction<T>(
  actor: Actor,
  fn: (tx: Transaction, record: Recorder) => Promise<T>,
  requestId: string = randomUUID(),
): Promise<T> {
  return db.runTransaction(async (tx) => {
    const headSnap = await tx.get(headRef());
    const records: AuditRecord[] = [];
    const result = await fn(tx, (r) => records.push(r));

    let head = headSnap.exists ? (headSnap.data() as { seq: number; hash: string }) : null;
    const at = new Date().toISOString();
    for (const r of records) {
      const payload: AuditPayload = {
        at,
        actorId: actor.uid,
        actorRoles: [...actor.roles],
        action: r.action,
        entity: r.entity,
        entityId: r.entityId,
        before: r.before ?? null,
        after: r.after ?? null,
        requestId,
        reason: r.reason ?? null,
      };
      const entry = chainAuditEntry(payload, head, sha256);
      tx.create(db.collection(COL.auditLog).doc(entryId(entry.seq)), entry);
      head = { seq: entry.seq, hash: entry.hash };
    }
    if (head && records.length > 0) tx.set(headRef(), { seq: head.seq, hash: head.hash, updatedAt: at });
    return result;
  });
}

/** Append a single audit entry with no other writes. */
export function appendAudit(actor: Actor, rec: AuditRecord): Promise<void> {
  return auditedTransaction(actor, async (_tx, record) => {
    record(rec);
  });
}

/** Read the whole chain in pages and verify it. */
export async function verifyStoredChain(pageSize = 500): Promise<ChainVerification> {
  const entries: AuditEntry[] = [];
  let last: QueryDocumentSnapshot | null = null;
  for (;;) {
    let q = db.collection(COL.auditLog).orderBy('__name__').limit(pageSize);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    for (const d of snap.docs) entries.push(d.data() as AuditEntry);
    if (snap.size < pageSize) break;
    last = snap.docs[snap.docs.length - 1]!;
  }
  const result = verifyAuditChain(entries, sha256);
  if (result.ok) {
    const head = await headRef().get();
    const h = head.data() as { seq: number; hash: string } | undefined;
    if (entries.length > 0 && (!h || h.seq !== entries.length || h.hash !== result.headHash)) {
      return { ok: false, count: entries.length, brokenAtSeq: entries.length, reason: 'hash_mismatch' };
    }
  }
  return result;
}
