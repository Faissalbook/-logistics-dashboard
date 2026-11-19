import { type OpsSummary, canAll, formatDate, formatGNF, formatGNFNumber } from '@transfasa/domain';
import { label } from '@transfasa/i18n';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { Stacked } from '../components/Bilingual';
import { SelectField } from '../components/Form';
import { Kpi, tone } from '../components/Kpi';
import { PeriodPicker } from '../components/Period';
import { type Column, Table } from '../components/Table';
import { useReferenceData } from '../lib/data';
import { errorMessage } from '../lib/errors';
import { callable } from '../lib/firebase';
import { type Period, periodFor } from '../lib/period';

type Summary = OpsSummary & { from: string; to: string };
const t = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });
const g = formatGNFNumber;

const MONTHS_FR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const monthLabel = (ym: string) => `${MONTHS_FR[Number(ym.slice(5)) - 1]} ${ym.slice(0, 4)}`;

export function OpsDashboard() {
  const { roles } = useAuth();
  const ownOnly = !canAll(roles, 'dashboard.ops');
  const [period, setPeriod] = useState<Period>(periodFor('year'));
  const [vehicleId, setVehicleId] = useState('');
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { vehicles } = useReferenceData();

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    callable<object, Summary>('opsSummary')({ from: period.from, to: period.to, vehicleId: vehicleId || null })
      .then((r) => live && setData(r.data))
      .catch((e) => live && setError(errorMessage(e)))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [period.from, period.to, vehicleId]);

  const s = data?.total;
  const tractors = (vehicles.rows ?? []).filter((v) => v.type === 'TRACTOR');

  const base = <R extends { trips: number; tonnage: number; revenue: number; directCosts: number; operatingProfit: number }>(): Column<R>[] => [
    { k: 'kpi.trips', cell: (r) => r.trips, total: s?.trips, align: 'right' },
    { k: 'kpi.tonnage', cell: (r) => t(r.tonnage), total: s && t(s.tonnage), align: 'right' },
    { k: 'kpi.revenue', cell: (r) => g(r.revenue), total: s && g(s.revenue), align: 'right' },
    { k: 'kpi.directCosts', cell: (r) => g(r.directCosts), total: s && g(s.directCosts), align: 'right' },
    { k: 'kpi.operatingProfit', cell: (r) => g(r.operatingProfit), total: s && g(s.operatingProfit), align: 'right' },
  ];

  return (
    <section className="min-w-0 space-y-5" aria-busy={loading}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <PeriodPicker value={period} onChange={setPeriod} />
        {!ownOnly && tractors.length > 1 && (
          <div className="w-full lg:w-56">
            <SelectField
              k="trip.truck"
              value={vehicleId}
              onChange={setVehicleId}
              placeholder="trip.all"
              options={tractors.map((v) => ({ value: v.id, label: v.plate }))}
            />
          </div>
        )}
      </div>
      <p className="text-sm text-cement-700">
        {label('period.label')}: {formatDate(period.from)} – {formatDate(period.to)}
        {loading && <Loader2 size={14} className="ml-2 inline animate-spin" aria-label={label('app.loading')} />}
      </p>
      {error && (
        <p className="card p-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {s && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi k="kpi.trips" value={String(s.trips)} testId="kpi-trips" />
            <Kpi k="kpi.tonnage" value={`${t(s.tonnage)} t`} />
            <Kpi k="kpi.revenue" value={formatGNF(s.revenue)} testId="kpi-revenue" />
            <Kpi k="kpi.directCosts" value={formatGNF(s.directCosts)} />
            <Kpi k="kpi.operatingProfit" value={formatGNF(s.operatingProfit)} tone={tone(s.operatingProfit)} />
            {!ownOnly && <Kpi k="kpi.expenses" value={formatGNF(s.expenses)} />}
            {!ownOnly && <Kpi k="kpi.netProfit" value={formatGNF(s.netProfit)} tone={tone(s.netProfit)} testId="kpi-net" />}
            {!ownOnly && <Kpi k="kpi.netMargin" value={s.netMarginPct === null ? '—' : `${s.netMarginPct.toFixed(1)} %`} />}
            <Kpi k="kpi.avgRevenue" value={s.avgRevenuePerTrip === null ? '—' : formatGNF(s.avgRevenuePerTrip)} />
            <Kpi k="kpi.avgTonnage" value={s.avgTonnagePerTrip === null ? '—' : `${t(s.avgTonnagePerTrip)} t`} />
            <Kpi k="kpi.revenuePerTonne" value={s.revenuePerTonne === null ? '—' : formatGNF(s.revenuePerTonne)} />
          </div>

          <h2 className="pt-2 text-lg font-bold text-brand-900">
            <Stacked k="kpi.byMonth" />
          </h2>
          <Table
            testId="by-month"
            rows={data.byMonth}
            rowKey={(r) => r.month}
            columns={[
              { k: 'kpi.month', cell: (r) => monthLabel(r.month), total: label('common.total') },
              ...base(),
              ...(ownOnly
                ? []
                : ([
                    { k: 'kpi.expenses', cell: (r) => g(r.expenses), total: g(s.expenses), align: 'right' },
                    { k: 'kpi.netProfit', cell: (r) => g(r.netProfit), total: g(s.netProfit), align: 'right' },
                  ] as Column<Summary['byMonth'][number]>[])),
            ]}
          />

          <h2 className="pt-2 text-lg font-bold text-brand-900">
            <Stacked k="kpi.byTruck" />
          </h2>
          <Table
            testId="by-truck"
            rows={data.byVehicle}
            rowKey={(r) => r.vehicleId}
            columns={[
              { k: 'trip.truck', cell: (r) => <span className="font-semibold">{r.plate}</span>, total: label('common.total') },
              ...base(),
              ...(ownOnly
                ? []
                : ([
                    {
                      k: 'kpi.truckExpenses',
                      cell: (r) => g(r.expenses),
                      total: g(data.byVehicle.reduce((a, r) => a + r.expenses, 0)),
                      align: 'right',
                    },
                  ] as Column<Summary['byVehicle'][number]>[])),
            ]}
          />

          <div className="grid grid-cols-1 gap-5">
            <div className="min-w-0 space-y-3">
              <h2 className="text-lg font-bold text-brand-900">
                <Stacked k="kpi.byRegion" />
              </h2>
              <Table
                rows={data.byRegion}
                rowKey={(r) => r.region}
                columns={[{ k: 'trip.region', cell: (r) => r.region, total: label('common.total') }, ...base()]}
              />
            </div>
            <div className="min-w-0 space-y-3">
              <h2 className="text-lg font-bold text-brand-900">
                <Stacked k="kpi.byCement" />
              </h2>
              <Table
                rows={data.byCement}
                rowKey={(r) => r.cementCode}
                columns={[{ k: 'trip.cement', cell: (r) => r.label, total: label('common.total') }, ...base()]}
              />
            </div>
          </div>

          {!ownOnly && data.byDriver.some((d) => d.driverId) && (
            <>
              <h2 className="pt-2 text-lg font-bold text-brand-900">
                <Stacked k="kpi.byDriver" />
              </h2>
              <Table
                rows={data.byDriver}
                rowKey={(r) => r.driverId ?? '-'}
                columns={[{ k: 'trip.driver', cell: (r) => r.name ?? label('ref.notSet'), total: label('common.total') }, ...base()]}
              />
            </>
          )}
        </>
      )}
    </section>
  );
}
