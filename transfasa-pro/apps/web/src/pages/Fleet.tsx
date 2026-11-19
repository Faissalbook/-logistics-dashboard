import {
  VEHICLE_STATUSES,
  VEHICLE_STATUS_LABELS,
  type VehicleStatus,
  can,
  driverInputSchema,
  fieldErrors,
  formatDate,
  todayISO,
  vehicleInputSchema,
} from '@transfasa/domain';
import { label } from '@transfasa/i18n';
import { collection, orderBy, query } from 'firebase/firestore';
import { Loader2, Pencil, Plus, Truck, UserRound, Users } from 'lucide-react';
import { type FormEvent, type ReactNode, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { Stacked } from '../components/Bilingual';
import { EmptyState } from '../components/EmptyState';
import { DateInput, SelectField, TextField, both, parseDecimal } from '../components/Form';
import { type Driver, type Vehicle, type WithId, useLiveQuery, useReferenceData } from '../lib/data';
import { errorMessage } from '../lib/errors';
import { callable, db } from '../lib/firebase';

const STATUS_STYLE: Record<VehicleStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  IN_MAINTENANCE: 'bg-amber-50 text-amber-800',
  OUT_OF_SERVICE: 'bg-red-50 text-red-700',
  DISPOSED: 'bg-cement-100 text-cement-700',
};

type Errors = Record<string, string>;
const serverErrors = (e: unknown): Errors =>
  (e as { details?: { fields?: Errors } }).details?.fields ?? { _form: errorMessage(e) };

function FormShell({ title, onSubmit, onCancel, busy, error, children }: { title: string; onSubmit: (e: FormEvent) => void; onCancel: () => void; busy: boolean; error?: string; children: ReactNode }) {
  return (
    <form onSubmit={onSubmit} noValidate className="card space-y-4 p-4" aria-label={title}>
      <h3 className="font-semibold">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy && <Loader2 size={16} className="animate-spin" aria-hidden />}
          {label('common.save')}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          {label('common.cancel')}
        </button>
      </div>
    </form>
  );
}

function VehicleForm({ v, onDone }: { v: WithId<Vehicle> | null; onDone: () => void }) {
  const [f, setF] = useState({
    type: v?.type ?? 'TRACTOR',
    plate: v?.plate ?? '',
    make: v?.make ?? '',
    model: v?.model ?? '',
    year: v?.year ? String(v.year) : '',
    status: v?.status ?? 'ACTIVE',
    inServiceDate: v?.inServiceDate ?? null,
    ratedPayloadT: v?.ratedPayloadT ? String(v.ratedPayloadT) : '',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const data = {
      type: f.type,
      plate: f.plate,
      make: f.make,
      model: f.model,
      year: f.year ? Number(f.year) : null,
      status: f.status,
      inServiceDate: f.inServiceDate,
      ratedPayloadT: parseDecimal(f.ratedPayloadT),
    };
    const r = vehicleInputSchema.safeParse(data);
    if (!r.success) return setErrors(fieldErrors(r.error));
    setBusy(true);
    try {
      await callable('saveVehicle')({ id: v?.id ?? null, data });
      onDone();
    } catch (err) {
      setErrors(serverErrors(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <FormShell title={label(v ? 'common.edit' : 'fleet.addVehicle')} onSubmit={submit} onCancel={onDone} busy={busy} error={errors._form}>
      <TextField k="fleet.plate" testId="vehicle-plate" value={f.plate} error={errors.plate} onChange={(plate) => setF({ ...f, plate })} />
      <SelectField
        k="fleet.type"
        value={f.type}
        placeholder={false}
        disabled={!!v}
        options={[
          { value: 'TRACTOR', label: label('fleet.tractor') },
          { value: 'TRAILER', label: label('fleet.trailerType') },
        ]}
        onChange={(type) => type && setF({ ...f, type })}
      />
      <TextField k="fleet.make" value={f.make} error={errors.make} onChange={(make) => setF({ ...f, make })} />
      <TextField k="fleet.model" value={f.model} error={errors.model} onChange={(model) => setF({ ...f, model })} />
      <TextField k="fleet.year" inputMode="numeric" value={f.year} error={errors.year} onChange={(year) => setF({ ...f, year })} />
      <SelectField
        k="fleet.status"
        value={f.status}
        placeholder={false}
        options={VEHICLE_STATUSES.map((s) => ({ value: s, label: both(VEHICLE_STATUS_LABELS[s]) }))}
        onChange={(status) => status && setF({ ...f, status })}
      />
      <DateInput k="fleet.inService" value={f.inServiceDate} error={errors.inServiceDate} onChange={(inServiceDate) => setF({ ...f, inServiceDate })} />
      <TextField k="fleet.payload" inputMode="decimal" value={f.ratedPayloadT} error={errors.ratedPayloadT} onChange={(ratedPayloadT) => setF({ ...f, ratedPayloadT })} />
    </FormShell>
  );
}

function DriverForm({ d, onDone }: { d: WithId<Driver> | null; onDone: () => void }) {
  const { roles } = useAuth();
  const canSeeUsers = can(roles, 'user.read');
  const users = useLiveQuery<{ fullName: string; email: string; roles: string[] }>(
    () => (canSeeUsers ? query(collection(db, 'users'), orderBy('fullName')) : null),
    `u${canSeeUsers}`,
  );
  const [f, setF] = useState({
    fullName: d?.fullName ?? '',
    phone: d?.phone ?? '',
    licenceNo: d?.licenceNo ?? '',
    licenceExpiry: d?.licenceExpiry ?? null,
    userId: d?.userId ?? '',
    active: d?.active ?? true,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const data = { ...f, userId: f.userId || null };
    const r = driverInputSchema.safeParse(data);
    if (!r.success) return setErrors(fieldErrors(r.error));
    setBusy(true);
    try {
      await callable('saveDriver')({ id: d?.id ?? null, data });
      onDone();
    } catch (err) {
      setErrors(serverErrors(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <FormShell title={label(d ? 'common.edit' : 'fleet.addDriver')} onSubmit={submit} onCancel={onDone} busy={busy} error={errors._form}>
      <TextField k="users.fullName" testId="driver-name" value={f.fullName} error={errors.fullName} onChange={(fullName) => setF({ ...f, fullName })} />
      <TextField k="users.phone" type="tel" inputMode="tel" value={f.phone} error={errors.phone} onChange={(phone) => setF({ ...f, phone })} />
      <TextField k="fleet.licence" value={f.licenceNo} error={errors.licenceNo} onChange={(licenceNo) => setF({ ...f, licenceNo })} />
      <DateInput k="fleet.licenceExpiry" value={f.licenceExpiry} error={errors.licenceExpiry} onChange={(licenceExpiry) => setF({ ...f, licenceExpiry })} />
      {canSeeUsers && (
        <SelectField
          k="fleet.appUser"
          value={f.userId}
          placeholder="trip.none"
          options={(users.rows ?? []).filter((u) => u.roles?.includes('DRIVER')).map((u) => ({ value: u.id, label: `${u.fullName} (${u.email})` }))}
          onChange={(userId) => setF({ ...f, userId })}
        />
      )}
      <SelectField
        k="fleet.status"
        value={f.active ? 'y' : 'n'}
        placeholder={false}
        options={[
          { value: 'y', label: label('fleet.active') },
          { value: 'n', label: label('fleet.inactive') },
        ]}
        onChange={(v) => setF({ ...f, active: v === 'y' })}
      />
    </FormShell>
  );
}

function AssignForm({ v, drivers, trailers, onDone }: { v: WithId<Vehicle>; drivers: WithId<Driver>[]; trailers: WithId<Vehicle>[]; onDone: () => void }) {
  const [f, setF] = useState({ driverId: v.currentDriverId ?? '', trailerId: v.currentTrailerId ?? '', fromDate: todayISO() as string | null });
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await callable('assignVehicle')({ vehicleId: v.id, driverId: f.driverId || null, trailerId: f.trailerId || null, fromDate: f.fromDate });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <FormShell title={`${label('fleet.assign')} — ${v.plate}`} onSubmit={submit} onCancel={onDone} busy={busy} error={error}>
      <SelectField
        k="trip.driver"
        testId="assign-driver"
        value={f.driverId}
        placeholder="fleet.unassigned"
        options={drivers.filter((d) => d.active).map((d) => ({ value: d.id, label: d.fullName }))}
        onChange={(driverId) => setF({ ...f, driverId })}
      />
      {trailers.length > 0 && (
        <SelectField
          k="trip.trailer"
          value={f.trailerId}
          placeholder="trip.none"
          options={trailers.map((t) => ({ value: t.id, label: t.plate }))}
          onChange={(trailerId) => setF({ ...f, trailerId })}
        />
      )}
      <DateInput k="period.from" value={f.fromDate} onChange={(fromDate) => setF({ ...f, fromDate })} />
    </FormShell>
  );
}

export function FleetPage() {
  const { roles } = useAuth();
  const { vehicles, drivers } = useReferenceData();
  const canVehicle = can(roles, 'vehicle.commission');
  const canRef = can(roles, 'refData.write');
  const [editing, setEditing] = useState<{ kind: 'vehicle' | 'driver' | 'assign'; id: string | null } | null>(null);
  const vRows = vehicles.rows ?? [];
  const dRows = drivers.rows ?? [];
  const trailers = vRows.filter((x) => x.type === 'TRAILER' && x.status === 'ACTIVE');
  const close = () => setEditing(null);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-900">
        <Stacked k="nav.fleet" />
      </h1>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">
            <Stacked k="fleet.vehicles" />
          </h2>
          {canVehicle && (
            <button className="btn-secondary" onClick={() => setEditing({ kind: 'vehicle', id: null })} data-testid="add-vehicle">
              <Plus size={16} aria-hidden /> {label('fleet.addVehicle')}
            </button>
          )}
        </div>
        {editing?.kind === 'vehicle' && <VehicleForm v={vRows.find((x) => x.id === editing.id) ?? null} onDone={close} />}
        {vehicles.loading && <Loader2 className="animate-spin text-cement-500" aria-label={label('app.loading')} />}
        {vehicles.error && <p className="card p-4 text-sm text-red-700">{vehicles.error}</p>}
        {vehicles.rows?.length === 0 && <EmptyState icon={Truck} title="empty.vehicles" />}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {vRows.map((v) => (
            <article key={v.id} className="card space-y-2 p-4" data-testid={`vehicle-${v.plate}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-bold">{v.plate}</p>
                  <p className="text-sm text-cement-700">
                    {label(v.type === 'TRACTOR' ? 'fleet.tractor' : 'fleet.trailerType')}
                    {v.make || v.model ? ` · ${[v.make, v.model].filter(Boolean).join(' ')}` : ''}
                    {v.year ? ` · ${v.year}` : ''}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[v.status]}`}>{both(VEHICLE_STATUS_LABELS[v.status])}</span>
              </div>
              {v.type === 'TRACTOR' && (
                <p className="flex items-center gap-1.5 text-sm">
                  <UserRound size={14} aria-hidden className="text-cement-500" />
                  {v.currentDriverName ?? <span className="text-cement-500">{label('fleet.unassigned')}</span>}
                  {v.currentTrailerId && <span className="text-cement-500"> · {vRows.find((x) => x.id === v.currentTrailerId)?.plate}</span>}
                </p>
              )}
              {v.inServiceDate && (
                <p className="text-xs text-cement-500">
                  {label('fleet.inService')}: {formatDate(v.inServiceDate)}
                </p>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                {canVehicle && (
                  <button className="btn-secondary min-h-[36px] px-3 text-xs" onClick={() => setEditing({ kind: 'vehicle', id: v.id })}>
                    <Pencil size={14} aria-hidden /> {label('common.edit')}
                  </button>
                )}
                {canRef && v.type === 'TRACTOR' && (
                  <button className="btn-secondary min-h-[36px] px-3 text-xs" onClick={() => setEditing({ kind: 'assign', id: v.id })} data-testid={`assign-${v.plate}`}>
                    <UserRound size={14} aria-hidden /> {label('fleet.assign')}
                  </button>
                )}
              </div>
              {editing?.kind === 'assign' && editing.id === v.id && <AssignForm v={v} drivers={dRows} trailers={trailers} onDone={close} />}
            </article>
          ))}
        </div>
      </section>

      {drivers.rows !== null && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">
              <Stacked k="fleet.drivers" />
            </h2>
            {canRef && (
              <button className="btn-secondary" onClick={() => setEditing({ kind: 'driver', id: null })} data-testid="add-driver">
                <Plus size={16} aria-hidden /> {label('fleet.addDriver')}
              </button>
            )}
          </div>
          {editing?.kind === 'driver' && <DriverForm d={dRows.find((x) => x.id === editing.id) ?? null} onDone={close} />}
          {dRows.length === 0 && <EmptyState icon={Users} title="empty.drivers" />}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {dRows.map((d) => {
              const truck = vRows.find((v) => v.currentDriverId === d.id);
              return (
                <article key={d.id} className={`card space-y-1 p-4 ${d.active ? '' : 'opacity-60'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{d.fullName}</p>
                    <span className="text-xs text-cement-500">{label(d.active ? 'fleet.active' : 'fleet.inactive')}</span>
                  </div>
                  <p className="text-sm text-cement-700">{[d.phone, d.licenceNo].filter(Boolean).join(' · ') || '—'}</p>
                  <p className="text-sm">
                    <Truck size={14} aria-hidden className="mr-1 inline text-cement-500" />
                    {truck?.plate ?? <span className="text-cement-500">{label('fleet.unassigned')}</span>}
                  </p>
                  {d.licenceExpiry && (
                    <p className={`text-xs ${d.licenceExpiry < todayISO() ? 'font-semibold text-red-700' : 'text-cement-500'}`}>
                      {label('fleet.licenceExpiry')}: {formatDate(d.licenceExpiry)}
                    </p>
                  )}
                  {canRef && (
                    <button className="btn-secondary mt-2 min-h-[36px] px-3 text-xs" onClick={() => setEditing({ kind: 'driver', id: d.id })}>
                      <Pencil size={14} aria-hidden /> {label('common.edit')}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
