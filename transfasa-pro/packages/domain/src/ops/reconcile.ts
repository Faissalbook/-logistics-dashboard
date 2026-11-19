import type { OpsSummary } from './summary';

/** The current app's dashboard export (resume_transfassa). */
export interface LegacySummary {
  total: {
    voyages: number;
    tonnage: number;
    revenu: number;
    couts: number;
    profit_operationnel: number;
    depenses_generales: number;
    profit_net: number;
  };
  par_mois: { mois: string; voyages: number; tonnage: number; revenu: number; couts: number; depenses: number; profit_net: number }[];
  par_camion: { camion: string; voyages: number; tonnage: number; revenu: number; couts: number; depenses_camion: number }[];
  par_region: { region: string; voyages: number; tonnage: number; revenu: number; couts: number }[];
}

export interface ReconLine {
  scope: string;
  metric: string;
  legacy: number;
  migrated: number;
  ok: boolean;
}

/** Compare migrated figures with the old app's summary, line by line (P1 acceptance). */
export function reconcile(legacy: LegacySummary, s: OpsSummary): { ok: boolean; lines: ReconLine[] } {
  const lines: ReconLine[] = [];
  const cmp = (scope: string, metric: string, a: number, b: number | undefined) =>
    lines.push({ scope, metric, legacy: a, migrated: b ?? NaN, ok: a === b });

  const t = legacy.total;
  cmp('total', 'trips', t.voyages, s.total.trips);
  cmp('total', 'tonnage', t.tonnage, s.total.tonnage);
  cmp('total', 'revenue', t.revenu, s.total.revenue);
  cmp('total', 'directCosts', t.couts, s.total.directCosts);
  cmp('total', 'operatingProfit', t.profit_operationnel, s.total.operatingProfit);
  cmp('total', 'expenses', t.depenses_generales, s.total.expenses);
  cmp('total', 'netProfit', t.profit_net, s.total.netProfit);

  for (const m of legacy.par_mois) {
    const x = s.byMonth.find((y) => y.month === m.mois);
    cmp(m.mois, 'trips', m.voyages, x?.trips);
    cmp(m.mois, 'tonnage', m.tonnage, x?.tonnage);
    cmp(m.mois, 'revenue', m.revenu, x?.revenue);
    cmp(m.mois, 'directCosts', m.couts, x?.directCosts);
    cmp(m.mois, 'expenses', m.depenses, x?.expenses);
    cmp(m.mois, 'netProfit', m.profit_net, x?.netProfit);
  }
  for (const c of legacy.par_camion) {
    const x = s.byVehicle.find((y) => y.plate === c.camion);
    cmp(c.camion, 'trips', c.voyages, x?.trips);
    cmp(c.camion, 'tonnage', c.tonnage, x?.tonnage);
    cmp(c.camion, 'revenue', c.revenu, x?.revenue);
    cmp(c.camion, 'directCosts', c.couts, x?.directCosts);
    cmp(c.camion, 'truckExpenses', c.depenses_camion, x?.expenses);
  }
  for (const r of legacy.par_region) {
    const x = s.byRegion.find((y) => y.region === r.region);
    cmp(r.region, 'trips', r.voyages, x?.trips);
    cmp(r.region, 'tonnage', r.tonnage, x?.tonnage);
    cmp(r.region, 'revenue', r.revenu, x?.revenue);
    cmp(r.region, 'directCosts', r.couts, x?.directCosts);
  }
  return { ok: lines.every((l) => l.ok), lines };
}
