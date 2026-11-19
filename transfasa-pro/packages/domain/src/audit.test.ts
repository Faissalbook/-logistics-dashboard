import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { AUDIT_GENESIS_HASH, type AuditEntry, canonicalJson, chainAuditEntry, verifyAuditChain } from './audit';

const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

const payload = (i: number) => ({
  at: `2026-11-19T10:00:0${i}.000Z`,
  actorId: 'uid-owner',
  actorRoles: ['OWNER'],
  action: 'update' as const,
  entity: 'trip',
  entityId: `t${i}`,
  before: { fuel_cost: 480000 },
  after: { fuel_cost: 540000 + i },
  requestId: `req-${i}`,
});

function buildChain(n: number): AuditEntry[] {
  const out: AuditEntry[] = [];
  for (let i = 0; i < n; i++) out.push(chainAuditEntry(payload(i), out.at(-1) ?? null, sha256));
  return out;
}

describe('canonicalJson', () => {
  it('is independent of key order and drops undefined', () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: undefined, e: [3, { z: 1, y: 2 }] } })).toBe(
      '{"a":{"d":2,"e":[3,{"y":2,"z":1}]},"b":1}',
    );
    expect(canonicalJson({ a: 1, b: 2 })).toBe(canonicalJson({ b: 2, a: 1 }));
  });
});

describe('audit hash chain (AUD-02)', () => {
  it('starts from genesis and links entries', () => {
    const chain = buildChain(3);
    expect(chain[0]!.seq).toBe(1);
    expect(chain[0]!.prevHash).toBe(AUDIT_GENESIS_HASH);
    expect(chain[1]!.prevHash).toBe(chain[0]!.hash);
    expect(verifyAuditChain(chain, sha256)).toEqual({ ok: true, count: 3, headHash: chain[2]!.hash });
  });

  it('detects a tampered payload', () => {
    const chain = buildChain(3);
    chain[1] = { ...chain[1]!, after: { fuel_cost: 1 } };
    expect(verifyAuditChain(chain, sha256)).toMatchObject({ ok: false, brokenAtSeq: 2, reason: 'hash_mismatch' });
  });

  it('detects a deleted entry', () => {
    const chain = buildChain(3);
    chain.splice(1, 1);
    expect(verifyAuditChain(chain, sha256)).toMatchObject({ ok: false, brokenAtSeq: 3, reason: 'seq_gap' });
  });

  it('detects a re-hashed forged entry via the next link', () => {
    const chain = buildChain(3);
    const forged = chainAuditEntry({ ...payload(1), after: { fuel_cost: 1 } }, chain[0]!, sha256);
    chain[1] = forged;
    expect(verifyAuditChain(chain, sha256)).toMatchObject({ ok: false, brokenAtSeq: 3, reason: 'prev_hash_mismatch' });
  });

  it('accepts an empty log', () => {
    expect(verifyAuditChain([], sha256)).toEqual({ ok: true, count: 0, headHash: AUDIT_GENESIS_HASH });
  });
});
