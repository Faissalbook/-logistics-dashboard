import { useMemo } from 'react';
import { useStore } from '../store/useStore.js';
import { uniqueSorted } from '../lib/selectors.js';

export default function Filters() {
  const { trips, expenses, filters, setFilter, resetFilters } = useStore();

  const regions = useMemo(() => uniqueSorted(trips, 'region'), [trips]);
  const trucks = useMemo(
    () =>
      uniqueSorted([...trips, ...expenses.filter((e) => e.truck).map((e) => ({ truck: e.truck }))], 'truck'),
    [trips, expenses]
  );
  const cements = useMemo(() => uniqueSorted(trips, 'cement_type'), [trips]);
  const destinations = useMemo(() => uniqueSorted(trips, 'destination'), [trips]);
  const expTypes = useMemo(() => uniqueSorted(expenses, 'type'), [expenses]);

  return (
    <div className="no-print card p-3 flex flex-wrap items-end gap-2 text-sm">
      <Field label="From">
        <input
          type="date"
          className="input"
          value={filters.dateFrom}
          onChange={(e) => setFilter('dateFrom', e.target.value)}
        />
      </Field>
      <Field label="To">
        <input
          type="date"
          className="input"
          value={filters.dateTo}
          onChange={(e) => setFilter('dateTo', e.target.value)}
        />
      </Field>
      <Field label="Region">
        <select
          className="select"
          value={filters.region}
          onChange={(e) => setFilter('region', e.target.value)}
        >
          <option value="">All</option>
          {regions.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </Field>
      <Field label="Truck">
        <select
          className="select"
          value={filters.truck}
          onChange={(e) => setFilter('truck', e.target.value)}
        >
          <option value="">All</option>
          {trucks.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </Field>
      <Field label="Cement type">
        <select
          className="select"
          value={filters.cementType}
          onChange={(e) => setFilter('cementType', e.target.value)}
        >
          <option value="">All</option>
          {cements.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </Field>
      <Field label="Destination">
        <select
          className="select"
          value={filters.destination}
          onChange={(e) => setFilter('destination', e.target.value)}
        >
          <option value="">All</option>
          {destinations.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </Field>
      <Field label="Expense type">
        <select
          className="select"
          value={filters.expenseType}
          onChange={(e) => setFilter('expenseType', e.target.value)}
        >
          <option value="">All</option>
          {expTypes.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </Field>
      <button className="btn" onClick={resetFilters}>
        Reset
      </button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}
