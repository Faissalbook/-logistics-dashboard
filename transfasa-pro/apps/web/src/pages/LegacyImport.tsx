import { formatGNF } from '@transfasa/domain';
import { label, msg } from '@transfasa/i18n';
import { CheckCircle2, Loader2, ShieldAlert, Upload } from 'lucide-react';
import { useState } from 'react';
import { Stacked } from '../components/Bilingual';
import { errorMessage } from '../lib/errors';
import { callable } from '../lib/firebase';

interface Issue {
  level: 'error' | 'warning';
  source: string;
  legacyId: string;
  code: string;
  message: string;
}
interface Result {
  source: string;
  planned: { trips: number; expenses: number; destinations: number; plates: string[] };
  result: { trips: { created: number; skipped: number }; expenses: { created: number; skipped: number } } | null;
  issues: Issue[];
  reconciliation: { ok: boolean; lines: { scope: string; metric: string; legacy: number; migrated: number; ok: boolean }[] } | null;
}

/** OWNER: import the current app's JSON export (PRD §12) and show the reconciliation. */
export function LegacyImportPage() {
  const [files, setFiles] = useState<{ trips?: unknown; expenses?: unknown; summary?: unknown }>({});
  const [fileError, setFileError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<Result | null>(null);

  const load = (key: 'trips' | 'expenses' | 'summary') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const json = JSON.parse(await f.text());
      setFiles((x) => ({ ...x, [key]: json }));
      setFileError(null);
    } catch {
      setFileError(`${f.name}: ${msg('legacy.badFile')}`);
    }
  };

  const run = async () => {
    setBusy(true);
    setError(null);
    setRes(null);
    try {
      const r = await callable<object, Result>('importLegacy', 540_000)(files);
      setRes(r.data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const fmt = (metric: string, n: number) => (/trips|tonnage/.test(metric) ? n.toLocaleString('en-US') : formatGNF(n));

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold text-brand-900">
        <Stacked k="legacy.title" />
      </h1>
      <p className="text-sm text-cement-700">{label('legacy.intro')}</p>
      <div className="card space-y-4 p-4">
        {(['trips', 'expenses', 'summary'] as const).map((k) => (
          <div key={k}>
            <label htmlFor={`f-${k}`} className="field-label">
              {label(`legacy.${k}`)} {files[k] !== undefined && <CheckCircle2 size={14} className="inline text-emerald-600" aria-label="OK" />}
            </label>
            <input id={`f-${k}`} type="file" accept="application/json,.json,.txt" className="block w-full text-sm" onChange={load(k)} />
          </div>
        ))}
        {fileError && <p className="field-error">{fileError}</p>}
        <button className="btn-primary" disabled={busy || !files.trips || !files.expenses} onClick={run}>
          {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Upload size={16} aria-hidden />}
          {label(busy ? 'legacy.running' : 'legacy.run')}
        </button>
      </div>
      {error && <p className="card p-4 text-sm text-red-700" role="alert">{error}</p>}

      {res && (
        <div className="space-y-4">
          <div className="card space-y-1 p-4 text-sm">
            <p>
              {label('kpi.trips')}: <b>{res.result?.trips.created ?? 0}</b> + {res.result?.trips.skipped ?? 0} ✓ / {res.planned.trips}
            </p>
            <p>
              {label('kpi.expenses')}: <b>{res.result?.expenses.created ?? 0}</b> + {res.result?.expenses.skipped ?? 0} ✓ / {res.planned.expenses}
            </p>
            <p>
              {label('fleet.vehicles')}: {res.planned.plates.join(', ')} · {label('ref.destinations')}: {res.planned.destinations}
            </p>
          </div>
          {res.reconciliation && (
            <div className={`card p-4 text-sm ${res.reconciliation.ok ? 'text-emerald-800' : 'text-red-700'}`} data-testid="legacy-recon">
              <p className="flex items-center gap-2 font-semibold">
                {res.reconciliation.ok ? <CheckCircle2 size={18} aria-hidden /> : <ShieldAlert size={18} aria-hidden />}
                {label(res.reconciliation.ok ? 'legacy.ok' : 'legacy.mismatch')} ({res.reconciliation.lines.length})
              </p>
              <ul className="mt-2 space-y-1">
                {res.reconciliation.lines
                  .filter((l) => !l.ok || l.scope === 'total')
                  .map((l) => (
                    <li key={`${l.scope}.${l.metric}`} className="tabular-nums">
                      {l.ok ? '✔' : '✘'} {l.scope} · {l.metric}: {fmt(l.metric, l.legacy)} {l.ok ? '' : `≠ ${fmt(l.metric, l.migrated)}`}
                    </li>
                  ))}
              </ul>
            </div>
          )}
          {(['error', 'warning'] as const).map((lvl) => {
            const list = res.issues.filter((i) => i.level === lvl);
            if (!list.length) return null;
            return (
              <div key={lvl} className="card p-4 text-sm">
                <p className="mb-2 font-semibold">
                  {label(lvl === 'error' ? 'legacy.excluded' : 'legacy.review')} ({list.length})
                </p>
                <ul className="space-y-1 text-cement-700">
                  {list.map((i, n) => (
                    <li key={n}>
                      {i.source} {i.legacyId} — {i.message}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
