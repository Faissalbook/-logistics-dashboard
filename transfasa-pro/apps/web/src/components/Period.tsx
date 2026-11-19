import { label } from '@transfasa/i18n';
import { type Period, type PeriodKey, periodFor } from '../lib/period';
import { DateInput } from './Form';

const KEYS: Exclude<PeriodKey, 'custom'>[] = ['thisMonth', 'lastMonth', 'year', 'all'];

export function PeriodPicker({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label={label('period.label')}>
        {[...KEYS, 'custom' as const].map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={value.key === k}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
              value.key === k ? 'border-brand-700 bg-brand-700 text-white' : 'border-cement-200 bg-white text-slate-700 hover:bg-cement-100'
            }`}
            onClick={() => onChange(k === 'custom' ? { ...value, key: 'custom' } : periodFor(k))}
          >
            {label(`period.${k}`)}
          </button>
        ))}
      </div>
      {value.key === 'custom' && (
        <div className="grid max-w-md grid-cols-2 gap-3">
          <DateInput k="period.from" value={value.from} onChange={(iso) => iso && onChange({ ...value, from: iso })} />
          <DateInput k="period.to" value={value.to} onChange={(iso) => iso && onChange({ ...value, to: iso })} />
        </div>
      )}
    </div>
  );
}
