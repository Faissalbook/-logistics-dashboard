import {
  type Query,
  type DocumentData,
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  type QueryConstraint,
} from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { type Permission, type RateCard, canAll, can } from '@transfasa/domain';
import { useAuth } from '../auth/AuthProvider';
import { errorMessage } from './errors';
import { db } from './firebase';

export type WithId<T> = T & { id: string };

/** Live Firestore query. `key` must change whenever the query changes. */
export function useLiveQuery<T>(build: () => Query<DocumentData> | null, key: string) {
  const [rows, setRows] = useState<WithId<T>[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const q = build();
    if (!q) {
      setRows([]);
      return;
    }
    setRows(null);
    setError(null);
    return onSnapshot(
      q,
      (snap) => setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) }))),
      (e) => setError(errorMessage(e)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { rows, error, loading: rows === null && !error };
}

export interface Vehicle {
  type: 'TRACTOR' | 'TRAILER';
  plate: string;
  make: string | null;
  model: string | null;
  vin: string | null;
  year: number | null;
  status: 'ACTIVE' | 'IN_MAINTENANCE' | 'OUT_OF_SERVICE' | 'DISPOSED';
  inServiceDate: string | null;
  ratedPayloadT: number | null;
  notes: string | null;
  currentDriverId: string | null;
  currentDriverName: string | null;
  currentTrailerId: string | null;
  legacy?: boolean;
}
export interface Driver {
  fullName: string;
  phone: string | null;
  licenceNo: string | null;
  licenceExpiry: string | null;
  userId: string | null;
  active: boolean;
}
export interface Destination {
  region: string;
  name: string;
  key: string;
  distanceKm: number | null;
  active: boolean;
  legacyVariants?: Record<string, number>;
}
export interface CementType {
  code: string;
  label: string;
  bagKg: number;
  active: boolean;
}
export type RateCardDoc = Omit<RateCard, 'id'> & {
  destinationName: string;
  cementLabel: string | null;
  vehiclePlate: string | null;
};
export interface Trip {
  tripDate: string;
  month: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'DELIVERED' | 'VALIDATED' | 'CANCELLED';
  vehicleId: string;
  vehiclePlate: string;
  trailerId: string | null;
  trailerPlate: string | null;
  driverId: string | null;
  driverName: string | null;
  region: string;
  destinationId: string;
  destinationName: string;
  cementCode: string;
  cementLabel: string;
  tonnage: number;
  bags: number | null;
  transportRevenue: number;
  offloadCost: number;
  fuelCost: number;
  fuelLitres: number | null;
  driverIncentive: number;
  otherCost: number;
  otherReason: string | null;
  deliveryNoteNo: string | null;
  weighbridgeTicketNo: string | null;
  rateCardId: string | null;
  totalDirectCost: number;
  operatingProfit: number;
  legacy: { id: string } | null;
}
export interface Expense {
  expenseDate: string;
  type: 'REPAIR' | 'TYRES' | 'INSURANCE' | 'TAXES' | 'SALARY' | 'OTHER';
  amount: number;
  description: string;
  vehicleId: string | null;
  vehiclePlate: string | null;
  status: 'RECORDED' | 'VALIDATED';
  createdBy: string;
  legacy: { id: string } | null;
}

const byPerm = (roles: string[], perm: Permission) => can(roles, perm);

/** Reference data used across forms (live). Each list loads only if the user may read it. */
export function useReferenceData() {
  const { roles } = useAuth();
  const readVehicles = canAll(roles, 'vehicle.read');
  const readDrivers = canAll(roles, 'trip.read');
  const readRef = byPerm(roles, 'refData.read');
  const vehicles = useLiveQuery<Vehicle>(() => (readVehicles ? query(collection(db, 'vehicles'), orderBy('plate')) : null), `v${readVehicles}`);
  const drivers = useLiveQuery<Driver>(() => (readDrivers ? query(collection(db, 'drivers'), orderBy('fullName')) : null), `d${readDrivers}`);
  const destinations = useLiveQuery<Destination>(
    () => (readRef ? query(collection(db, 'destinations'), orderBy('name')) : null),
    `ds${readRef}`,
  );
  const cementTypes = useLiveQuery<CementType>(() => (readRef ? query(collection(db, 'cement_types'), orderBy('label')) : null), `c${readRef}`);
  const rateCards = useLiveQuery<RateCardDoc>(() => (readRef ? collection(db, 'rate_cards') : null), `r${readRef}`);
  return { vehicles, drivers, destinations, cementTypes, rateCards };
}

export function tripsQuery(from: string, to: string, ownUid: string | null, extra: QueryConstraint[] = []) {
  const c: QueryConstraint[] = [where('tripDate', '>=', from), where('tripDate', '<=', to)];
  if (ownUid) c.unshift(where('driverUserId', '==', ownUid));
  return query(collection(db, 'trips'), ...c, orderBy('tripDate', 'desc'), ...extra);
}

export function useIndex<T>(rows: WithId<T>[] | null) {
  return useMemo(() => new Map((rows ?? []).map((r) => [r.id, r])), [rows]);
}
