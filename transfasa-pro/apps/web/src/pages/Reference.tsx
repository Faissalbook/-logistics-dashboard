import {
  REGIONS,
  can,
  cementTypeInputSchema,
  destinationInputSchema,
  fieldErrors,
  formatDate,
  formatGNFNumber,
  rateCardInputSchema,
  todayISO,
} from '@transfasa/domain';
import { type LabelKey, label } from '@transfasa/i18n';
import { Loader2, MapPin, Pencil, Plus } from 'lucide-react';
import { type FormEvent, type ReactNode, useState } from 'react';
import type { ZodType, ZodTypeDef } from 'zod';
import { useAuth } from '../auth/AuthProvider';
import { Stacked } from '../components/Bilingual';
import { EmptyState } from '../components/EmptyState';
import { DateInput, GnfInput, SelectField, TextField, parseDecimal } from '../components/Form';
import { type CementType, type Destination, type RateCardDoc, type WithId, useReferenceData } from '../lib/data';
import { errorMessage } from '../lib/errors';
import { callable } from '../lib/firebase';

type Errors = Record<string, string>;
type Tab = 'destinations' | 'cements' | 'rates';

/** Shared save flow: validate with the domain schema, then call saveReference. */
function useSaver(kind: 'destination' | 'cementType' | 'rateCard', schema: ZodType<unknown, ZodTypeDef, unknown>, onDone: () => void) {
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const save = async (id: string | null, data: unknown) => {
    const r = schema.safeParse(data);
    if (!r.success) return setErrors(fieldErrors(r.error));
    setErrors({});
    setBusy(true);
    try {
      await callable('saveReference')({ kind, id, data });
      onDone();
    } catch (e) {
      setErrors((e as { details?: { fields?: Errors } }).details?.fields ?? { _form: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };
  return { errors, busy, save };
}

function Shell({ title, onSubmit, onCancel, busy, error, children }: { title: string; onSubmit: (e: FormEvent) => void; onCancel: () => void; busy: boolean; error?: string; children: ReactNode }) {
  return (
    <form onSubmit={onSubmit} noValidate className="card space-y-4 p-4" aria-label={title}>
      <h3 className="font-semibold">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
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

const activeOptions = [
  { value: 'y', label: label('fleet.active') },
  { value: 'n', label: label('fleet.inactive') },
];

function DestinationForm({ d, onDone }: { d: WithId<Destination> | null; onDone: () => void }) {
  const [f, setF] = useState({ region: d?.region ?? '', name: d?.name ?? '', distanceKm: d?.distanceKm ? String(d.distanceKm) : '', active: d?.active ?? true });
  const { errors, busy, save } = useSaver('destination', destinationInputSchema, onDone);
  return (
    <Shell
      title={label(d ? 'common.edit' : 'ref.addDestination')}
      busy={busy}
      error={errors._form}
      onCancel={onDone}
      onSubmit={(e) => {
        e.preventDefault();
        void save(d?.id ?? null, { ...f, distanceKm: parseDecimal(f.distanceKm) });
      }}
    >
      <SelectField k="trip.region" value={f.region} disabled={!!d} error={errors.region} options={REGIONS.map((r) => ({ value: r, label: r }))} onChange={(region) => setF({ ...f, region })} />
      <TextField k="ref.name" testId="dest-name" value={f.name} error={errors.name} onChange={(name) => setF({ ...f, name })} />
      <TextField k="ref.distance" inputMode="decimal" value={f.distanceKm} error={errors.distanceKm} onChange={(distanceKm) => setF({ ...f, distanceKm })} />
      <SelectField k="fleet.status" value={f.active ? 'y' : 'n'} placeholder={false} options={activeOptions} onChange={(v) => setF({ ...f, active: v === 'y' })} />
    </Shell>
  );
}

function CementForm({ c, onDone }: { c: WithId<CementType> | null; onDone: () => void }) {
  const [f, setF] = useState({ label: c?.label ?? '', bagKg: String(c?.bagKg ?? 50), active: c?.active ?? true });
  const { errors, busy, save } = useSaver('cementType', cementTypeInputSchema, onDone);
  return (
    <Shell
      title={label(c ? 'common.edit' : 'ref.addCement')}
      busy={busy}
      error={errors._form}
      onCancel={onDone}
      onSubmit={(e) => {
        e.preventDefault();
        void save(c?.id ?? null, { ...f, bagKg: Number(f.bagKg) });
      }}
    >
      <TextField k="ref.name" value={f.label} error={errors.label} onChange={(v) => setF({ ...f, label: v })} />
      <TextField k="ref.bagKg" inputMode="numeric" value={f.bagKg} error={errors.bagKg} onChange={(bagKg) => setF({ ...f, bagKg })} />
      <SelectField k="fleet.status" value={f.active ? 'y' : 'n'} placeholder={false} options={activeOptions} onChange={(v) => setF({ ...f, active: v === 'y' })} />
    </Shell>
  );
}

function RateCardForm({ r, onDone }: { r: WithId<RateCardDoc> | null; onDone: () => void }) {
  const ref = useReferenceData();
  const [f, setF] = useState({
    region: r?.region ?? '',
    destinationId: r?.destinationId ?? '',
    cementCode: r?.cementCode ?? '',
    vehicleId: r?.vehicleId ?? '',
    basis: r?.basis ?? 'PER_TRIP',
    revenueRate: r?.revenueRate ?? null,
    stdFuel: r?.stdFuel ?? 0,
    stdOffload: r?.stdOffload ?? 0,
    stdIncentive: r?.stdIncentive ?? 0,
    stdOther: r?.stdOther ?? 0,
    validFrom: (r?.validFrom ?? todayISO()) as string | null,
    validTo: r?.validTo ?? null,
    active: r?.active ?? true,
  });
  const { errors, busy, save } = useSaver('rateCard', rateCardInputSchema, onDone);
  const dests = (ref.destinations.rows ?? []).filter((d) => d.region === f.region && d.active);
  return (
    <Shell
      title={label(r ? 'common.edit' : 'ref.addRateCard')}
      busy={busy}
      error={errors._form}
      onCancel={onDone}
      onSubmit={(e) => {
        e.preventDefault();
        void save(r?.id ?? null, { ...f, cementCode: f.cementCode || null, vehicleId: f.vehicleId || null, revenueRate: f.revenueRate ?? undefined });
      }}
    >
      <SelectField k="trip.region" value={f.region} error={errors.region} options={REGIONS.map((x) => ({ value: x, label: x }))} onChange={(region) => setF({ ...f, region, destinationId: '' })} />
      <SelectField k="trip.destination" value={f.destinationId} error={errors.destinationId} options={dests.map((d) => ({ value: d.id, label: d.name }))} onChange={(destinationId) => setF({ ...f, destinationId })} />
      <SelectField k="trip.cement" value={f.cementCode} placeholder="ref.anyCement" options={(ref.cementTypes.rows ?? []).map((c) => ({ value: c.id, label: c.label }))} onChange={(cementCode) => setF({ ...f, cementCode })} />
      <SelectField k="trip.truck" value={f.vehicleId} placeholder="ref.anyTruck" options={(ref.vehicles.rows ?? []).filter((v) => v.type === 'TRACTOR').map((v) => ({ value: v.id, label: v.plate }))} onChange={(vehicleId) => setF({ ...f, vehicleId })} />
      <SelectField
        k="ref.basis"
        value={f.basis}
        placeholder={false}
        options={[
          { value: 'PER_TRIP', label: label('ref.perTrip') },
          { value: 'PER_TONNE', label: label('ref.perTonne') },
        ]}
        onChange={(basis) => basis && setF({ ...f, basis })}
      />
      <GnfInput k="ref.rate" value={f.revenueRate} error={errors.revenueRate} onChange={(revenueRate) => setF({ ...f, revenueRate })} />
      <GnfInput k="trip.fuel" value={f.stdFuel} error={errors.stdFuel} onChange={(v) => setF({ ...f, stdFuel: v ?? 0 })} />
      <GnfInput k="trip.offload" value={f.stdOffload} error={errors.stdOffload} onChange={(v) => setF({ ...f, stdOffload: v ?? 0 })} />
      <GnfInput k="trip.incentive" value={f.stdIncentive} error={errors.stdIncentive} onChange={(v) => setF({ ...f, stdIncentive: v ?? 0 })} />
      <GnfInput k="trip.other" value={f.stdOther} error={errors.stdOther} onChange={(v) => setF({ ...f, stdOther: v ?? 0 })} />
      <DateInput k="ref.validFrom" value={f.validFrom} error={errors.validFrom} onChange={(validFrom) => setF({ ...f, validFrom })} />
      <DateInput k="ref.validTo" value={f.validTo} error={errors.validTo} onChange={(validTo) => setF({ ...f, validTo })} />
      <SelectField k="fleet.status" value={f.active ? 'y' : 'n'} placeholder={false} options={activeOptions} onChange={(v) => setF({ ...f, active: v === 'y' })} />
    </Shell>
  );
}

export function ReferencePage() {
  const { roles } = useAuth();
  const canWrite = can(roles, 'refData.write');
  const ref = useReferenceData();
  const [tab, setTab] = useState<Tab>('destinations');
  const [editing, setEditing] = useState<{ id: string | null } | null>(null);
  const [region, setRegion] = useState<string>('');
  const close = () => setEditing(null);
  const tabs: [Tab, LabelKey, LabelKey][] = [
    ['destinations', 'ref.destinations', 'ref.addDestination'],
    ['cements', 'ref.cementTypes', 'ref.addCement'],
    ['rates', 'ref.rateCards', 'ref.addRateCard'],
  ];
  const addKey = tabs.find((x) => x[0] === tab)![2];
  const dests = (ref.destinations.rows ?? []).filter((d) => !region || d.region === region);
  const btn = 'btn-secondary min-h-[36px] px-3 text-xs';

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-brand-900">
        <Stacked k="nav.reference" />
      </h1>
      <div className="flex flex-wrap gap-2" role="tablist">
        {tabs.map(([t, k]) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={`rounded-full border px-4 py-2 text-sm font-medium ${tab === t ? 'border-brand-700 bg-brand-700 text-white' : 'border-cement-200 bg-white hover:bg-cement-100'}`}
            onClick={() => (setTab(t), close())}
          >
            {label(k)}
          </button>
        ))}
        {canWrite && (
          <button className="btn-primary ml-auto" onClick={() => setEditing({ id: null })} data-testid="ref-add">
            <Plus size={16} aria-hidden /> {label(addKey)}
          </button>
        )}
      </div>

      {tab === 'destinations' && (
        <>
          {editing && <DestinationForm d={dests.find((d) => d.id === editing.id) ?? null} onDone={close} />}
          <div className="max-w-xs">
            <SelectField k="trip.region" value={region} placeholder="trip.all" options={REGIONS.map((r) => ({ value: r, label: r }))} onChange={setRegion} />
          </div>
          {ref.destinations.rows?.length === 0 && <EmptyState icon={MapPin} title="empty.destinations" />}
          <div className="card divide-y divide-cement-100">
            {dests.map((d) => (
              <div key={d.id} className={`flex flex-wrap items-center gap-3 p-3 ${d.active ? '' : 'opacity-60'}`}>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {d.name} <span className="text-sm font-normal text-cement-500">· {d.region}</span>
                  </p>
                  <p className="text-xs text-cement-500">
                    {d.distanceKm ? `${d.distanceKm} km` : `${label('ref.distance')}: ${label('ref.notSet')}`}
                    {d.legacyVariants && Object.keys(d.legacyVariants).length > 1 && (
                      <> · {label('ref.variants')}: {Object.entries(d.legacyVariants).map(([n, c]) => `${n} ×${c}`).join(', ')}</>
                    )}
                  </p>
                </div>
                {canWrite && (
                  <button className={btn} onClick={() => setEditing({ id: d.id })}>
                    <Pencil size={14} aria-hidden /> {label('common.edit')}
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'cements' && (
        <>
          {editing && <CementForm c={(ref.cementTypes.rows ?? []).find((c) => c.id === editing.id) ?? null} onDone={close} />}
          <div className="card divide-y divide-cement-100">
            {(ref.cementTypes.rows ?? []).map((c) => (
              <div key={c.id} className={`flex items-center gap-3 p-3 ${c.active ? '' : 'opacity-60'}`}>
                <p className="flex-1 font-medium">
                  {c.label} <span className="text-sm font-normal text-cement-500">· {c.bagKg} kg</span>
                </p>
                {canWrite && (
                  <button className={btn} onClick={() => setEditing({ id: c.id })}>
                    <Pencil size={14} aria-hidden /> {label('common.edit')}
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'rates' && (
        <>
          {editing && <RateCardForm r={(ref.rateCards.rows ?? []).find((r) => r.id === editing.id) ?? null} onDone={close} />}
          {ref.rateCards.rows?.length === 0 && <EmptyState icon={MapPin} title="empty.rateCards" />}
          <div className="grid gap-3 md:grid-cols-2">
            {(ref.rateCards.rows ?? []).map((r) => (
              <article key={r.id} className={`card space-y-1 p-4 text-sm ${r.active ? '' : 'opacity-60'}`}>
                <p className="font-semibold">
                  {r.region} → {r.destinationName}
                </p>
                <p className="text-cement-700">
                  {r.cementLabel ?? label('ref.anyCement')} · {r.vehiclePlate ?? label('ref.anyTruck')}
                </p>
                <p className="tabular-nums">
                  {label('trip.revenue')}: <b>{formatGNFNumber(r.revenueRate)} GNF</b> {label(r.basis === 'PER_TRIP' ? 'ref.perTrip' : 'ref.perTonne').toLowerCase()}
                </p>
                <p className="tabular-nums text-cement-700">
                  {label('trip.fuel')} {formatGNFNumber(r.stdFuel)} · {label('trip.offload')} {formatGNFNumber(r.stdOffload)} · {label('trip.incentive')}{' '}
                  {formatGNFNumber(r.stdIncentive)} · {label('trip.other')} {formatGNFNumber(r.stdOther)}
                </p>
                <p className="text-xs text-cement-500">
                  {formatDate(r.validFrom)} – {r.validTo ? formatDate(r.validTo) : '…'}
                </p>
                {canWrite && (
                  <button className={`${btn} mt-1`} onClick={() => setEditing({ id: r.id })}>
                    <Pencil size={14} aria-hidden /> {label('common.edit')}
                  </button>
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
