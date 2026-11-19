import { HttpsError } from 'firebase-functions/v2/https';
import {
  type Scope,
  TRIP_TRANSITIONS,
  type TripStatus,
  bagsFor,
  can,
  cleanLabel,
  scopeFor,
  computeTrip,
  tripInputSchema,
  tripStatusSchema,
} from '@transfasa/domain';
import { COL, db } from '../admin';
import { type Actor, auditedTransaction } from '../audit';
import { auditView, notFound, parseOrThrow, precondition, stamps, today } from './common';

const LOCKED: TripStatus[] = ['VALIDATED', 'CANCELLED'];

/** Create or edit a trip (OPS-01..04). Amounts and derived fields are computed here, never trusted from the client. */
export async function saveTrip(actor: Actor & { scope: Scope }, id: string | null, raw: unknown): Promise<{ id: string }> {
  if (actor.scope !== 'all') throw new HttpsError('permission-denied', 'Accès refusé (Permission denied)');
  const input = parseOrThrow(tripInputSchema(today()), raw);
  const ref = id ? db.collection(COL.trips).doc(id) : db.collection(COL.trips).doc();

  await auditedTransaction(actor, async (tx, record) => {
    const [snap, vehicle, driver, trailer, dest, cement] = await Promise.all([
      tx.get(ref),
      tx.get(db.collection(COL.vehicles).doc(input.vehicleId)),
      input.driverId ? tx.get(db.collection(COL.drivers).doc(input.driverId)) : Promise.resolve(null),
      input.trailerId ? tx.get(db.collection(COL.vehicles).doc(input.trailerId)) : Promise.resolve(null),
      tx.get(db.collection(COL.destinations).doc(input.destinationId)),
      tx.get(db.collection(COL.cementTypes).doc(input.cementCode)),
    ]);
    if (id && !snap.exists) throw notFound('Voyage');
    const existing = snap.data();
    if (existing && LOCKED.includes(existing.status))
      throw precondition('Voyage validé ou annulé : modification impossible', 'Validated or cancelled trip cannot be edited');

    const vehicleChanged = !existing || existing.vehicleId !== input.vehicleId;
    if (!vehicle.exists || vehicle.get('type') !== 'TRACTOR') throw notFound('Camion');
    if (vehicleChanged && vehicle.get('status') !== 'ACTIVE')
      throw new HttpsError('failed-precondition', 'Camion non en service (Truck not active)', {
        fields: { vehicleId: 'Camion non en service (Truck not active)' },
      });
    if (driver && !driver.exists) throw notFound('Chauffeur');
    if (trailer && (!trailer.exists || trailer.get('type') !== 'TRAILER')) throw notFound('Remorque');
    if (!dest.exists || dest.get('region') !== input.region)
      throw new HttpsError('invalid-argument', 'Destination hors région (Destination not in region)', {
        fields: { destinationId: 'Destination hors région (Destination not in region)' },
      });
    if (!cement.exists) throw notFound('Type de ciment');

    const computed = computeTrip(input);
    const data = {
      ...input,
      status: existing?.status ?? input.status,
      month: input.tripDate.slice(0, 7),
      bags: input.bags ?? bagsFor(input.tonnage, cement.get('bagKg') ?? 50),
      vehiclePlate: vehicle.get('plate'),
      trailerPlate: trailer?.get('plate') ?? null,
      driverName: driver?.get('fullName') ?? null,
      driverUserId: driver?.get('userId') ?? null,
      destinationName: dest.get('name'),
      cementLabel: cement.get('label'),
      ...computed,
      legacy: existing?.legacy ?? null,
    };
    tx.set(ref, { ...data, ...stamps(actor, !existing) }, { merge: true });
    record({ action: existing ? 'update' : 'create', entity: 'trip', entityId: ref.id, before: auditView(existing), after: data });
  });
  return { id: ref.id };
}

/**
 * Status changes (OPS-04):
 *  - IN_PROGRESS / DELIVERED: trip.write (a driver only on own trips; may add delivery note / ticket numbers)
 *  - VALIDATED: trip.validate
 *  - CANCELLED: trip.write on all trips + reason
 *  - VALIDATED → DELIVERED (unlock): trip.unlock + reason
 */
export async function setTripStatus(actor: Actor, raw: unknown): Promise<{ status: TripStatus }> {
  const d = (raw ?? {}) as Record<string, unknown>;
  const id = typeof d.id === 'string' && d.id ? d.id : null;
  if (!id) throw new HttpsError('invalid-argument', 'id requis (id required)');
  const to = parseOrThrow(tripStatusSchema, d.status);
  const reason = typeof d.reason === 'string' ? cleanLabel(d.reason) || null : null;
  const deliveryNoteNo = typeof d.deliveryNoteNo === 'string' ? cleanLabel(d.deliveryNoteNo).slice(0, 60) || null : undefined;
  const weighbridgeTicketNo =
    typeof d.weighbridgeTicketNo === 'string' ? cleanLabel(d.weighbridgeTicketNo).slice(0, 60) || null : undefined;
  const ref = db.collection(COL.trips).doc(id);

  await auditedTransaction(actor, async (tx, record) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw notFound('Voyage');
    const from = snap.get('status') as TripStatus;
    if (!TRIP_TRANSITIONS[from].includes(to))
      throw precondition(`Transition impossible ${from} → ${to}`, `Invalid transition ${from} → ${to}`);

    const deny = () => new HttpsError('permission-denied', 'Accès refusé (Permission denied)');
    const ownTrip = snap.get('driverUserId') === actor.uid;
    const writeAll = scopeFor(actor.roles, 'trip.write') === 'all';
    const unlock = from === 'VALIDATED';
    if (unlock) {
      if (!can(actor.roles, 'trip.unlock')) throw deny();
    } else if (to === 'VALIDATED') {
      if (!can(actor.roles, 'trip.validate')) throw deny();
    } else if (to === 'CANCELLED') {
      if (!writeAll) throw deny();
    } else if (!writeAll && !(can(actor.roles, 'trip.write') && ownTrip)) {
      throw deny();
    }
    if ((unlock || to === 'CANCELLED') && !reason)
      throw new HttpsError('invalid-argument', 'Motif requis (Reason required)', { fields: { reason: 'Motif requis (Reason required)' } });

    const patch: Record<string, unknown> = { status: to };
    if (deliveryNoteNo !== undefined) patch.deliveryNoteNo = deliveryNoteNo;
    if (weighbridgeTicketNo !== undefined) patch.weighbridgeTicketNo = weighbridgeTicketNo;
    if (to === 'VALIDATED') Object.assign(patch, { validatedAt: new Date().toISOString(), validatedBy: actor.uid });
    tx.update(ref, { ...patch, ...stamps(actor, false) });
    record({ action: 'status_change', entity: 'trip', entityId: id, before: { status: from }, after: patch, reason });
  });
  return { status: to };
}
