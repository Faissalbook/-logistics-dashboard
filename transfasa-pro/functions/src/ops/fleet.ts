import { HttpsError } from 'firebase-functions/v2/https';
import {
  type AssignmentInput,
  type DriverInput,
  type VehicleInput,
  assignmentInputSchema,
  driverInputSchema,
  vehicleInputSchema,
} from '@transfasa/domain';
import { COL, db } from '../admin';
import { type Actor, auditedTransaction } from '../audit';
import { auditView, notFound, parseOrThrow, precondition, stamps } from './common';

/** Create or update a vehicle (legacy onboarding, FLT-05). Plate and VIN are unique. */
export async function saveVehicle(actor: Actor, id: string | null, raw: unknown): Promise<{ id: string }> {
  const input: VehicleInput = parseOrThrow(vehicleInputSchema, raw);
  const ref = id ? db.collection(COL.vehicles).doc(id) : db.collection(COL.vehicles).doc();
  await auditedTransaction(actor, async (tx, record) => {
    const [snap, samePlate, sameVin] = await Promise.all([
      tx.get(ref),
      tx.get(db.collection(COL.vehicles).where('plate', '==', input.plate).limit(2)),
      input.vin ? tx.get(db.collection(COL.vehicles).where('vin', '==', input.vin).limit(2)) : Promise.resolve(null),
    ]);
    if (id && !snap.exists) throw notFound('Véhicule');
    if (samePlate.docs.some((d) => d.id !== ref.id))
      throw new HttpsError('already-exists', `Immatriculation déjà utilisée (Plate already in use): ${input.plate}`, {
        fields: { plate: 'Immatriculation déjà utilisée (Plate already in use)' },
      });
    if (sameVin?.docs.some((d) => d.id !== ref.id))
      throw new HttpsError('already-exists', 'VIN déjà utilisé (VIN already in use)', {
        fields: { vin: 'VIN déjà utilisé (VIN already in use)' },
      });
    const before = auditView(snap.data());
    if (before && before.type !== input.type)
      throw precondition('Le type de véhicule ne peut pas changer', 'Vehicle type cannot change');
    const data = {
      ...input,
      ...(snap.exists
        ? {}
        : { currentDriverId: null, currentDriverName: null, currentDriverUserId: null, currentTrailerId: null, legacy: false }),
      ...stamps(actor, !snap.exists),
    };
    tx.set(ref, data, { merge: true });
    record({ action: snap.exists ? 'update' : 'create', entity: 'vehicle', entityId: ref.id, before, after: { ...before, ...input } });
  });
  return { id: ref.id };
}

export async function saveDriver(actor: Actor, id: string | null, raw: unknown): Promise<{ id: string }> {
  const input: DriverInput = parseOrThrow(driverInputSchema, raw);
  const ref = id ? db.collection(COL.drivers).doc(id) : db.collection(COL.drivers).doc();
  await auditedTransaction(actor, async (tx, record) => {
    const [snap, user, assigned] = await Promise.all([
      tx.get(ref),
      input.userId ? tx.get(db.collection(COL.users).doc(input.userId)) : Promise.resolve(null),
      tx.get(db.collection(COL.vehicles).where('currentDriverId', '==', ref.id)),
    ]);
    if (id && !snap.exists) throw notFound('Chauffeur');
    if (user && !user.exists) throw notFound('Utilisateur');
    if (!input.active && !assigned.empty)
      throw precondition('Chauffeur affecté à un camion — retirez l’affectation d’abord', 'Driver is assigned to a truck — unassign first');
    const before = auditView(snap.data());
    tx.set(ref, { ...input, ...stamps(actor, !snap.exists) }, { merge: true });
    // Keep denormalised driver fields on the truck in sync.
    for (const v of assigned.docs)
      tx.update(v.ref, { currentDriverName: input.fullName, currentDriverUserId: input.userId ?? null });
    record({ action: snap.exists ? 'update' : 'create', entity: 'driver', entityId: ref.id, before, after: input });
  });
  return { id: ref.id };
}

/** Assign (or unassign with null) a driver and default trailer to a tractor; keeps history. */
export async function assignVehicle(actor: Actor, raw: unknown): Promise<{ id: string }> {
  const input: AssignmentInput = parseOrThrow(assignmentInputSchema, raw);
  const vehicleRef = db.collection(COL.vehicles).doc(input.vehicleId);
  const newRef = db.collection(COL.assignments).doc();
  await auditedTransaction(actor, async (tx, record) => {
    const [vehicle, driver, trailer, open, driverElsewhere] = await Promise.all([
      tx.get(vehicleRef),
      input.driverId ? tx.get(db.collection(COL.drivers).doc(input.driverId)) : Promise.resolve(null),
      input.trailerId ? tx.get(db.collection(COL.vehicles).doc(input.trailerId)) : Promise.resolve(null),
      tx.get(db.collection(COL.assignments).where('vehicleId', '==', input.vehicleId).where('toDate', '==', null)),
      input.driverId
        ? tx.get(db.collection(COL.vehicles).where('currentDriverId', '==', input.driverId))
        : Promise.resolve(null),
    ]);
    if (!vehicle.exists) throw notFound('Véhicule');
    if (vehicle.get('type') !== 'TRACTOR') throw precondition('Seul un tracteur reçoit un chauffeur', 'Only a tractor takes a driver');
    if (driver && (!driver.exists || !driver.get('active'))) throw notFound('Chauffeur');
    if (trailer && (!trailer.exists || trailer.get('type') !== 'TRAILER')) throw notFound('Remorque');
    if (driverElsewhere?.docs.some((d) => d.id !== input.vehicleId))
      throw precondition('Chauffeur déjà affecté à un autre camion', 'Driver already assigned to another truck');

    const before = {
      driverId: vehicle.get('currentDriverId') ?? null,
      trailerId: vehicle.get('currentTrailerId') ?? null,
    };
    for (const a of open.docs) tx.update(a.ref, { toDate: input.fromDate, ...stamps(actor, false) });
    tx.set(newRef, {
      vehicleId: input.vehicleId,
      driverId: input.driverId,
      trailerId: input.trailerId,
      fromDate: input.fromDate,
      toDate: null,
      ...stamps(actor, true),
    });
    tx.update(vehicleRef, {
      currentDriverId: input.driverId,
      currentDriverName: driver?.get('fullName') ?? null,
      currentDriverUserId: driver?.get('userId') ?? null,
      currentTrailerId: input.trailerId,
      ...stamps(actor, false),
    });
    record({
      action: 'update',
      entity: 'vehicle_assignment',
      entityId: input.vehicleId,
      before,
      after: { driverId: input.driverId, trailerId: input.trailerId, fromDate: input.fromDate },
    });
  });
  return { id: newRef.id };
}
