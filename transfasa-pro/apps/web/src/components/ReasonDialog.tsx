import { label, msg } from '@transfasa/i18n';
import { useEffect, useId, useRef, useState } from 'react';

/** Small modal asking for a mandatory reason (cancel, unlock, delete — audit-logged). */
export function ReasonDialog({
  title,
  onConfirm,
  onClose,
  busy,
  error,
}: {
  title: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
  busy?: boolean;
  error?: string | null;
}) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const id = useId();
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const missing = touched && !reason.trim();
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby={`${id}-t`}>
      <div className="card w-full max-w-md space-y-4 p-5 shadow-xl">
        <h2 id={`${id}-t`} className="text-lg font-semibold">
          {title}
        </h2>
        <div>
          <label htmlFor={id} className="field-label">
            {label('trip.reasonPrompt')}
          </label>
          <textarea id={id} ref={ref} rows={3} className={`input py-2 ${missing ? 'input-error' : ''}`} value={reason} onChange={(e) => setReason(e.target.value)} />
          {missing && <p className="field-error">{msg('validation.required')}</p>}
          {error && <p className="field-error">{error}</p>}
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {label('common.cancel')}
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={busy}
            onClick={() => {
              setTouched(true);
              if (reason.trim()) onConfirm(reason.trim());
            }}
          >
            {label('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
