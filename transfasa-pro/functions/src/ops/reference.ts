import { HttpsError } from 'firebase-functions/v2/https';
import {
  cementCode,
  cementTypeInputSchema,
  destinationInputSchema,
  destinationKey,
  rateCardInputSchema,
} from '@transfasa/domain';
import { COL, db } from '../admin';
import { type Actor, auditedTransaction } from '../audit';
import { auditView, notFound, parseOrThrow, precondition, slug, stamps } from './common';

export const destinationId = (region: string, name: string) => `${slug(region)}--${slug(destinationKey(name))}`;

/** Destinations, cement types and rate cards (PRD §6.1, §6.3). */
export async function saveReference(actor: Actor, kind: unknown, id: string | null, raw: unknown): Promise<{ id: string }> {
  switch (kind) {
    case 'destination':
      return saveDestination(actor, id, raw);
    case 'cementType':
      return saveCementType(actor, id, raw);
    case 'rateCard':
      return saveRateCard(actor, id, raw);
    default:
      throw new HttpsError('invalid-argument', 'kind: destination | cementType | rateCard');
  }
}

async function saveDestination(actor: Actor, id: string | null, raw: unknown) {
  const input = parseOrThrow(destinationInputSchema, raw);
  const docId = id ?? destinationId(input.region, input.name);
  const ref = db.collection(COL.destinations).doc(docId);
  await auditedTransaction(actor, async (tx, record) => {
    const snap = await tx.get(ref);
    if (id && !snap.exists) throw notFound('Destination');
    if (!id && snap.exists)
      throw new HttpsError('already-exists', 'Destination déjà existante (Destination already exists)', {
        fields: { name: 'Destination déjà existante (Destination already exists)' },
      });
    if (snap.exists && snap.get('region') !== input.region)
      throw precondition('La région d’une destination ne peut pas changer', 'A destination’s region cannot change');
    const data = { ...input, key: destinationKey(input.name) };
    tx.set(ref, { ...data, ...stamps(actor, !snap.exists) }, { merge: true });
    record({ action: snap.exists ? 'update' : 'create', entity: 'destination', entityId: docId, before: auditView(snap.data()), after: data });
  });
  return { id: docId };
}

async function saveCementType(actor: Actor, id: string | null, raw: unknown) {
  const input = parseOrThrow(cementTypeInputSchema, raw);
  const code = id ?? cementCode(input.label);
  const ref = db.collection(COL.cementTypes).doc(code);
  await auditedTransaction(actor, async (tx, record) => {
    const snap = await tx.get(ref);
    if (id && !snap.exists) throw notFound('Type de ciment');
    if (!id && snap.exists)
      throw new HttpsError('already-exists', 'Type de ciment déjà existant (Cement type already exists)', {
        fields: { label: 'Type de ciment déjà existant (Cement type already exists)' },
      });
    const data = { ...input, code };
    tx.set(ref, { ...data, ...stamps(actor, !snap.exists) }, { merge: true });
    record({ action: snap.exists ? 'update' : 'create', entity: 'cement_type', entityId: code, before: auditView(snap.data()), after: data });
  });
  return { id: code };
}

async function saveRateCard(actor: Actor, id: string | null, raw: unknown) {
  const input = parseOrThrow(rateCardInputSchema, raw);
  const ref = id ? db.collection(COL.rateCards).doc(id) : db.collection(COL.rateCards).doc();
  await auditedTransaction(actor, async (tx, record) => {
    const [snap, dest, cement, vehicle] = await Promise.all([
      tx.get(ref),
      tx.get(db.collection(COL.destinations).doc(input.destinationId)),
      input.cementCode ? tx.get(db.collection(COL.cementTypes).doc(input.cementCode)) : Promise.resolve(null),
      input.vehicleId ? tx.get(db.collection(COL.vehicles).doc(input.vehicleId)) : Promise.resolve(null),
    ]);
    if (id && !snap.exists) throw notFound('Grille tarifaire');
    if (!dest.exists || dest.get('region') !== input.region) throw notFound('Destination');
    if (cement && !cement.exists) throw notFound('Type de ciment');
    if (vehicle && !vehicle.exists) throw notFound('Véhicule');
    const data = {
      ...input,
      destinationName: dest.get('name'),
      cementLabel: cement?.get('label') ?? null,
      vehiclePlate: vehicle?.get('plate') ?? null,
    };
    tx.set(ref, { ...data, ...stamps(actor, !snap.exists) }, { merge: true });
    record({ action: snap.exists ? 'update' : 'create', entity: 'rate_card', entityId: ref.id, before: auditView(snap.data()), after: data });
  });
  return { id: ref.id };
}
