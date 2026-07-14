import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useI18n, useUIStore } from '../store/uiStore'
import { LANGUAGES } from '../i18n/translations'
import { Spinner } from '../components/ui'

export default function Auth() {
  const { t, language } = useI18n()
  const { theme, setTheme, setLanguage } = useUIStore()
  const { login, register } = useAuthStore()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const result = mode === 'login' ? await login(form) : await register(form)
      if (result.error) setError(result.error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="absolute end-4 top-4 flex items-center gap-2">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="rounded-xl border border-black/10 bg-surface-light px-3 py-1.5 text-sm outline-none dark:border-white/10 dark:bg-surface-dark"
          aria-label={t('settings.language')}
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="rounded-xl border border-black/10 bg-surface-light p-2 text-neutral-500 dark:border-white/10 dark:bg-surface-dark dark:text-neutral-300"
          aria-label={t('settings.theme')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      <div className="mb-8 flex flex-col items-center text-center animate-fade-up">
        <img src="/favicon.svg" alt="" className="mb-4 h-16 w-16" />
        <h1 className="text-2xl font-bold tracking-tight">
          {t('app.name')} <span className="text-neutral-400">{t('app.rule')}</span>
        </h1>
        <p className="mt-1 max-w-xs text-sm text-neutral-500 dark:text-neutral-400">{t('app.tagline')}</p>
      </div>

      <div className="card w-full max-w-sm p-6 animate-fade-up">
        <h2 className="text-lg font-bold">{mode === 'login' ? t('auth.welcomeBack') : t('auth.signUp')}</h2>
        <p className="mb-5 text-sm text-neutral-500 dark:text-neutral-400">
          {mode === 'login' ? t('auth.welcomeBackHint') : t('auth.createHint')}
        </p>

        <form onSubmit={submit} className="space-y-3.5" noValidate>
          {mode === 'register' && (
            <div>
              <label className="label" htmlFor="auth-name">{t('auth.name')}</label>
              <input id="auth-name" type="text" className="input" value={form.name} onChange={set('name')} autoComplete="name" />
            </div>
          )}
          <div>
            <label className="label" htmlFor="auth-email">{t('auth.email')}</label>
            <input id="auth-email" type="email" className="input" value={form.email} onChange={set('email')} autoComplete="email" />
          </div>
          <div>
            <label className="label" htmlFor="auth-password">{t('auth.password')}</label>
            <input
              id="auth-password"
              type="password"
              className="input"
              value={form.password}
              onChange={set('password')}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>
          {mode === 'register' && (
            <div>
              <label className="label" htmlFor="auth-confirm">{t('auth.confirmPassword')}</label>
              <input
                id="auth-confirm"
                type="password"
                className="input"
                value={form.confirmPassword}
                onChange={set('confirmPassword')}
                autoComplete="new-password"
              />
            </div>
          )}

          {error && (
            <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger dark:bg-danger-softdark dark:text-danger-dark" role="alert">
              {t(error)}
            </p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy && <Spinner className="h-4 w-4" />}
            {mode === 'login' ? t('auth.signIn') : t('auth.signUp')}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
          {mode === 'login' ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
          <button
            className="font-semibold text-needs hover:underline dark:text-needs-dark"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login')
              setError(null)
            }}
          >
            {mode === 'login' ? t('auth.signUp') : t('auth.signIn')}
          </button>
        </p>
      </div>

      <p className="mt-6 max-w-xs text-center text-xs text-neutral-400">{t('auth.localNote')}</p>
    </div>
  )
}
