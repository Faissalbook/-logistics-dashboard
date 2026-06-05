import { useStore } from '../store/useStore.js';
import { fmtGNF, fmtNum, fmtDate } from '../lib/format.js';

export default function DrillDownDrawer() {
  const { drilldown, closeDrilldown } = useStore();
  if (!drilldown.open) return null;

  const total = drilldown.rows.reduce((a, t) => a + (t.transport_revenue || 0), 0);
  const profit = drilldown.rows.reduce((a, t) => a + (t.profit || 0), 0);
  const tons = drilldown.rows.reduce((a, t) => a + (t.tonnage_t || 0), 0);

  return (
    <div className="no-print fixed inset-0 z-40 flex">
      <div className="flex-1 bg-slate-900/40" onClick={closeDrilldown} />
      <aside className="w-full max-w-xl bg-white shadow-2xl border-l border-slate-200 flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <div>
            <div className="text-xs uppercase text-slate-500 font-semibold">Drill-down</div>
            <div className="text-base font-semibold">{drilldown.title}</div>
          </div>
          <button className="btn !py-1 !px-2" onClick={closeDrilldown}>
            Close
          </button>
        </header>
        <div className="grid grid-cols-3 gap-2 px-4 py-3 border-b border-slate-200 bg-slate-50">
          <Stat label="Trips" value={fmtNum(drilldown.rows.length)} />
          <Stat label="Revenue" value={fmtGNF(total)} />
          <Stat label="Profit" value={fmtGNF(profit)} accent={profit >= 0 ? 'text-emerald-600' : 'text-rose-600'} />
          <Stat label="Tons" value={fmtNum(tons)} />
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {drilldown.rows.map((t) => (
            <div key={t.trip_id} className="border border-slate-200 rounded-lg p-3 text-sm">
              <div className="flex justify-between font-medium">
                <span>
                  {fmtDate(t.date)} · {t.truck}
                </span>
                <span className={t.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                  {fmtGNF(t.profit)}
                </span>
              </div>
              <div className="text-slate-500 text-xs mt-1">
                {t.region} → {t.destination} · {fmtNum(t.tonnage_t)} t · Revenue {fmtGNF(t.transport_revenue)} · Fuel {fmtGNF(t.fuel_cost)}
              </div>
            </div>
          ))}
          {!drilldown.rows.length && (
            <div className="text-center text-slate-500 py-8">No trips in selection</div>
          )}
        </div>
      </aside>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-sm font-semibold ${accent || ''}`}>{value}</div>
    </div>
  );
}
