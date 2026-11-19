import type { DocumentReference } from 'firebase-admin/firestore';
import { type LegacyImportPlan, type OpsSummary, bagsFor, computeTrip, summarise } from '@transfasa/domain';
import { COL, db } from '../admin';
import { type Actor, auditedTransaction } from '../audit';
import { stamps } from './common';
import { destinationId } from './reference';

export const MIGRATION_ACTOR: Actor = { uid: 'system:migration', roles: ['OWNER'] };
const CHUNK = 120; // ≤ 2 writes per row + head, well under Firestore's 500-write transaction limit

export interface ImportResult {
  vehicles: { created: number; existing: number };
  destinations: { created: number; existing: number };
  cementTypes: { created: number; existing: number };
  trips: { created: number; skipped: number };
  expenses: { created: number; skipped: number };
}

async function chunked<T>(rows: T[], fn: (chunk: T[]) => Promise<void>) {
  for (let i = 0; i < rows.length; i += CHUNK) await fn(rows.slice(i, i + CHUNK));
}

/**
 * Write an import plan (from planLegacyImport) to Firestore. Idempotent: documents get
 * deterministic ids (legacy-<id>, destination/cement codes) and existing ones are skipped,
 * so a re-run after the cut-over only adds new rows. Every created document is audit-logged.
 */
export async function importLegacyPlan(plan: LegacyImportPlan, source: string, actor = MIGRATION_ACTOR): Promise<ImportResult> {
  const reason = `Import ancienne application (legacy import) — ${source}`;
  const result: ImportResult = {
    vehicles: { created: 0, existing: 0 },
    destinations: { created: 0, existing: 0 },
    cementTypes: { created: 0, existing: 0 },
    trips: { created: 0, skipped: 0 },
    expenses: { created: 0, skipped: 0 },
  };

  // Vehicles (FLT-05 legacy onboarding) — matched by plate.
  const vehicleIds = new Map<string, string>();
  for (const plate of plan.plates) {
    const existing = await db.collection(COL.vehicles).where('plate', '==', plate).limit(1).get();
    if (!existing.empty) {
      vehicleIds.set(plate, existing.docs[0]!.id);
      result.vehicles.existing++;
      continue;
    }
    const ref = db.collection(COL.vehicles).doc();
    const data = {
      type: 'TRACTOR',
      plate,
      make: null,
      model: null,
      vin: null,
      year: null,
      status: 'ACTIVE',
      inServiceDate: null,
      ratedPayloadT: null,
      notes: null,
      currentDriverId: null,
      currentDriverName: null,
      currentDriverUserId: null,
      currentTrailerId: null,
      legacy: true,
    };
    await auditedTransaction(actor, async (tx, record) => {
      tx.create(ref, { ...data, ...stamps(actor, true) });
      record({ action: 'create', entity: 'vehicle', entityId: ref.id, after: data, reason });
    });
    vehicleIds.set(plate, ref.id);
    result.vehicles.created++;
  }

  // Destinations and cement types — deterministic ids.
  const destIds = new Map<string, string>();
  for (const d of plan.destinations) {
    const id = destinationId(d.region, d.name);
    destIds.set(`${d.region}|${d.key}`, id);
    const ref = db.collection(COL.destinations).doc(id);
    await auditedTransaction(actor, async (tx, record) => {
      if ((await tx.get(ref)).exists) return void result.destinations.existing++;
      const data = { region: d.region, name: d.name, key: d.key, distanceKm: null, active: true, legacyVariants: d.variants };
      tx.create(ref, { ...data, ...stamps(actor, true) });
      record({ action: 'create', entity: 'destination', entityId: id, after: data, reason });
      result.destinations.created++;
    });
  }
  const bagKg = new Map<string, number>();
  for (const c of plan.cementTypes) {
    const ref = db.collection(COL.cementTypes).doc(c.code);
    await auditedTransaction(actor, async (tx, record) => {
      const snap = await tx.get(ref);
      if (snap.exists) {
        bagKg.set(c.code, snap.get('bagKg') ?? 50);
        return void result.cementTypes.existing++;
      }
      const data = { code: c.code, label: c.label, bagKg: 50, active: true };
      tx.create(ref, { ...data, ...stamps(actor, true) });
      record({ action: 'create', entity: 'cement_type', entityId: c.code, after: data, reason });
      bagKg.set(c.code, 50);
      result.cementTypes.created++;
    });
  }

  // Trips — imported as VALIDATED (history), no driver (unknown in the old app).
  await chunked(plan.trips, async (rows) => {
    const refs = rows.map((t) => db.collection(COL.trips).doc(`legacy-${t.legacyId}`));
    await auditedTransaction(actor, async (tx, record) => {
      const snaps = await tx.getAll(...(refs as DocumentReference[]));
      rows.forEach((t, i) => {
        if (snaps[i]!.exists) return void result.trips.skipped++;
        const amounts = {
          transportRevenue: t.transportRevenue,
          offloadCost: t.offloadCost,
          fuelCost: t.fuelCost,
          driverIncentive: 0,
          otherCost: t.otherCost,
        };
        const data = {
          tripDate: t.tripDate,
          month: t.tripDate.slice(0, 7),
          vehicleId: vehicleIds.get(t.plate)!,
          vehiclePlate: t.plate,
          trailerId: null,
          trailerPlate: null,
          driverId: null,
          driverName: null,
          driverUserId: null,
          region: t.region,
          destinationId: destIds.get(`${t.region}|${t.destinationKey}`)!,
          destinationName: plan.destinations.find((d) => d.region === t.region && d.key === t.destinationKey)!.name,
          cementCode: t.cementCode,
          cementLabel: t.cementLabel,
          tonnage: t.tonnage,
          bags: bagsFor(t.tonnage, bagKg.get(t.cementCode) ?? 50),
          ...amounts,
          fuelLitres: null,
          otherReason: null,
          deliveryNoteNo: null,
          weighbridgeTicketNo: null,
          rateCardId: null,
          status: 'VALIDATED',
          validatedBy: actor.uid,
          validatedAt: new Date().toISOString(),
          ...computeTrip(amounts),
          legacy: { id: t.legacyId, ...t.legacy },
        };
        tx.create(refs[i]!, { ...data, ...stamps(actor, true) });
        record({ action: 'create', entity: 'trip', entityId: refs[i]!.id, after: data, reason });
        result.trips.created++;
      });
    });
  });

  await chunked(plan.expenses, async (rows) => {
    const refs = rows.map((e) => db.collection(COL.expenses).doc(`legacy-${e.legacyId}`));
    await auditedTransaction(actor, async (tx, record) => {
      const snaps = await tx.getAll(...(refs as DocumentReference[]));
      rows.forEach((e, i) => {
        if (snaps[i]!.exists) return void result.expenses.skipped++;
        const data = {
          expenseDate: e.expenseDate,
          month: e.expenseDate.slice(0, 7),
          type: e.type,
          amount: e.amount,
          description: e.description,
          vehicleId: e.plate ? vehicleIds.get(e.plate)! : null,
          vehiclePlate: e.plate,
          status: 'VALIDATED',
          validatedBy: actor.uid,
          validatedAt: new Date().toISOString(),
          legacy: { id: e.legacyId, ...e.legacy },
        };
        tx.create(refs[i]!, { ...data, ...stamps(actor, true) });
        record({ action: 'create', entity: 'expense', entityId: refs[i]!.id, after: data, reason });
        result.expenses.created++;
      });
    });
  });

  return result;
}

/** Summary of everything stored (all periods), for reconciliation against the old app. */
export async function storedSummary(): Promise<OpsSummary> {
  const [trips, expenses] = await Promise.all([db.collection(COL.trips).get(), db.collection(COL.expenses).get()]);
  return summarise(
    trips.docs.map((d) => {
      const t = d.data();
      return {
        tripDate: t.tripDate,
        status: t.status,
        vehicleId: t.vehicleId,
        vehiclePlate: t.vehiclePlate,
        region: t.region,
        cementCode: t.cementCode,
        cementLabel: t.cementLabel,
        driverId: t.driverId ?? null,
        driverName: t.driverName ?? null,
        tonnage: t.tonnage,
        transportRevenue: t.transportRevenue,
        totalDirectCost: t.totalDirectCost,
      };
    }),
    expenses.docs.map((d) => ({ expenseDate: d.get('expenseDate'), amount: d.get('amount'), vehicleId: d.get('vehicleId') ?? null })),
  );
}
