import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserRound, SlidersHorizontal, Wallet, Database, Info, LogOut, Sparkles, Trash2 } from 'lucide-react'
import { useI18n, useUIStore } from '../store/uiStore'
import { useAuthStore } from '../store/authStore'
import { useBudgetStore, resolveMonthConfig, DEFAULT_PCT } from '../store/budgetStore'
import { LANGUAGES } from '../i18n/translations'
import { CURRENCIES, formatMoney } from '../utils/currency'
import { GROUPS, GROUP_META } from '../utils/categories'
import { formatMonth } from '../utils/dates'
import MonthSelector from '../components/MonthSelector'
import { ConfirmDialog } from '../components/ui'

function Section({ icon: Icon, title, children }) {
  return (
    <section className="card p-5 animate-fade-up">
      <h2 className="mb-4 flex items-center gap-2 font-bold">
        <Icon className="h-4 w-4 text-neutral-400" aria-hidden />
        {title}
      </h2>
      {children}
    </section>
  )
}

export default function Settings() {
  const { t, language, locale } = useI18n()
  const { theme, setTheme, setLanguage } = useUIStore()
  const { user, updateName, logout } = useAuthStore()
  const navigate = useNavigate()
  const {
    currency, selectedMonth, months,
    setSelectedMonth, setCurrency, updateMonthConfig, loadSampleData, clearAllData,
  } = useBudgetStore()

  const cfg = resolveMonthConfig(months, selectedMonth)
  const [name, setName] = useState(user?.name || '')
  const [income, setIncome] = useState(String(cfg.income || ''))
  const [pct, setPct] = useState(cfg.pct || DEFAULT_PCT)
  const [currencySel, setCurrencySel] = useState(
    CURRENCIES.some((c) => c.code === currency) ? currency : 'custom'
  )
  const [customCode, setCustomCode] = useState(
    CURRENCIES.some((c) => c.code === currency) ? '' : currency
  )
  const [confirm, setConfirm] = useState(null) // 'clear' | 'sample' | 'signout'
  const [savedFlash, setSavedFlash] = useState(false)

  // Re-sync the budget form when the month (or its config) changes.
  useEffect(() => {
    setIncome(String(cfg.income || ''))
    setPct(cfg.pct || DEFAULT_PCT)
  }, [selectedMonth, cfg.income, cfg.pct])

  const pctTotal = (pct.needs || 0) + (pct.wants || 0) + (pct.savings || 0)
  const pctValid = pctTotal === 100
  const incomeNum = parseFloat(income) || 0

  const flash = () => {
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1600)
  }

  const saveProfile = (e) => {
    e.preventDefault()
    const clean = name.trim()
    if (clean && clean !== user.name) updateName(clean)
    const code = currencySel === 'custom' ? customCode.trim().toUpperCase() : currencySel
    if (code && code !== currency) setCurrency(code)
    flash()
  }

  const saveBudget = (e) => {
    e.preventDefault()
    if (!pctValid || !(incomeNum > 0)) return
    updateMonthConfig(selectedMonth, { income: incomeNum, pct })
    flash()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t('settings.title')}</h1>
        {savedFlash && (
          <span className="chip bg-savings-soft text-savings dark:bg-savings-softdark dark:text-savings-dark animate-fade-in">
            {t('settings.saved')}
          </span>
        )}
      </div>

      <Section icon={UserRound} title={t('settings.profile')}>
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="set-name">{t('auth.name')}</label>
              <input id="set-name" type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="set-email">{t('auth.email')}</label>
              <input id="set-email" type="email" className="input opacity-60" value={user?.email || ''} disabled />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="set-currency">{t('setup.currency')}</label>
              <select id="set-currency" className="input" value={currencySel} onChange={(e) => setCurrencySel(e.target.value)}>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                ))}
                <option value="custom">Custom…</option>
              </select>
            </div>
            {currencySel === 'custom' && (
              <div>
                <label className="label" htmlFor="set-custom">{t('setup.customCurrency')}</label>
                <input
                  id="set-custom"
                  type="text"
                  maxLength={5}
                  className="input uppercase"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value)}
                  placeholder={t('setup.customCurrencyPlaceholder')}
                />
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <button type="submit" className="btn-primary">{t('common.save')}</button>
          </div>
        </form>
      </Section>

      <Section icon={SlidersHorizontal} title={t('settings.preferences')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="set-lang">{t('settings.language')}</label>
            <select id="set-lang" className="input" value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>
          <div>
            <span className="label">{t('settings.theme')}</span>
            <div className="inline-flex w-full rounded-xl border border-black/10 p-1 dark:border-white/10" role="radiogroup" aria-label={t('settings.theme')}>
              {['light', 'dark'].map((mode) => (
                <button
                  key={mode}
                  role="radio"
                  aria-checked={theme === mode}
                  onClick={() => setTheme(mode)}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    theme === mode
                      ? 'bg-[#0b0b0b] text-white dark:bg-white dark:text-[#0b0b0b]'
                      : 'text-neutral-500 hover:bg-black/5 dark:text-neutral-400 dark:hover:bg-white/10'
                  }`}
                >
                  {t(mode === 'light' ? 'settings.light' : 'settings.dark')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section icon={Wallet} title={t('settings.budget', { month: formatMonth(selectedMonth, locale) })}>
        <div className="mb-4">
          <MonthSelector month={selectedMonth} onChange={setSelectedMonth} />
        </div>
        <form onSubmit={saveBudget} className="space-y-4">
          <div>
            <label className="label" htmlFor="set-income">{t('setup.income')}</label>
            <input
              id="set-income"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              className="input font-semibold"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
            />
          </div>
          <div>
            <span className="label">{t('settings.percentages')}</span>
            <div className="space-y-2">
              {GROUPS.map((g) => {
                const meta = GROUP_META[g]
                return (
                  <div key={g} className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 ${meta.soft}`}>
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.bg}`} aria-hidden />
                    <span className={`text-sm font-semibold ${meta.text}`}>{t(meta.labelKey)}</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={pct[g]}
                      onChange={(e) =>
                        setPct((p) => ({ ...p, [g]: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)) }))
                      }
                      className="ms-auto w-16 rounded-lg border border-black/10 bg-white/70 px-2 py-1 text-end text-sm font-bold outline-none dark:border-white/10 dark:bg-black/20"
                      aria-label={`${t(meta.labelKey)} %`}
                    />
                    <span className="w-28 text-end text-xs font-medium tabular-nums text-neutral-500 dark:text-neutral-400">
                      {incomeNum > 0 ? formatMoney((incomeNum * (pct[g] || 0)) / 100, currency, locale) : '—'}
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
          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={!pctValid || !(incomeNum > 0)}>
              {t('common.save')}
            </button>
          </div>
        </form>
      </Section>

      <Section icon={Database} title={t('settings.data')}>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => setConfirm('sample')}>
            <Sparkles className="h-4 w-4 text-wants dark:text-wants-dark" />
            {t('settings.loadSample')}
          </button>
          <button className="btn-danger" onClick={() => setConfirm('clear')}>
            <Trash2 className="h-4 w-4" />
            {t('settings.clear')}
          </button>
        </div>
      </Section>

      <Section icon={Info} title={t('settings.about')}>
        <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">{t('settings.aboutText')}</p>
        <button className="btn-secondary mt-4" onClick={() => setConfirm('signout')}>
          <LogOut className="h-4 w-4" />
          {t('auth.signOut')}
        </button>
      </Section>

      <ConfirmDialog
        open={confirm === 'sample'}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          loadSampleData()
          flash()
        }}
        title={t('settings.loadSampleConfirmTitle')}
        body={t('settings.loadSampleConfirmBody')}
        confirmLabel={t('settings.loadSample')}
        danger={false}
      />
      <ConfirmDialog
        open={confirm === 'clear'}
        onClose={() => setConfirm(null)}
        onConfirm={clearAllData}
        title={t('settings.clearTitle')}
        body={t('settings.clearBody')}
        confirmLabel={t('settings.clear')}
      />
      <ConfirmDialog
        open={confirm === 'signout'}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          logout()
          navigate('/')
        }}
        title={t('settings.signOutTitle')}
        body={t('settings.signOutBody')}
        confirmLabel={t('auth.signOut')}
        danger={false}
      />
    </div>
  )
}
