/**
 * Append-only, hash-chained audit log (PRD AUD-01..05).
 * hash = sha256(prevHash + "\n" + canonicalJson(entry without hash))
 * The hash function is injected so this module stays platform-neutral.
 */

export const AUDIT_GENESIS_HASH = '0'.repeat(64);

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'status_change'
  | 'login'
  | 'login_failed'
  | 'role_change'
  | 'user_create'
  | 'user_disable'
  | 'export'
  | 'period_close'
  | 'settings_change';

export interface AuditPayload {
  /** ISO-8601 UTC timestamp. */
  at: string;
  actorId: string;
  actorRoles: string[];
  action: AuditAction;
  entity: string;
  entityId: string;
  before: unknown;
  after: unknown;
  requestId: string;
  reason?: string | null;
}

export interface AuditEntry extends AuditPayload {
  seq: number;
  prevHash: string;
  hash: string;
}

export type HashFn = (input: string) => string;

/** Deterministic JSON: sorted object keys, no undefined, Dates as ISO strings. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(normalise(value));
}

function normalise(value: unknown): unknown {
  if (value === undefined) return null;
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) return null;
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalise);
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    const v = (value as Record<string, unknown>)[key];
    if (v !== undefined) out[key] = normalise(v);
  }
  return out;
}

export function hashAuditEntry(entry: Omit<AuditEntry, 'hash'>, sha256: HashFn): string {
  return sha256(`${entry.prevHash}\n${canonicalJson(entry)}`);
}

/** Build the next entry in the chain. */
export function chainAuditEntry(
  payload: AuditPayload,
  head: { seq: number; hash: string } | null,
  sha256: HashFn,
): AuditEntry {
  const base = {
    ...payload,
    reason: payload.reason ?? null,
    seq: head ? head.seq + 1 : 1,
    prevHash: head ? head.hash : AUDIT_GENESIS_HASH,
  };
  return { ...base, hash: hashAuditEntry(base, sha256) };
}

export type ChainVerification =
  | { ok: true; count: number; headHash: string }
  | { ok: false; count: number; brokenAtSeq: number; reason: 'seq_gap' | 'prev_hash_mismatch' | 'hash_mismatch' };

/** Verify entries ordered by seq ascending, starting at seq 1. */
export function verifyAuditChain(entries: readonly AuditEntry[], sha256: HashFn): ChainVerification {
  let prev = AUDIT_GENESIS_HASH;
  let expectedSeq = 1;
  for (const e of entries) {
    if (e.seq !== expectedSeq) return { ok: false, count: entries.length, brokenAtSeq: e.seq, reason: 'seq_gap' };
    if (e.prevHash !== prev)
      return { ok: false, count: entries.length, brokenAtSeq: e.seq, reason: 'prev_hash_mismatch' };
    const { hash, ...rest } = e;
    if (hashAuditEntry(rest, sha256) !== hash)
      return { ok: false, count: entries.length, brokenAtSeq: e.seq, reason: 'hash_mismatch' };
    prev = hash;
    expectedSeq++;
  }
  return { ok: true, count: entries.length, headHash: prev };
}
