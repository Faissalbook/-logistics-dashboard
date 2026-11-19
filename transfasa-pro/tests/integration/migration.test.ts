import { describe, expect, it } from 'vitest';
import { type LegacySummary, planLegacyImport, reconcile } from '@transfasa/domain';
import { db } from '../../functions/src/admin';
import { verifyStoredChain } from '../../functions/src/audit';
import { importLegacyPlan, storedSummary } from '../../functions/src/ops/legacyImport';

/** PRD §12 / P1 acceptance on a synthetic export (the real export is never committed). */
const trips = [
  { id: 'm1', date: '03/01/2026', truck: 'MG0001', cement: 'CIMII/AP42.5 N', region: 'Coyah', dest: 'Coyah-Centre', tonnage: 40, transport: 4000000, offload: 600000, fuel_cost: 540000, other: 270000, total_cost: 1410000, profit: 2590000 },
  { id: 'm2', date: '04/01/2026', truck: 'MG 0001', cement: 'CIMII/AP42.5 N', region: 'Coyah', dest: 'Coyah Centre', tonnage: 40, transport: 4000000, offload: 600000, fuel_cost: 540000, other: 270000 },
  { id: 'm3', date: '05/02/2026', truck: 'MG0002', cement: 'CIMI/42.5 R CPA', region: 'Dubreka', dest: 'Ouassou', tonnage: 35.5, transport: 3000000, offload: 500000, fuel_cost: 480000, other: 0 },
  { id: 'm4', date: '06/02/2026', truck: 'AL7834', cement: 'CIMI/42.5 R CPA', region: 'Conakry', dest: 'Kipé', tonnage: 35, transport: 1, offload: 0, fuel_cost: 0, other: 0 },
];
const expenses = [
  { id: 'x1', date: '10/01/2026', type: 'Repair', amount: 2500000, description: 'Vidange', truck: 'MG0001' },
  { id: 'x2', date: '11/02/2026', type: 'Tires', amount: 4600000, description: '2 tires MG0002', truck: null },
];
const legacy: LegacySummary = {
  total: { voyages: 3, tonnage: 115.5, revenu: 11000000, couts: 3800000, profit_operationnel: 7200000, depenses_generales: 7100000, profit_net: 100000 },
  par_mois: [
    { mois: '2026-01', voyages: 2, tonnage: 80, revenu: 8000000, couts: 2820000, depenses: 2500000, profit_net: 2680000 },
    { mois: '2026-02', voyages: 1, tonnage: 35.5, revenu: 3000000, couts: 980000, depenses: 4600000, profit_net: -2580000 },
  ],
  par_camion: [
    { camion: 'MG0001', voyages: 2, tonnage: 80, revenu: 8000000, couts: 2820000, depenses_camion: 2500000 },
    { camion: 'MG0002', voyages: 1, tonnage: 35.5, revenu: 3000000, couts: 980000, depenses_camion: 0 },
  ],
  par_region: [
    { region: 'Coyah', voyages: 2, tonnage: 80, revenu: 8000000, couts: 2820000 },
    { region: 'Dubréka', voyages: 1, tonnage: 35.5, revenu: 3000000, couts: 980000 },
  ],
};

describe('legacy migration', () => {
  it('imports, excludes the retired plate, reconciles to the franc, and is idempotent', async () => {
    // Isolate from other suites' data in the shared emulator.
    for (const c of ['trips', 'expenses']) {
      const snap = await db.collection(c).get();
      await Promise.all(snap.docs.map((d) => d.ref.delete()));
    }
    const plan = planLegacyImport({ trips, expenses }, ['MG0001', 'MG0002']);
    expect(plan.issues.filter((i) => i.level === 'error').map((i) => [i.legacyId, i.code])).toEqual([['m4', 'retired_plate']]);

    const first = await importLegacyPlan(plan, 'test');
    expect(first.trips).toEqual({ created: 3, skipped: 0 });
    expect(first.expenses).toEqual({ created: 2, skipped: 0 });
    expect(first.destinations.created).toBe(2);

    const recon = reconcile(legacy, await storedSummary());
    expect(recon.lines.filter((l) => !l.ok)).toEqual([]);

    const t = (await db.doc('trips/legacy-m2').get()).data()!;
    expect(t).toMatchObject({ status: 'VALIDATED', vehiclePlate: 'MG0001', destinationName: 'Coyah Centre', legacy: { id: 'm2', dest: 'Coyah Centre' } });
    expect((await db.doc('expenses/legacy-x2').get()).get('vehicleId')).toBeNull();

    const again = await importLegacyPlan(plan, 'test');
    expect(again.trips).toEqual({ created: 0, skipped: 3 });
    expect((await verifyStoredChain()).ok).toBe(true);
  });
});
