import { type LabelKey, pair } from '@transfasa/i18n';

export function Kpi({ k, value, tone = 'default', testId }: { k: LabelKey; value: string; tone?: 'default' | 'good' | 'bad'; testId?: string }) {
  const { fr, en } = pair(k);
  const color = tone === 'good' ? 'text-emerald-700' : tone === 'bad' ? 'text-red-700' : 'text-slate-900';
  return (
    <div className="card p-4">
      <p className="text-xs font-medium leading-tight text-cement-700">
        {fr}
        {fr !== en && <span className="block text-cement-500">{en}</span>}
      </p>
      <p className={`mt-2 text-lg font-bold tabular-nums sm:text-xl ${color}`} data-testid={testId}>
        {value}
      </p>
    </div>
  );
}

export const tone = (n: number) => (n > 0 ? 'good' : n < 0 ? 'bad' : 'default') as 'good' | 'bad' | 'default';
