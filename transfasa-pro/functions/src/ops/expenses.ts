import { HttpsError } from 'firebase-functions/v2/https';
import { type Scope, can, cleanLabel, expenseInputSchema } from '@transfasa/domain';
import { COL, db } from '../admin';
import { type Actor, auditedTransaction } from '../audit';
import { auditView, notFound, parseOrThrow, precondition, stamps, today } from './common';

/** Create/edit an expense (PRD §6.5). Drivers ('own' scope) may only touch their own unvalidated entries. */
export async function saveExpense(actor: Actor & { scope: Scope }, id: string | null, raw: unknown): Promise<{ id: string }> {
  const input = parseOrThrow(expenseInputSchema(today()), raw);
  const ref = id ? db.collection(COL.expenses).doc(id) : db.collection(COL.expenses).doc();
  await auditedTransaction(actor, async (tx, record) => {
    const [snap, vehicle] = await Promise.all([
      tx.get(ref),
      input.vehicleId ? tx.get(db.collection(COL.vehicles).doc(input.vehicleId)) : Promise.resolve(null),
    ]);
    if (id && !snap.exists) throw notFound('Charge');
    const existing = snap.data();
    if (existing && actor.scope !== 'all' && existing.createdBy !== actor.uid)
      throw new HttpsError('permission-denied', 'Accès refusé (Permission denied)');
    if (existing?.status === 'VALIDATED')
      throw precondition('Charge validée : modification impossible', 'Validated expense cannot be edited');
    if (vehicle && !vehicle.exists) throw notFound('Véhicule');
    const data = {
      ...input,
      month: input.expenseDate.slice(0, 7),
      vehiclePlate: vehicle?.get('plate') ?? null,
      status: existing?.status ?? 'RECORDED',
      legacy: existing?.legacy ?? null,
    };
    tx.set(ref, { ...data, ...stamps(actor, !existing) }, { merge: true });
    record({ action: existing ? 'update' : 'create', entity: 'expense', entityId: ref.id, before: auditView(existing), after: data });
  });
  return { id: ref.id };
}

export async function deleteExpense(actor: Actor & { scope: Scope }, raw: unknown): Promise<void> {
  const d = (raw ?? {}) as Record<string, unknown>;
  const id = typeof d.id === 'string' ? d.id : '';
  const reason = typeof d.reason === 'string' ? cleanLabel(d.reason) : '';
  if (!id) throw new HttpsError('invalid-argument', 'id requis (id required)');
  if (!reason) throw new HttpsError('invalid-argument', 'Motif requis (Reason required)', { fields: { reason: 'Motif requis (Reason required)' } });
  const ref = db.collection(COL.expenses).doc(id);
  await auditedTransaction(actor, async (tx, record) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw notFound('Charge');
    if (actor.scope !== 'all' && snap.get('createdBy') !== actor.uid)
      throw new HttpsError('permission-denied', 'Accès refusé (Permission denied)');
    if (snap.get('status') === 'VALIDATED')
      throw precondition('Charge validée : suppression impossible', 'Validated expense cannot be deleted');
    tx.delete(ref);
    record({ action: 'delete', entity: 'expense', entityId: id, before: auditView(snap.data()), after: null, reason });
  });
}

export async function validateExpense(actor: Actor, raw: unknown): Promise<void> {
  const id = (raw as { id?: unknown } | null)?.id;
  if (typeof id !== 'string' || !id) throw new HttpsError('invalid-argument', 'id requis (id required)');
  if (!can(actor.roles, 'expense.validate')) throw new HttpsError('permission-denied', 'Accès refusé (Permission denied)');
  const ref = db.collection(COL.expenses).doc(id);
  await auditedTransaction(actor, async (tx, record) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw notFound('Charge');
    if (snap.get('status') === 'VALIDATED') return;
    tx.update(ref, { status: 'VALIDATED', validatedBy: actor.uid, validatedAt: new Date().toISOString(), ...stamps(actor, false) });
    record({ action: 'status_change', entity: 'expense', entityId: id, before: { status: snap.get('status') }, after: { status: 'VALIDATED' } });
  });
}
