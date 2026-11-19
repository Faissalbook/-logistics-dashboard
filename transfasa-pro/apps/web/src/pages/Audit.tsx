import { type AuditEntry, canonicalJson, formatDateTime } from '@transfasa/domain';
import { label } from '@transfasa/i18n';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { CheckCircle2, Loader2, ScrollText, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Stacked } from '../components/Bilingual';
import { EmptyState } from '../components/EmptyState';
import { errorMessage } from '../lib/errors';
import { callable, db } from '../lib/firebase';

const ACTION_LABELS: Record<string, string> = {
  create: 'Création / Create',
  update: 'Modification / Update',
  delete: 'Suppression / Delete',
  status_change: 'Changement de statut / Status change',
  login: 'Connexion / Sign-in',
  login_failed: 'Échec de connexion / Failed sign-in',
  role_change: 'Changement de rôles / Role change',
  user_create: 'Création utilisateur / User created',
  user_disable: 'Activation compte / Account status',
  export: 'Export / Export',
  period_close: 'Clôture période / Period close',
  settings_change: 'Paramètres / Settings',
};

type Verification = { ok: boolean; count: number; brokenAtSeq?: number } | null;

export function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<Verification>(null);

  useEffect(
    () =>
      onSnapshot(
        query(collection(db, 'audit_log'), orderBy('seq', 'desc'), limit(100)),
        (snap) => setEntries(snap.docs.map((d) => d.data() as AuditEntry)),
        (e) => setError(errorMessage(e)),
      ),
    [],
  );

  const verify = async () => {
    setVerifying(true);
    setResult(null);
    try {
      const { data } = await callable<void, NonNullable<Verification>>('verifyAuditChain')();
      setResult(data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-900">
          <Stacked k="audit.title" />
        </h1>
        <button className="btn-secondary" onClick={verify} disabled={verifying}>
          {verifying ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <CheckCircle2 size={16} aria-hidden />}
          {label('audit.verify')}
        </button>
      </div>

      {result && (
        <p
          role="status"
          data-testid="chain-status"
          className={`card flex items-center gap-2 p-4 text-sm font-medium ${result.ok ? 'text-emerald-700' : 'text-red-700'}`}
        >
          {result.ok ? <CheckCircle2 size={18} aria-hidden /> : <ShieldAlert size={18} aria-hidden />}
          {result.ok
            ? `${label('audit.chainOk')} — ${result.count.toLocaleString('en-US')} ${label('audit.entries')}`
            : `${label('audit.chainBroken')} #${result.brokenAtSeq}`}
        </p>
      )}
      {error && (
        <p className="card p-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      {entries === null && !error && <Loader2 className="animate-spin text-cement-500" aria-label={label('app.loading')} />}
      {entries?.length === 0 && <EmptyState icon={ScrollText} title="empty.audit" />}

      {entries && entries.length > 0 && (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-cement-200">
            {entries.map((e) => (
              <li key={e.seq} className="grid gap-1 p-4 text-sm sm:grid-cols-[4rem_9rem_1fr]">
                <span className="font-mono text-xs text-cement-500">#{e.seq}</span>
                <span className="text-cement-700">{formatDateTime(e.at)}</span>
                <div className="min-w-0">
                  <p className="font-semibold">{ACTION_LABELS[e.action] ?? e.action}</p>
                  <p className="text-cement-700">
                    {e.entity} · <span className="font-mono text-xs">{e.entityId}</span>
                  </p>
                  <p className="text-xs text-cement-500">
                    {label('audit.actor')}: <span className="font-mono">{e.actorId}</span> ({e.actorRoles.join(', ')})
                  </p>
                  {(e.before !== null || e.after !== null) && (
                    <p className="mt-1 break-all font-mono text-xs text-slate-600">
                      {e.before !== null && <span className="text-red-700">{canonicalJson(e.before)}</span>}
                      {e.before !== null && e.after !== null && ' → '}
                      {e.after !== null && <span className="text-emerald-700">{canonicalJson(e.after)}</span>}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
