import { compactNumber } from '../utils/format';

const TrendIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M3 17l6-6 4 4 8-8" />
    <path d="M14 7h7v7" />
  </svg>
);

export default function TrendingList({ items = [] }) {
  if (!items.length) return null;
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold">Trending in Italia</h2>
        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">
          Updated now
        </span>
      </div>
      <ul className="space-y-3">
        {items.map((t, i) => (
          <li key={t.tag} className="flex items-center justify-between">
            <div className="flex items-start gap-3 min-w-0">
              <span className="text-xs font-semibold text-[var(--text-muted)] w-4 mt-0.5">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">#{t.tag}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {compactNumber(t.posts)} posts
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500">
              <TrendIcon /> {t.delta}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
