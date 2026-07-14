import { useState } from 'react'
import { Plus, Target, Pencil, Trash2, PiggyBank, CalendarClock } from 'lucide-react'
import { useI18n } from '../store/uiStore'
import { useBudgetStore } from '../store/budgetStore'
import { formatMoney } from '../utils/currency'
import { formatDate, todayISO, monthsBetween, currentMonthKey, monthKeyOf, formatMonth } from '../utils/dates'
import { clamp } from '../utils/calculations'
import { Modal, ConfirmDialog, EmptyState, ProgressBar } from '../components/ui'

function GoalForm({ initial, onSubmit, onCancel }) {
  const { t } = useI18n()
  const [form, setForm] = useState(() => ({
    name: initial?.name || '',
    target: initial?.target ?? '',
    current: initial?.current ?? '',
    targetDate: initial?.targetDate || '',
    monthly: initial?.monthly ?? '',
  }))
  const [errors, setErrors] = useState({})
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    const errs = {}
    const target = parseFloat(form.target)
    if (!form.name.trim()) errs.name = t('goals.err.name')
    if (!Number.isFinite(target) || target <= 0) errs.target = t('goals.err.target')
    setErrors(errs)
    if (Object.keys(errs).length) return
    onSubmit({
      name: form.name.trim(),
      target,
      current: Math.max(0, parseFloat(form.current) || 0),
      targetDate: form.targetDate || null,
      monthly: Math.max(0, parseFloat(form.monthly) || 0),
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label className="label" htmlFor="goal-name">{t('goals.name')}</label>
        <input id="goal-name" type="text" className="input" value={form.name} onChange={set('name')} placeholder={t('goals.namePlaceholder')} />
        {errors.name && <p className="mt-1 text-xs text-danger dark:text-danger-dark">{errors.name}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="goal-target">{t('goals.target')}</label>
          <input id="goal-target" type="number" inputMode="decimal" min="0" step="any" className="input" value={form.target} onChange={set('target')} placeholder="0" />
          {errors.target && <p className="mt-1 text-xs text-danger dark:text-danger-dark">{errors.target}</p>}
        </div>
        <div>
          <label className="label" htmlFor="goal-current">{t('goals.current')}</label>
          <input id="goal-current" type="number" inputMode="decimal" min="0" step="any" className="input" value={form.current} onChange={set('current')} placeholder="0" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="goal-date">
            {t('goals.targetDate')} <span className="text-neutral-400">({t('common.optional')})</span>
          </label>
          <input id="goal-date" type="date" className="input" value={form.targetDate || ''} onChange={set('targetDate')} />
        </div>
        <div>
          <label className="label" htmlFor="goal-monthly">
            {t('goals.monthly')} <span className="text-neutral-400">({t('common.optional')})</span>
          </label>
          <input id="goal-monthly" type="number" inputMode="decimal" min="0" step="any" className="input" value={form.monthly} onChange={set('monthly')} placeholder="0" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>
        <button type="submit" className="btn-primary">{t('common.save')}</button>
      </div>
    </form>
  )
}

function ContributeForm({ goal, currency, locale, onSubmit, onCancel }) {
  const { t } = useI18n()
  const [amount, setAmount] = useState(goal.monthly || '')
  const [date, setDate] = useState(todayISO())
  const [error, setError] = useState(null)

  const submit = (e) => {
    e.preventDefault()
    const value = parseFloat(amount)
    if (!Number.isFinite(value) || value <= 0) return setError(t('tx.err.amount'))
    onSubmit({ amount: value, date })
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        {t('goals.contributeHint', { month: formatMonth(monthKeyOf(date), locale) })}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="contrib-amount">{t('common.amount')}</label>
          <input id="contrib-amount" type="number" inputMode="decimal" min="0" step="any" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
          {error && <p className="mt-1 text-xs text-danger dark:text-danger-dark">{error}</p>}
        </div>
        <div>
          <label className="label" htmlFor="contrib-date">{t('common.date')}</label>
          <input id="contrib-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>
        <button type="submit" className="btn-primary">{t('goals.contribute')}</button>
      </div>
    </form>
  )
}

export default function Goals() {
  const { t, locale } = useI18n()
  const { currency, goals, addGoal, updateGoal, deleteGoal, contributeToGoal } = useBudgetStore()
  const [modal, setModal] = useState(null) // {type: 'add'|'edit'|'contribute'|'delete', goal}

  const money = (v) => formatMoney(v, currency, locale)
  const close = () => setModal(null)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t('goals.title')}</h1>
        <button className="btn-primary" onClick={() => setModal({ type: 'add' })}>
          <Plus className="h-4 w-4" />
          {t('goals.add')}
        </button>
      </div>

      {goals.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal) => {
            const progress = clamp((goal.current / goal.target) * 100, 0, 100)
            const done = goal.current >= goal.target
            const monthsLeft = goal.targetDate
              ? Math.max(0, monthsBetween(currentMonthKey(), monthKeyOf(goal.targetDate)))
              : null
            const suggested =
              !done && monthsLeft > 0 ? (goal.target - goal.current) / monthsLeft : null

            return (
              <div key={goal.id} className="card flex flex-col p-5 animate-fade-up">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-savings-soft text-savings dark:bg-savings-softdark dark:text-savings-dark">
                      <Target className="h-5 w-5" aria-hidden />
                    </div>
                    <div>
                      <h2 className="font-bold leading-tight">{goal.name}</h2>
                      {goal.targetDate && (
                        <p className="flex items-center gap-1 text-xs text-neutral-400">
                          <CalendarClock className="h-3 w-3" aria-hidden />
                          {formatDate(goal.targetDate, locale)}
                          {monthsLeft !== null && monthsLeft > 0 && ` · ${t('goals.monthsLeft', { count: monthsLeft })}`}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    <button
                      onClick={() => setModal({ type: 'edit', goal })}
                      className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-black/5 hover:text-neutral-700 dark:hover:bg-white/10 dark:hover:text-white"
                      aria-label={t('common.edit')}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setModal({ type: 'delete', goal })}
                      className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-danger-soft hover:text-danger dark:hover:bg-danger-softdark dark:hover:text-danger-dark"
                      aria-label={t('common.delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xl font-bold tracking-tight">
                  <span className="whitespace-nowrap">{money(goal.current)}</span>{' '}
                  <span className="whitespace-nowrap text-sm font-medium text-neutral-400">/ {money(goal.target)}</span>
                </p>

                <div className="mt-2.5">
                  <ProgressBar
                    value={progress}
                    colorClass="bg-savings dark:bg-savings-dark"
                    trackClass="bg-savings/15 dark:bg-savings-dark/20"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-semibold tabular-nums text-neutral-500 dark:text-neutral-400">
                    {Math.round(progress)}%
                  </span>
                  <span className={done ? 'font-semibold text-savings dark:text-savings-dark' : 'text-neutral-400'}>
                    {done ? t('goals.achieved') : t('goals.toGo', { amount: money(goal.target - goal.current) })}
                  </span>
                </div>

                {suggested !== null && (
                  <p className="mt-2 text-xs text-neutral-400">
                    {t('goals.suggested', { amount: money(suggested) })}
                  </p>
                )}

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-black/5 pt-3 dark:border-white/5">
                  <p className="text-xs text-neutral-400">
                    {t('goals.monthly')}:{' '}
                    <span className="font-semibold text-neutral-600 dark:text-neutral-300">
                      {goal.monthly ? money(goal.monthly) : '—'}
                    </span>
                  </p>
                  {!done && (
                    <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => setModal({ type: 'contribute', goal })}>
                      <PiggyBank className="h-3.5 w-3.5" />
                      {t('goals.contribute')}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={Target}
          title={t('goals.empty')}
          hint={t('goals.emptyHint')}
          action={
            <button className="btn-primary" onClick={() => setModal({ type: 'add' })}>
              <Plus className="h-4 w-4" />
              {t('goals.add')}
            </button>
          }
        />
      )}

      <Modal open={modal?.type === 'add' || modal?.type === 'edit'} onClose={close} title={t(modal?.type === 'edit' ? 'goals.edit' : 'goals.add')}>
        {(modal?.type === 'add' || modal?.type === 'edit') && (
          <GoalForm
            initial={modal.goal}
            onCancel={close}
            onSubmit={(values) => {
              if (modal.type === 'edit') updateGoal(modal.goal.id, values)
              else addGoal(values)
              close()
            }}
          />
        )}
      </Modal>

      <Modal open={modal?.type === 'contribute'} onClose={close} title={`${t('goals.contributeTitle')} — ${modal?.goal?.name || ''}`}>
        {modal?.type === 'contribute' && (
          <ContributeForm
            goal={modal.goal}
            currency={currency}
            locale={locale}
            onCancel={close}
            onSubmit={(values) => {
              contributeToGoal(modal.goal.id, values)
              close()
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={modal?.type === 'delete'}
        onClose={close}
        onConfirm={() => deleteGoal(modal.goal.id)}
        title={t('goals.deleteTitle')}
        body={modal?.goal ? t('goals.deleteBody', { name: modal.goal.name }) : ''}
        confirmLabel={t('common.delete')}
      />
    </div>
  )
}
