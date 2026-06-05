import { fmtGNF, fmtNum, fmtPct } from '../lib/format.js';

function Card({ label, value, sub, accent }) {
  return (
    <div className="card p-4 flex flex-col gap-1">
      <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">{label}</div>
      <div className={`text-xl md:text-2xl font-semibold ${accent || ''}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export default function KpiGrid({ kpis }) {
  const profitAccent =
    kpis.profit >= 0 ? 'text-emerald-600' : 'text-rose-600';
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      <Card label="Trips" value={fmtNum(kpis.trips)} sub={`${fmtNum(kpis.tons)} t hauled`} />
      <Card label="Revenue" value={fmtGNF(kpis.rev)} sub={`avg ${fmtGNF(kpis.avgRevPerTrip)}/trip`} />
      <Card
        label="Trip costs"
        value={fmtGNF(kpis.tripCost)}
        sub={`fuel + offload + other`}
      />
      <Card label="General expenses" value={fmtGNF(kpis.genExp)} sub="repairs, taxes, …" />
      <Card label="Net profit" value={fmtGNF(kpis.profit)} sub={`avg ${fmtGNF(kpis.avgProfitPerTrip)}/trip`} accent={profitAccent} />
      <Card label="Margin" value={fmtPct(kpis.margin)} sub={`rev − costs / rev`} accent={profitAccent} />
    </div>
  );
}
