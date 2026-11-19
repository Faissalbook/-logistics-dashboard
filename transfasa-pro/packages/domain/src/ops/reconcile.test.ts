import { describe, expect, it } from 'vitest';
import { reconcile } from './reconcile';
import { summarise } from './summary';

describe('reconcile', () => {
  const s = summarise(
    [{ tripDate: '2026-01-03', status: 'VALIDATED', vehicleId: 'a', vehiclePlate: 'BK2195', region: 'Coyah', cementCode: 'c', cementLabel: 'c', driverId: null, driverName: null, tonnage: 40, transportRevenue: 4000000, totalDirectCost: 1410000 }],
    [],
  );
  const legacy = {
    total: { voyages: 1, tonnage: 40, revenu: 4000000, couts: 1410000, profit_operationnel: 2590000, depenses_generales: 0, profit_net: 2590000 },
    par_mois: [{ mois: '2026-01', voyages: 1, tonnage: 40, revenu: 4000000, couts: 1410000, depenses: 0, profit_net: 2590000 }],
    par_camion: [{ camion: 'BK2195', voyages: 1, tonnage: 40, revenu: 4000000, couts: 1410000, depenses_camion: 0 }],
    par_region: [{ region: 'Coyah', voyages: 1, tonnage: 40, revenu: 4000000, couts: 1410000 }],
  };
  it('passes when every figure matches', () => {
    expect(reconcile(legacy, s).ok).toBe(true);
  });
  it('reports the exact differing line, including missing scopes', () => {
    const r = reconcile({ ...legacy, total: { ...legacy.total, revenu: 4000001 }, par_camion: [...legacy.par_camion, { camion: 'XX', voyages: 1, tonnage: 1, revenu: 1, couts: 0, depenses_camion: 0 }] }, s);
    expect(r.ok).toBe(false);
    expect(r.lines.filter((l) => !l.ok).map((l) => `${l.scope}.${l.metric}`)).toEqual([
      'total.revenue', 'XX.trips', 'XX.tonnage', 'XX.revenue', 'XX.directCosts', 'XX.truckExpenses',
    ]);
  });
});
