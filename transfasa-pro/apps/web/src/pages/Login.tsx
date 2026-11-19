import { label, msg } from '@transfasa/i18n';
import { Loader2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { errorMessage } from '../lib/errors';

export function LoginPage() {
  const { status, signIn } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  if (status === 'signedIn') {
    const from = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={from} replace />;
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!email.trim()) next.email = msg('validation.required');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = msg('validation.email');
    if (!password) next.password = msg('validation.required');
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setErrors({ form: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-900 to-brand-700 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-3 text-white">
          <img src="/favicon.svg" alt="" className="h-11 w-11 rounded-lg ring-1 ring-white/20" />
          <div>
            <h1 className="text-xl font-bold">TransFasa Pro</h1>
            <p className="text-sm text-brand-100">{label('app.company')}</p>
          </div>
        </div>
        <form onSubmit={submit} noValidate className="card space-y-4 p-6 shadow-xl">
          <h2 className="text-lg font-semibold">{label('auth.signIn')}</h2>
          <div>
            <label htmlFor="email" className="field-label">
              {label('auth.email')}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              inputMode="email"
              className={`input ${errors.email ? 'input-error' : ''}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-err' : undefined}
            />
            {errors.email && (
              <p id="email-err" className="field-error">
                {errors.email}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="password" className="field-label">
              {label('auth.password')}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className={`input ${errors.password ? 'input-error' : ''}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-err' : undefined}
            />
            {errors.password && (
              <p id="password-err" className="field-error">
                {errors.password}
              </p>
            )}
          </div>
          {errors.form && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {errors.form}
            </p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy && <Loader2 size={16} className="animate-spin" aria-hidden />}
            {label('auth.signIn')}
          </button>
        </form>
      </div>
    </div>
  );
}
