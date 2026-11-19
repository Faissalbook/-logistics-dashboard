import {
  COUNTED_TRIP_STATUSES,
  REGIONS,
  TRIP_STATUS_LABELS,
  TRIP_TRANSITIONS,
  type TripStatus,
  can,
  canAll,
  formatDate,
  formatGNF,
  formatGNFNumber,
} from '@transfasa/domain';
import { label } from '@transfasa/i18n';
import { CheckCircle2, ClipboardList, Copy, Loader2, Pencil, Plus, Truck, Unlock, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { Stacked } from '../components/Bilingual';
import { EmptyState } from '../components/EmptyState';
import { SelectField, both } from '../components/Form';
import { PeriodPicker } from '../components/Period';
import { ReasonDialog } from '../components/ReasonDialog';
import { type Trip, type WithId, tripsQuery, useLiveQuery } from '../lib/data';
import { errorMessage } from '../lib/errors';
import { callable } from '../lib/firebase';
import { type Period, periodFor } from '../lib/period';

const STATUS_STYLE: Record<TripStatus, string> = {
  PLANNED: 'bg-cement-100 text-cement-700',
  IN_PROGRESS: 'bg-brand-50 text-brand-700',
  DELIVERED: 'bg-amber-50 text-amber-800',
  VALIDATED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-red-50 text-red-700 line-through',
};

export function StatusBadge({ s }: { s: TripStatus }) {
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[s]}`}>{both(TRIP_STATUS_LABELS[s])}</span>;
}

export function TripsPage() {
  const { roles, user } = useAuth();
  const location = useLocation();
  const flash = (location.state as { flash?: string } | null)?.flash;
  const ownOnly = !canAll(roles, 'trip.read');
  const writeAll = canAll(roles, 'trip.write');
  const [period, setPeriod] = useState<Period>(periodFor('thisMonth'));
  const [filters, setFilters] = useState({ vehicle: '', region: '', cement: '', status: '' });
  const [dialog, setDialog] = useState<{ trip: WithId<Trip>; to: TripStatus } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { rows, error, loading } = useLiveQuery<Trip>(
    () => tripsQuery(period.from, period.to, ownOnly ? (user?.uid ?? '') : null),
    `${period.from}|${period.to}|${ownOnly}`,
  );

  const options = useMemo(() => {
    const uniq = (f: (t: Trip) => [string, string]) => [...new Map((rows ?? []).map(f)).entries()].map(([value, l]) => ({ value, label: l }));
    return {
      vehicles: uniq((t) => [t.vehicleId, t.vehiclePlate]).sort((a, b) => a.label.localeCompare(b.label)),
      cements: uniq((t) => [t.cementCode, t.cementLabel]),
    };
  }, [rows]);

  const shown = (rows ?? []).filter(
    (t) =>
      (!filters.vehicle || t.vehicleId === filters.vehicle) &&
      (!filters.region || t.region === filters.region) &&
      (!filters.cement || t.cementCode === filters.cement) &&
      (!filters.status || t.status === filters.status),
  );
  const counted = shown.filter((t) => COUNTED_TRIP_STATUSES.includes(t.status));
  const totals = counted.reduce(
    (a, t) => ({
      tonnage: a.tonnage + t.tonnage,
      revenue: a.revenue + t.transportRevenue,
      cost: a.cost + t.totalDirectCost,
      profit: a.profit + t.operatingProfit,
    }),
    { tonnage: 0, revenue: 0, cost: 0, profit: 0 },
  );

  const transition = async (t: WithId<Trip>, to: TripStatus, reason?: string) => {
    setBusyId(t.id);
    setActionError(null);
    try {
      await callable('setTripStatus')({ id: t.id, status: to, reason });
      setDialog(null);
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const actions = (t: WithId<Trip>) => {
    const next = TRIP_TRANSITIONS[t.status];
    const own = ownOnly;
    const list: { key: string; icon: typeof Pencil; text: string; run?: () => void; to?: string }[] = [];
    if (writeAll && !['VALIDATED', 'CANCELLED'].includes(t.status)) list.push({ key: 'edit', icon: Pencil, text: label('common.edit'), to: `/trips/${t.id}/edit` });
    if (writeAll) list.push({ key: 'dup', icon: Copy, text: label('trip.duplicate'), to: `/trips/new?from=${t.id}` });
    if (next.includes('DELIVERED') && t.status !== 'VALIDATED' && (writeAll || own))
      list.push({ key: 'deliver', icon: Truck, text: label('trip.deliver'), run: () => transition(t, 'DELIVERED') });
    if (next.includes('VALIDATED') && can(roles, 'trip.validate'))
      list.push({ key: 'validate', icon: CheckCircle2, text: label('trip.validate'), run: () => transition(t, 'VALIDATED') });
    if (t.status === 'VALIDATED' && can(roles, 'trip.unlock'))
      list.push({ key: 'unlock', icon: Unlock, text: label('trip.unlock'), run: () => setDialog({ trip: t, to: 'DELIVERED' }) });
    if (next.includes('CANCELLED') && writeAll)
      list.push({ key: 'cancel', icon: XCircle, text: label('trip.cancel'), run: () => setDialog({ trip: t, to: 'CANCELLED' }) });
    return list;
  };

  const ActionButtons = ({ t }: { t: WithId<Trip> }) => (
    <div className="flex flex-wrap justify-end gap-1">
      {busyId === t.id && <Loader2 size={16} className="animate-spin text-cement-500" aria-hidden />}
      {actions(t).map((a) => {
        const Icon = a.icon;
        const cls = 'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-cement-200 bg-white text-slate-700 hover:bg-cement-100';
        return a.to ? (
          <Link key={a.key} to={a.to} className={cls} title={a.text} aria-label={a.text}>
            <Icon size={16} aria-hidden />
          </Link>
        ) : (
          <button key={a.key} type="button" className={cls} title={a.text} aria-label={a.text} onClick={a.run} disabled={busyId === t.id}>
            <Icon size={16} aria-hidden />
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-900">
          <Stacked k="nav.trips" />
        </h1>
        {writeAll && (
          <Link to="/trips/new" className="btn-primary" data-testid="new-trip">
            <Plus size={18} aria-hidden /> {label('trip.new')}
          </Link>
        )}
      </div>
      {flash && (
        <p className="card border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800" role="status">
          {flash}
        </p>
      )}

      <PeriodPicker value={period} onChange={setPeriod} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SelectField k="trip.truck" value={filters.vehicle} placeholder="trip.all" options={options.vehicles} onChange={(vehicle) => setFilters((f) => ({ ...f, vehicle }))} />
        <SelectField k="trip.region" value={filters.region} placeholder="trip.all" options={REGIONS.map((r) => ({ value: r, label: r }))} onChange={(region) => setFilters((f) => ({ ...f, region }))} />
        <SelectField k="trip.cement" value={filters.cement} placeholder="trip.all" options={options.cements} onChange={(cement) => setFilters((f) => ({ ...f, cement }))} />
        <SelectField
          k="trip.status"
          value={filters.status}
          placeholder="trip.all"
          options={(Object.keys(TRIP_STATUS_LABELS) as TripStatus[]).map((s) => ({ value: s, label: both(TRIP_STATUS_LABELS[s]) }))}
          onChange={(status) => setFilters((f) => ({ ...f, status }))}
        />
      </div>

      {(error || actionError) && (
        <p className="card p-4 text-sm text-red-700" role="alert">
          {error ?? actionError}
        </p>
      )}
      {loading && <Loader2 className="animate-spin text-cement-500" aria-label={label('app.loading')} />}
      {rows && rows.length === 0 && <EmptyState icon={ClipboardList} title="empty.trips" />}
      {rows && rows.length > 0 && shown.length === 0 && <EmptyState icon={ClipboardList} title="empty.noMatch" />}

      {shown.length > 0 && (
        <>
          <div className="card grid grid-cols-2 gap-3 p-4 text-sm sm:grid-cols-5" data-testid="trip-totals">
            <div>
              <p className="text-cement-700">{label('kpi.trips')}</p>
              <p className="font-bold">{counted.length}</p>
            </div>
            <div>
              <p className="text-cement-700">{label('kpi.tonnage')}</p>
              <p className="font-bold tabular-nums">{totals.tonnage.toLocaleString('en-US', { maximumFractionDigits: 2 })} t</p>
            </div>
            <div>
              <p className="text-cement-700">{label('kpi.revenue')}</p>
              <p className="font-bold tabular-nums">{formatGNF(totals.revenue)}</p>
            </div>
            <div>
              <p className="text-cement-700">{label('trip.totalCost')}</p>
              <p className="font-bold tabular-nums">{formatGNF(totals.cost)}</p>
            </div>
            <div>
              <p className="text-cement-700">{label('trip.profit')}</p>
              <p className="font-bold tabular-nums text-emerald-700" data-testid="total-profit">
                {formatGNF(totals.profit)}
              </p>
            </div>
          </div>

          {/* Phone: cards */}
          <ul className="space-y-3 lg:hidden">
            {shown.map((t) => (
              <li key={t.id} className="card space-y-2 p-4" data-testid="trip-card">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {formatDate(t.tripDate)} · {t.vehiclePlate}
                    </p>
                    <p className="text-sm text-cement-700">
                      {t.region} → {t.destinationName}
                    </p>
                  </div>
                  <StatusBadge s={t.status} />
                </div>
                <p className="text-sm text-cement-700">
                  {t.cementLabel} · {t.tonnage} t{t.driverName ? ` · ${t.driverName}` : ''}
                </p>
                <div className="flex items-end justify-between gap-2">
                  <div className="text-sm tabular-nums">
                    <p>{formatGNF(t.transportRevenue)}</p>
                    <p className={`font-bold ${t.operatingProfit < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{formatGNF(t.operatingProfit)}</p>
                  </div>
                  <ActionButtons t={t} />
                </div>
              </li>
            ))}
          </ul>

          {/* Desktop: table with totals row */}
          <div className="card hidden overflow-x-auto lg:block">
            <table className="w-full text-sm" data-testid="trips-table">
              <thead className="border-b border-cement-200 bg-cement-50 text-left">
                <tr>
                  {(['trip.date', 'trip.truck', 'trip.driver', 'trip.destination', 'trip.tonnage', 'trip.revenue', 'trip.totalCost', 'trip.profit', 'trip.status'] as const).map((k, i) => (
                    <th key={k} className={`px-2 py-2 text-xs font-semibold ${i >= 4 && i <= 7 ? 'text-right' : ''}`}>
                      <Stacked k={k === 'trip.tonnage' ? 'kpi.tonnage' : k === 'trip.revenue' ? 'kpi.revenue' : k} />
                    </th>
                  ))}
                  <th className="px-3 py-2">
                    <span className="sr-only">{label('common.actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cement-100">
                {shown.map((t) => (
                  <tr key={t.id} className={t.status === 'CANCELLED' ? 'text-cement-500' : ''}>
                    <td className="whitespace-nowrap px-2 py-2" title={t.legacy ? label('fleet.legacy') : undefined}>
                      {formatDate(t.tripDate)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 font-semibold">{t.vehiclePlate}</td>
                    <td className="px-2 py-2">{t.driverName ?? '—'}</td>
                    <td className="px-2 py-2">
                      <span className="block">{t.destinationName}</span>
                      <span className="block text-xs text-cement-500">
                        {t.region} · {t.cementLabel}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{t.tonnage} t</td>
                    <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{formatGNFNumber(t.transportRevenue)}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{formatGNFNumber(t.totalDirectCost)}</td>
                    <td className={`whitespace-nowrap px-2 py-2 text-right font-semibold tabular-nums ${t.operatingProfit < 0 ? 'text-red-700' : ''}`}>
                      {formatGNFNumber(t.operatingProfit)}
                    </td>
                    <td className="px-2 py-2">
                      <StatusBadge s={t.status} />
                    </td>
                    <td className="px-2 py-2">
                      <ActionButtons t={t} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-cement-200 bg-cement-50 font-bold">
                <tr>
                  <td className="px-2 py-2" colSpan={4}>
                    {label('common.total')} ({counted.length})
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{totals.tonnage.toLocaleString('en-US', { maximumFractionDigits: 2 })} t</td>
                  <td className="px-2 py-2 text-right tabular-nums">{formatGNFNumber(totals.revenue)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{formatGNFNumber(totals.cost)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{formatGNFNumber(totals.profit)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {dialog && (
        <ReasonDialog
          title={`${label(dialog.to === 'CANCELLED' ? 'trip.cancel' : 'trip.unlock')} — ${formatDate(dialog.trip.tripDate)} ${dialog.trip.vehiclePlate}`}
          busy={busyId === dialog.trip.id}
          error={actionError}
          onClose={() => {
            setDialog(null);
            setActionError(null);
          }}
          onConfirm={(reason) => void transition(dialog.trip, dialog.to, reason)}
        />
      )}
    </div>
  );
}
