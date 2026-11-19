import { formatDate, formatGNFNumber, parseDisplayDate, parseGNF } from '@transfasa/domain';
import { type LabelKey, label } from '@transfasa/i18n';
import { type ReactNode, useEffect, useId, useState } from 'react';

export function Field({
  k,
  error,
  hint,
  children,
  htmlFor,
  badge,
}: {
  k: LabelKey;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
  htmlFor: string;
  badge?: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="field-label flex items-center gap-2">
        {label(k)}
        {badge}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-cement-500">{hint}</p>}
      {error && (
        <p id={`${htmlFor}-err`} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Money input: shows `2,500,000`, emits integer GNF (or null when empty/invalid). */
export function GnfInput({
  value,
  onChange,
  k,
  error,
  badge,
  testId,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  k: LabelKey;
  error?: string;
  badge?: ReactNode;
  testId?: string;
}) {
  const id = useId();
  const [text, setText] = useState(value === null ? '' : formatGNFNumber(value));
  useEffect(() => {
    if (parseGNF(text) !== value) setText(value === null ? '' : formatGNFNumber(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <Field k={k} error={error} htmlFor={id} badge={badge}>
      <div className="relative">
        <input
          id={id}
          data-testid={testId}
          inputMode="numeric"
          autoComplete="off"
          className={`input pr-14 text-right tabular-nums ${error ? 'input-error' : ''}`}
          value={text}
          aria-invalid={!!error}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^\d]/g, '');
            const n = raw === '' ? null : Number(raw);
            setText(n === null ? '' : formatGNFNumber(n));
            onChange(n);
          }}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-cement-500">GNF</span>
      </div>
    </Field>
  );
}

/** Date input in DD/MM/YYYY; emits ISO or null. */
export function DateInput({
  value,
  onChange,
  k,
  error,
  testId,
}: {
  value: string | null;
  onChange: (iso: string | null, raw: string) => void;
  k: LabelKey;
  error?: string;
  testId?: string;
}) {
  const id = useId();
  const [text, setText] = useState(value ? formatDate(value) : '');
  useEffect(() => {
    if (parseDisplayDate(text) !== value) setText(value ? formatDate(value) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <Field k={k} error={error} htmlFor={id}>
      <input
        id={id}
        data-testid={testId}
        inputMode="numeric"
        placeholder="JJ/MM/AAAA"
        autoComplete="off"
        className={`input tabular-nums ${error ? 'input-error' : ''}`}
        value={text}
        aria-invalid={!!error}
        onChange={(e) => {
          let v = e.target.value.replace(/[^\d/]/g, '').slice(0, 10);
          if (/^\d{2}$/.test(v) || /^\d{2}\/\d{2}$/.test(v)) v += text.length < v.length ? '/' : '';
          setText(v);
          onChange(parseDisplayDate(v), v);
        }}
      />
    </Field>
  );
}

export function SelectField<T extends string>({
  k,
  value,
  onChange,
  options,
  error,
  placeholder = true,
  testId,
  disabled,
}: {
  k: LabelKey;
  value: T | '' | null;
  onChange: (v: T | '') => void;
  options: { value: T; label: string }[];
  error?: string;
  placeholder?: boolean | LabelKey;
  testId?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <Field k={k} error={error} htmlFor={id}>
      <select
        id={id}
        data-testid={testId}
        className={`input ${error ? 'input-error' : ''}`}
        value={value ?? ''}
        disabled={disabled}
        aria-invalid={!!error}
        onChange={(e) => onChange(e.target.value as T | '')}
      >
        {placeholder && <option value="">{label(placeholder === true ? 'trip.select' : placeholder)}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function TextField({
  k,
  value,
  onChange,
  error,
  type = 'text',
  inputMode,
  testId,
}: {
  k: LabelKey;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  inputMode?: 'text' | 'decimal' | 'numeric' | 'tel' | 'email';
  testId?: string;
}) {
  const id = useId();
  return (
    <Field k={k} error={error} htmlFor={id}>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        data-testid={testId}
        autoComplete="off"
        className={`input ${error ? 'input-error' : ''}`}
        value={value}
        aria-invalid={!!error}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

/** Parse "40,5" or "40.5" → 40.5; '' → null; NaN → NaN (caught by the schema). */
export const parseDecimal = (s: string): number | null => (s.trim() === '' ? null : Number(s.replace(',', '.')));

/** `{ fr, en }` → "fr / en" */
export const both = (l: { fr: string; en: string }) => (l.fr === l.en ? l.fr : `${l.fr} / ${l.en}`);
