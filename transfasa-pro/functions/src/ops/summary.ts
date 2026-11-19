import { HttpsError } from 'firebase-functions/v2/https';
import { type OpsSummary, type Scope, type SummaryExpense, type SummaryTrip, parseDisplayDate, summarise } from '@transfasa/domain';
import { COL, db } from '../admin';
import type { Actor } from '../audit';

/**
 * Operations dashboard data (PRD §6.6), computed server-side so row-level scope is enforced:
 * a driver ('own') gets only their trips and no company expenses.
 */
export async function opsSummary(actor: Actor & { scope: Scope }, raw: unknown): Promise<OpsSummary & { from: string; to: string }> {
  const d = (raw ?? {}) as Record<string, unknown>;
  const from = parseDisplayDate(String(d.from ?? ''));
  const to = parseDisplayDate(String(d.to ?? ''));
  if (!from || !to || from > to) throw new HttpsError('invalid-argument', 'Période invalide (Invalid period)');
  const vehicleId = typeof d.vehicleId === 'string' && d.vehicleId ? d.vehicleId : null;

  let tq = db.collection(COL.trips).where('tripDate', '>=', from).where('tripDate', '<=', to);
  if (actor.scope !== 'all') tq = tq.where('driverUserId', '==', actor.uid);
  const [tripSnap, expSnap] = await Promise.all([
    tq.get(),
    actor.scope === 'all'
      ? db.collection(COL.expenses).where('expenseDate', '>=', from).where('expenseDate', '<=', to).get()
      : Promise.resolve(null),
  ]);

  const trips: SummaryTrip[] = tripSnap.docs
    .map((x) => x.data())
    .filter((t) => !vehicleId || t.vehicleId === vehicleId)
    .map((t) => ({
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
    }));
  const expenses: SummaryExpense[] = (expSnap?.docs ?? [])
    .map((x) => x.data())
    .filter((e) => !vehicleId || e.vehicleId === vehicleId)
    .map((e) => ({ expenseDate: e.expenseDate, amount: e.amount, vehicleId: e.vehicleId ?? null }));
  return { from, to, ...summarise(trips, expenses) };
}
