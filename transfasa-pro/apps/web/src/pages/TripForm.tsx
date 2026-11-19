import {
  REGIONS,
  type TripAmounts,
  computeTrip,
  fieldErrors,
  formatGNF,
  matchRateCard,
  rateCardRevenue,
  todayISO,
  tripInputSchema,
} from '@transfasa/domain';
import { label, msg } from '@transfasa/i18n';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, Loader2, Lock } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Stacked } from '../components/Bilingual';
import { DateInput, Field, GnfInput, SelectField, TextField, parseDecimal } from '../components/Form';
import { type Trip, useReferenceData } from '../lib/data';
import { errorMessage } from '../lib/errors';
import { callable, db } from '../lib/firebase';

type AmountKey = keyof TripAmounts;
const AMOUNT_KEYS: AmountKey[] = ['transportRevenue', 'offloadCost', 'fuelCost', 'driverIncentive', 'otherCost'];

interface FormState {
  tripDate: string | null;
  dateRaw: string;
  vehicleId: string;
  trailerId: string;
  driverId: string;
  region: string;
  destinationId: string;
  cementCode: string;
  tonnage: string;
  amounts: Record<AmountKey, number | null>;
  otherReason: string;
  deliveryNoteNo: string;
  weighbridgeTicketNo: string;
  planned: boolean;
}

const empty = (): FormState => ({
  tripDate: todayISO(),
  dateRaw: '',
  vehicleId: '',
  trailerId: '',
  driverId: '',
  region: '',
  destinationId: '',
  cementCode: '',
  tonnage: '',
  amounts: { transportRevenue: null, offloadCost: null, fuelCost: null, driverIncentive: 0, otherCost: 0 },
  otherReason: '',
  deliveryNoteNo: '',
  weighbridgeTicketNo: '',
  planned: false,
});

const fromTrip = (t: Trip, duplicate: boolean): FormState => ({
  tripDate: duplicate ? todayISO() : t.tripDate,
  dateRaw: '',
  vehicleId: t.vehicleId,
  trailerId: t.trailerId ?? '',
  driverId: t.driverId ?? '',
  region: t.region,
  destinationId: t.destinationId,
  cementCode: t.cementCode,
  tonnage: String(t.tonnage),
  amounts: {
    transportRevenue: t.transportRevenue,
    offloadCost: t.offloadCost,
    fuelCost: t.fuelCost,
    driverIncentive: t.driverIncentive ?? 0,
    otherCost: t.otherCost,
  },
  otherReason: t.otherReason ?? '',
  deliveryNoteNo: duplicate ? '' : (t.deliveryNoteNo ?? ''),
  weighbridgeTicketNo: duplicate ? '' : (t.weighbridgeTicketNo ?? ''),
  planned: false,
});

export function TripFormPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const duplicateOf = params.get('from');
  const navigate = useNavigate();
  const ref = useReferenceData();
  const [form, setForm] = useState<FormState | null>(id || duplicateOf ? null : empty());
  const [status, setStatus] = useState<Trip['status'] | null>(null);
  const [edited, setEdited] = useState<Set<AmountKey>>(new Set(id || duplicateOf ? AMOUNT_KEYS : []));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const src = id ?? duplicateOf;
    if (!src) return;
    getDoc(doc(db, 'trips', src))
      .then((snap) => {
        if (!snap.exists()) return setLoadError(msg('error.notFound'));
        const t = snap.data() as Trip;
        setForm(fromTrip(t, !id));
        if (id) setStatus(t.status);
      })
      .catch((e) => setLoadError(errorMessage(e)));
  }, [id, duplicateOf]);

  const vehicles = ref.vehicles.rows ?? [];
  const tractors = vehicles.filter((v) => v.type === 'TRACTOR' && (v.status === 'ACTIVE' || v.id === form?.vehicleId));
  const trailers = vehicles.filter((v) => v.type === 'TRAILER' && (v.status === 'ACTIVE' || v.id === form?.trailerId));
  const drivers = (ref.drivers.rows ?? []).filter((d) => d.active || d.id === form?.driverId);
  const destinations = (ref.destinations.rows ?? []).filter(
    (d) => d.region === form?.region && (d.active || d.id === form?.destinationId),
  );
  const cements = (ref.cementTypes.rows ?? []).filter((c) => c.active || c.id === form?.cementCode);
  const tonnage = form ? parseDecimal(form.tonnage) : null;

  const card = useMemo(() => {
    if (!form?.region || !form.destinationId || !form.tripDate) return null;
    return matchRateCard(
      (ref.rateCards.rows ?? []).map((r) => ({ ...r })),
      {
        region: form.region,
        destinationId: form.destinationId,
        cementCode: form.cementCode || null,
        vehicleId: form.vehicleId || null,
        tripDate: form.tripDate,
      },
    );
  }, [form?.region, form?.destinationId, form?.cementCode, form?.vehicleId, form?.tripDate, ref.rateCards.rows]);

  const cardValues = useMemo<Partial<Record<AmountKey, number>>>(() => {
    if (!card) return {};
    return {
      transportRevenue: tonnage && tonnage > 0 ? rateCardRevenue(card, tonnage) : card.basis === 'PER_TRIP' ? card.revenueRate : undefined,
      offloadCost: card.stdOffload,
      fuelCost: card.stdFuel,
      driverIncentive: card.stdIncentive,
      otherCost: card.stdOther,
    };
  }, [card, tonnage]);

  // OPS-02: pre-fill amounts from the rate card unless the user typed them.
  useEffect(() => {
    if (!card) return;
    setForm((f) => {
      if (!f) return f;
      const amounts = { ...f.amounts };
      for (const k of AMOUNT_KEYS) {
        const v = cardValues[k];
        if (!edited.has(k) && v !== undefined) amounts[k] = v;
      }
      return { ...f, amounts };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardValues]);

  const payload = form && {
    tripDate: form.tripDate ?? form.dateRaw,
    vehicleId: form.vehicleId,
    trailerId: form.trailerId || null,
    driverId: form.driverId || null,
    region: form.region,
    destinationId: form.destinationId,
    cementCode: form.cementCode,
    tonnage: tonnage ?? undefined,
    transportRevenue: form.amounts.transportRevenue ?? undefined,
    offloadCost: form.amounts.offloadCost ?? undefined,
    fuelCost: form.amounts.fuelCost ?? undefined,
    driverIncentive: form.amounts.driverIncentive ?? 0,
    otherCost: form.amounts.otherCost ?? undefined,
    otherReason: form.otherReason,
    deliveryNoteNo: form.deliveryNoteNo,
    weighbridgeTicketNo: form.weighbridgeTicketNo,
    rateCardId: card?.id ?? null,
    status: form.planned ? 'PLANNED' : 'DELIVERED',
  };

  const validate = () => {
    const r = tripInputSchema(todayISO()).safeParse(payload);
    return r.success ? {} : fieldErrors(r.error);
  };
  useEffect(() => {
    if (submitted) setErrors(validate());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, submitted]);

  if (loadError)
    return (
      <p className="card p-4 text-sm text-red-700" role="alert">
        {loadError}
      </p>
    );
  if (!form) return <Loader2 className="animate-spin text-cement-500" aria-label={label('app.loading')} />;

  const locked = status === 'VALIDATED' || status === 'CANCELLED';
  const set = (patch: Partial<FormState>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const setAmount = (k: AmountKey, v: number | null) => {
    setEdited((s) => new Set(s).add(k));
    setForm((f) => (f ? { ...f, amounts: { ...f.amounts, [k]: v } } : f));
  };
  const live = computeTrip({
    transportRevenue: form.amounts.transportRevenue ?? 0,
    offloadCost: form.amounts.offloadCost ?? 0,
    fuelCost: form.amounts.fuelCost ?? 0,
    driverIncentive: form.amounts.driverIncentive ?? 0,
    otherCost: form.amounts.otherCost ?? 0,
  });
  const badge = (k: AmountKey) =>
    card && cardValues[k] !== undefined && form.amounts[k] !== cardValues[k] ? (
      <span className="rounded bg-accent-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-accent-600">{label('trip.edited')}</span>
    ) : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await callable('saveTrip')({ id: id ?? null, data: payload });
      navigate('/trips', { state: { flash: msg('trip.saved') } });
    } catch (err) {
      const fields = (err as { details?: { fields?: Record<string, string> } }).details?.fields;
      setErrors(fields ?? { _form: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-3xl space-y-5 pb-24" aria-label={label(id ? 'trip.edit' : 'trip.new')}>
      <div className="flex items-center gap-3">
        <Link to="/trips" className="btn-secondary px-3" aria-label={label('common.back')}>
          <ArrowLeft size={18} aria-hidden />
        </Link>
        <h1 className="text-2xl font-bold text-brand-900">
          <Stacked k={id ? 'trip.edit' : 'trip.new'} />
        </h1>
      </div>

      {locked && (
        <p className="card flex items-center gap-2 p-4 text-sm font-medium text-cement-700">
          <Lock size={16} aria-hidden /> {label('trip.locked')}
        </p>
      )}

      <fieldset disabled={locked || busy} className="space-y-5">
        <section className="card grid gap-4 p-4 sm:grid-cols-2">
          <DateInput k="trip.date" testId="trip-date" value={form.tripDate} error={errors.tripDate} onChange={(iso, raw) => set({ tripDate: iso, dateRaw: raw })} />
          <SelectField
            k="trip.truck"
            testId="trip-truck"
            value={form.vehicleId}
            error={errors.vehicleId}
            options={tractors.map((v) => ({ value: v.id, label: v.plate }))}
            onChange={(vehicleId) => {
              const v = vehicles.find((x) => x.id === vehicleId);
              set({ vehicleId, driverId: v?.currentDriverId ?? '', trailerId: v?.currentTrailerId ?? '' });
            }}
          />
          <SelectField
            k="trip.driver"
            testId="trip-driver"
            value={form.driverId}
            error={errors.driverId}
            placeholder="trip.none"
            options={drivers.map((d) => ({ value: d.id, label: d.fullName }))}
            onChange={(driverId) => set({ driverId })}
          />
          {trailers.length > 0 && (
            <SelectField
              k="trip.trailer"
              value={form.trailerId}
              placeholder="trip.none"
              options={trailers.map((v) => ({ value: v.id, label: v.plate }))}
              onChange={(trailerId) => set({ trailerId })}
            />
          )}
        </section>

        <section className="card grid gap-4 p-4 sm:grid-cols-2">
          <SelectField
            k="trip.region"
            testId="trip-region"
            value={form.region}
            error={errors.region}
            options={REGIONS.map((r) => ({ value: r, label: r }))}
            onChange={(region) => set({ region, destinationId: '' })}
          />
          <SelectField
            k="trip.destination"
            testId="trip-destination"
            value={form.destinationId}
            error={errors.destinationId}
            disabled={!form.region}
            options={destinations.map((d) => ({ value: d.id, label: d.name }))}
            onChange={(destinationId) => set({ destinationId })}
          />
          <SelectField
            k="trip.cement"
            testId="trip-cement"
            value={form.cementCode}
            error={errors.cementCode}
            options={cements.map((c) => ({ value: c.id, label: c.label }))}
            onChange={(cementCode) => set({ cementCode })}
          />
          <TextField k="trip.tonnage" testId="trip-tonnage" inputMode="decimal" value={form.tonnage} error={errors.tonnage} onChange={(v) => set({ tonnage: v })} />
        </section>

        <section className="card space-y-4 p-4">
          <p className="text-xs text-cement-500" data-testid="rate-card-hint">
            {form.destinationId ? label(card ? 'trip.fromRateCard' : 'trip.noRateCard') : ' '}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <GnfInput k="trip.revenue" testId="trip-revenue" value={form.amounts.transportRevenue} error={errors.transportRevenue} badge={badge('transportRevenue')} onChange={(v) => setAmount('transportRevenue', v)} />
            <GnfInput k="trip.fuel" testId="trip-fuel" value={form.amounts.fuelCost} error={errors.fuelCost} badge={badge('fuelCost')} onChange={(v) => setAmount('fuelCost', v)} />
            <GnfInput k="trip.offload" testId="trip-offload" value={form.amounts.offloadCost} error={errors.offloadCost} badge={badge('offloadCost')} onChange={(v) => setAmount('offloadCost', v)} />
            <GnfInput k="trip.incentive" testId="trip-incentive" value={form.amounts.driverIncentive} error={errors.driverIncentive} badge={badge('driverIncentive')} onChange={(v) => setAmount('driverIncentive', v)} />
            <GnfInput k="trip.other" testId="trip-other" value={form.amounts.otherCost} error={errors.otherCost} badge={badge('otherCost')} onChange={(v) => setAmount('otherCost', v)} />
            {(form.amounts.otherCost ?? 0) > 0 && (
              <TextField k="trip.otherReason" testId="trip-other-reason" value={form.otherReason} error={errors.otherReason} onChange={(v) => set({ otherReason: v })} />
            )}
          </div>
        </section>

        <section className="card grid gap-4 p-4 sm:grid-cols-2">
          <TextField k="trip.deliveryNote" value={form.deliveryNoteNo} error={errors.deliveryNoteNo} onChange={(v) => set({ deliveryNoteNo: v })} />
          <TextField k="trip.weighbridge" value={form.weighbridgeTicketNo} error={errors.weighbridgeTicketNo} onChange={(v) => set({ weighbridgeTicketNo: v })} />
          {!id && (
            <Field k="trip.status" htmlFor="planned">
              <label htmlFor="planned" className="flex min-h-[44px] items-center gap-2 text-sm">
                <input id="planned" type="checkbox" className="h-4 w-4 accent-brand-700" checked={form.planned} onChange={(e) => set({ planned: e.target.checked })} />
                {label('trip.planned')}
              </label>
            </Field>
          )}
        </section>
      </fieldset>

      {errors._form && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {errors._form}
        </p>
      )}

      {/* Live profit (OPS-01): recomputed on every keystroke with the same domain function the server uses. */}
      <div className="sticky bottom-[72px] z-10 lg:bottom-4">
        <div className="card flex items-center gap-3 border-brand-100 px-3 py-2 shadow-lg sm:gap-6 sm:p-3">
          <div className="hidden text-sm sm:block">
            <span className="text-cement-700">{label('trip.revenue')}</span>{' '}
            <span className="font-semibold tabular-nums">{formatGNF(form.amounts.transportRevenue ?? 0)}</span>
          </div>
          <div className="hidden min-w-0 text-sm sm:block">
            <span className="text-cement-700">{label('trip.totalCost')}</span>{' '}
            <span className="font-semibold tabular-nums" data-testid="live-cost">
              {formatGNF(live.totalDirectCost)}
            </span>
          </div>
          <div className="min-w-0 text-[11px] sm:text-sm">
            <span className="text-cement-700">{label('trip.profit')}</span>{' '}
            <span
              className={`block text-base font-bold tabular-nums sm:inline ${live.operatingProfit < 0 ? 'text-red-700' : 'text-emerald-700'}`}
              data-testid="live-profit"
            >
              {formatGNF(live.operatingProfit)}
            </span>
          </div>
          {!locked && (
            <button type="submit" className="btn-primary ml-auto shrink-0 px-3 sm:px-4" disabled={busy} data-testid="trip-save">
              {busy && <Loader2 size={16} className="animate-spin" aria-hidden />}
              {label('common.save')}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
