import {
  EXPENSE_TYPES,
  EXPENSE_TYPE_LABELS,
  type ExpenseType,
  can,
  canAll,
  expenseInputSchema,
  fieldErrors,
  formatDate,
  formatGNF,
  formatGNFNumber,
  todayISO,
} from '@transfasa/domain';
import { label } from '@transfasa/i18n';
import { collection, orderBy, query, where } from 'firebase/firestore';
import { CheckCircle2, Loader2, Pencil, Plus, Receipt, Trash2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { Stacked } from '../components/Bilingual';
import { EmptyState } from '../components/EmptyState';
import { DateInput, GnfInput, SelectField, TextField, both } from '../components/Form';
import { PeriodPicker } from '../components/Period';
import { ReasonDialog } from '../components/ReasonDialog';
import { type Expense, type WithId, useLiveQuery, useReferenceData } from '../lib/data';
import { errorMessage } from '../lib/errors';
import { callable, db } from '../lib/firebase';
import { type Period, periodFor } from '../lib/period';

interface Draft {
  id: string | null;
  expenseDate: string | null;
  dateRaw: string;
  type: ExpenseType | '';
  amount: number | null;
  description: string;
  vehicleId: string;
}
const blank = (): Draft => ({ id: null, expenseDate: todayISO(), dateRaw: '', type: '', amount: null, description: '', vehicleId: '' });

export function ExpensesPage() {
  const { roles, user } = useAuth();
  const all = canAll(roles, 'expense.read');
  const canWrite = can(roles, 'expense.write');
  const canValidate = can(roles, 'expense.validate');
  const [period, setPeriod] = useState<Period>(periodFor('thisMonth'));
  const [filters, setFilters] = useState({ vehicle: '', type: '' });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<WithId<Expense> | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { vehicles } = useReferenceData();

  const { rows, error, loading } = useLiveQuery<Expense>(
    () =>
      all
        ? query(collection(db, 'expenses'), where('expenseDate', '>=', period.from), where('expenseDate', '<=', period.to), orderBy('expenseDate', 'desc'))
        : query(collection(db, 'expenses'), where('createdBy', '==', user?.uid ?? ''), orderBy('expenseDate', 'desc')),
    `${all}|${period.from}|${period.to}`,
  );
  const inPeriod = (rows ?? []).filter((e) => e.expenseDate >= period.from && e.expenseDate <= period.to);
  const shown = inPeriod.filter(
    (e) => (!filters.type || e.type === filters.type) && (!filters.vehicle || (filters.vehicle === '-' ? !e.vehicleId : e.vehicleId === filters.vehicle)),
  );
  const total = shown.reduce((a, e) => a + e.amount, 0);
  const plates = (vehicles.rows ?? []).filter((v) => v.type === 'TRACTOR');

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!draft) return;
    const data = {
      expenseDate: draft.expenseDate ?? draft.dateRaw,
      type: draft.type,
      amount: draft.amount ?? undefined,
      description: draft.description,
      vehicleId: draft.vehicleId || null,
    };
    const r = expenseInputSchema(todayISO()).safeParse(data);
    if (!r.success) return setErrors(fieldErrors(r.error));
    setErrors({});
    setBusy(true);
    try {
      await callable('saveExpense')({ id: draft.id, data });
      setDraft(null);
    } catch (e) {
      setErrors((e as { details?: { fields?: Record<string, string> } }).details?.fields ?? { _form: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  const run = async (fn: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await fn();
      setToDelete(null);
    } catch (e) {
      setActionError(errorMessage(e));
    }
  };

  const editable = (e: Expense) => canWrite && e.status !== 'VALIDATED' && (all || e.createdBy === user?.uid);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-900">
          <Stacked k="nav.expenses" />
        </h1>
        {canWrite && !draft && (
          <button className="btn-primary" onClick={() => (setErrors({}), setDraft(blank()))} data-testid="new-expense">
            <Plus size={18} aria-hidden /> {label('expense.new')}
          </button>
        )}
      </div>

      {draft && (
        <form onSubmit={submit} noValidate className="card space-y-4 p-4" aria-label={label('expense.new')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <DateInput k="expense.date" value={draft.expenseDate} error={errors.expenseDate} onChange={(iso, raw) => setDraft({ ...draft, expenseDate: iso, dateRaw: raw })} />
            <SelectField
              k="expense.type"
              testId="expense-type"
              value={draft.type}
              error={errors.type}
              options={EXPENSE_TYPES.map((t) => ({ value: t, label: both(EXPENSE_TYPE_LABELS[t]) }))}
              onChange={(type) => setDraft({ ...draft, type })}
            />
            <GnfInput k="expense.amount" testId="expense-amount" value={draft.amount} error={errors.amount} onChange={(amount) => setDraft({ ...draft, amount })} />
            <SelectField
              k="expense.truck"
              value={draft.vehicleId}
              placeholder="expense.general"
              options={plates.map((v) => ({ value: v.id, label: v.plate }))}
              onChange={(vehicleId) => setDraft({ ...draft, vehicleId })}
            />
            <div className="sm:col-span-2">
              <TextField k="expense.description" testId="expense-description" value={draft.description} error={errors.description} onChange={(description) => setDraft({ ...draft, description })} />
            </div>
          </div>
          {errors._form && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {errors._form}
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={busy} data-testid="expense-save">
              {busy && <Loader2 size={16} className="animate-spin" aria-hidden />}
              {label('common.save')}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setDraft(null)}>
              {label('common.cancel')}
            </button>
          </div>
        </form>
      )}

      <PeriodPicker value={period} onChange={setPeriod} />
      {all && (
        <div className="grid grid-cols-2 gap-3 md:max-w-xl">
          <SelectField
            k="trip.truck"
            value={filters.vehicle}
            placeholder="trip.all"
            options={[{ value: '-', label: label('expense.general') }, ...plates.map((v) => ({ value: v.id, label: v.plate }))]}
            onChange={(vehicle) => setFilters((f) => ({ ...f, vehicle }))}
          />
          <SelectField
            k="expense.type"
            value={filters.type}
            placeholder="trip.all"
            options={EXPENSE_TYPES.map((t) => ({ value: t, label: both(EXPENSE_TYPE_LABELS[t]) }))}
            onChange={(type) => setFilters((f) => ({ ...f, type }))}
          />
        </div>
      )}

      {(error || actionError) && (
        <p className="card p-4 text-sm text-red-700" role="alert">
          {error ?? actionError}
        </p>
      )}
      {loading && <Loader2 className="animate-spin text-cement-500" aria-label={label('app.loading')} />}
      {rows && shown.length === 0 && <EmptyState icon={Receipt} title={inPeriod.length ? 'empty.noMatch' : 'empty.expenses'} />}

      {shown.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm" data-testid="expenses-table">
            <thead className="border-b border-cement-200 bg-cement-50 text-left">
              <tr>
                {(['expense.date', 'expense.type', 'expense.description', 'trip.truck', 'expense.amount', 'trip.status'] as const).map((k) => (
                  <th key={k} className={`px-3 py-2 font-semibold ${k === 'expense.amount' ? 'text-right' : ''}`}>
                    <Stacked k={k === 'trip.truck' ? 'trip.truck' : k} />
                  </th>
                ))}
                <th className="px-3 py-2">
                  <span className="sr-only">{label('common.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cement-100">
              {shown.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap px-3 py-2">{formatDate(e.expenseDate)}</td>
                  <td className="px-3 py-2">{both(EXPENSE_TYPE_LABELS[e.type])}</td>
                  <td className="px-3 py-2">{e.description}</td>
                  <td className="px-3 py-2">{e.vehiclePlate ?? <span className="text-cement-500">{label('expense.general')}</span>}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatGNFNumber(e.amount)}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${e.status === 'VALIDATED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
                      {label(e.status === 'VALIDATED' ? 'expense.validated' : 'expense.recorded')}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      {editable(e) && (
                        <button
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-cement-200 hover:bg-cement-100"
                          aria-label={label('common.edit')}
                          title={label('common.edit')}
                          onClick={() => {
                            setErrors({});
                            setDraft({ id: e.id, expenseDate: e.expenseDate, dateRaw: '', type: e.type, amount: e.amount, description: e.description, vehicleId: e.vehicleId ?? '' });
                          }}
                        >
                          <Pencil size={16} aria-hidden />
                        </button>
                      )}
                      {canValidate && e.status !== 'VALIDATED' && (
                        <button
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-cement-200 hover:bg-cement-100"
                          aria-label={label('expense.validate')}
                          title={label('expense.validate')}
                          onClick={() => void run(() => callable('validateExpense')({ id: e.id }))}
                        >
                          <CheckCircle2 size={16} aria-hidden />
                        </button>
                      )}
                      {editable(e) && (
                        <button
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-cement-200 text-red-700 hover:bg-red-50"
                          aria-label={label('expense.delete')}
                          title={label('expense.delete')}
                          onClick={() => setToDelete(e)}
                        >
                          <Trash2 size={16} aria-hidden />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-cement-200 bg-cement-50 font-bold">
              <tr>
                <td className="px-3 py-2" colSpan={4}>
                  {label('common.total')} ({shown.length})
                </td>
                <td className="px-3 py-2 text-right tabular-nums" data-testid="expenses-total">
                  {formatGNF(total)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {toDelete && (
        <ReasonDialog
          title={`${label('expense.delete')} — ${toDelete.description} (${formatGNF(toDelete.amount)})`}
          error={actionError}
          onClose={() => setToDelete(null)}
          onConfirm={(reason) => void run(() => callable('deleteExpense')({ id: toDelete.id, reason }))}
        />
      )}
    </div>
  );
}
