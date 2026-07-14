import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useI18n } from '../store/uiStore'
import { useAuthStore } from '../store/authStore'
import { useBudgetStore, DEFAULT_PCT } from '../store/budgetStore'
import { CURRENCIES, formatMoney } from '../utils/currency'
import { GROUPS, GROUP_META } from '../utils/categories'
import { currentMonthKey } from '../utils/dates'

export default function Setup() {
  const { t, locale } = useI18n()
  const user = useAuthStore((s) => s.user)
  const completeSetup = useBudgetStore((s) => s.completeSetup)

  const [income, setIncome] = useState('')
  const [currencySel, setCurrencySel] = useState('GNF')
  const [customCode, setCustomCode] = useState('')
  const [month, setMonth] = useState(currentMonthKey())
  const [pct, setPct] = useState(DEFAULT_PCT)
  const [customize, setCustomize] = useState(false)
  const [withSample, setWithSample] = useState(true)
  const [error, setError] = useState(null)

  const currency = currencySel === 'custom' ? customCode.trim().toUpperCase() : currencySel
  const incomeNum = parseFloat(income) || 0
  const pctTotal = (pct.needs || 0) + (pct.wants || 0) + (pct.savings || 0)
  const pctValid = pctTotal === 100

  const setPctFor = (g) => (e) => {
    const v = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0))
    setPct((p) => ({ ...p, [g]: v }))
  }

  const submit = (e) => {
    e.preventDefault()
    if (!(incomeNum > 0)) return setError(t('setup.err.income'))
    if (currencySel === 'custom' && !currency) return setError(t('setup.err.currency'))
    if (!pctValid) return setError(t('setup.mustTotal', { total: pctTotal }))
    completeSetup({ currency, income: incomeNum, month, pct, withSample })
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-10">
      <div className="mb-6 animate-fade-up">
        <img src="/favicon.svg" alt="" className="mb-4 h-12 w-12" />
        <h1 className="text-2xl font-bold tracking-tight">
          {t('dash.hello', { name: user?.name?.split(' ')[0] || '' })} 👋
        </h1>
        <h2 className="mt-1 text-lg font-semibold text-neutral-600 dark:text-neutral-300">{t('setup.title')}</h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t('setup.subtitle')}</p>
      </div>

      <form onSubmit={submit} className="card space-y-5 p-6 animate-fade-up" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="setup-currency">{t('setup.currency')}</label>
            <select
              id="setup-currency"
              className="input"
              value={currencySel}
              onChange={(e) => setCurrencySel(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
              <option value="custom">Custom…</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="setup-month">{t('setup.month')}</label>
            <input
              id="setup-month"
              type="month"
              className="input"
              value={month}
              onChange={(e) => setMonth(e.target.value || currentMonthKey())}
            />
          </div>
        </div>

        {currencySel === 'custom' && (
          <div>
            <label className="label" htmlFor="setup-custom">{t('setup.customCurrency')}</label>
            <input
              id="setup-custom"
              type="text"
              className="input uppercase"
              maxLength={5}
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value)}
              placeholder={t('setup.customCurrencyPlaceholder')}
            />
          </div>
        )}

        <div>
          <label className="label" htmlFor="setup-income">{t('setup.income')}</label>
          <input
            id="setup-income"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            className="input text-lg font-semibold"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            placeholder="0"
          />
        </div>

        {/* Allocation preview */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="label mb-0">{t('setup.allocation')}</span>
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
              <input
                type="checkbox"
                checked={customize}
                onChange={(e) => {
                  setCustomize(e.target.checked)
                  if (!e.target.checked) setPct(DEFAULT_PCT)
                }}
                className="h-4 w-4 rounded accent-[#0b0b0b] dark:accent-white"
              />
              {t('setup.customize')}
            </label>
          </div>

          <div className="space-y-2">
            {GROUPS.map((g) => {
              const meta = GROUP_META[g]
              return (
                <div key={g} className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 ${meta.soft}`}>
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.bg}`} aria-hidden />
                  <span className={`text-sm font-semibold ${meta.text}`}>{t(meta.labelKey)}</span>
                  {customize ? (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={pct[g]}
                      onChange={setPctFor(g)}
                      className="ms-auto w-16 rounded-lg border border-black/10 bg-white/70 px-2 py-1 text-end text-sm font-bold outline-none dark:border-white/10 dark:bg-black/20"
                      aria-label={`${t(meta.labelKey)} %`}
                    />
                  ) : (
                    <span className={`ms-auto text-sm font-bold ${meta.text}`}>{pct[g]}%</span>
                  )}
                  <span className="w-28 text-end text-xs font-medium tabular-nums text-neutral-500 dark:text-neutral-400 sm:w-32">
                    {incomeNum > 0 ? formatMoney((incomeNum * pct[g]) / 100, currency || 'GNF', locale) : '—'}
                  </span>
                </div>
              )
            })}
          </div>
          {!pctValid && (
            <p className="mt-2 text-xs font-medium text-danger dark:text-danger-dark" role="alert">
              {t('setup.mustTotal', { total: pctTotal })}
            </p>
          )}
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/10 px-4 py-3 dark:border-white/10">
          <input
            type="checkbox"
            checked={withSample}
            onChange={(e) => setWithSample(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded accent-[#0b0b0b] dark:accent-white"
          />
          <span>
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-wants dark:text-wants-dark" aria-hidden />
              {t('setup.startSample')}
            </span>
            <span className="mt-0.5 block text-xs text-neutral-400">{t('setup.sampleHint')}</span>
          </span>
        </label>

        {error && (
          <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger dark:bg-danger-softdark dark:text-danger-dark" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full" disabled={!pctValid}>
          {t('setup.finish')}
        </button>
      </form>
    </div>
  )
}
