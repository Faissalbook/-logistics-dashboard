import { useState } from 'react'
import { useI18n } from '../store/uiStore'
import { GROUPS, GROUP_META, SUBCATEGORIES, PAYMENT_METHODS } from '../utils/categories'
import { todayISO } from '../utils/dates'

export default function TransactionForm({ initial, onSubmit, onCancel, submitLabel }) {
  const { t } = useI18n()
  const [form, setForm] = useState(() => ({
    date: initial?.date || todayISO(),
    description: initial?.description || '',
    amount: initial?.amount ?? '',
    group: initial?.group || 'needs',
    subcategory: initial?.subcategory || SUBCATEGORIES[initial?.group || 'needs'][0].id,
    paymentMethod: initial?.paymentMethod || 'cash',
    note: initial?.note || '',
    recurring: initial?.recurring || false,
  }))
  const [errors, setErrors] = useState({})

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const setGroup = (group) =>
    setForm((f) => ({
      ...f,
      group,
      subcategory: SUBCATEGORIES[group].some((s) => s.id === f.subcategory)
        ? f.subcategory
        : SUBCATEGORIES[group][0].id,
    }))

  const submit = (e) => {
    e.preventDefault()
    const errs = {}
    const amount = parseFloat(form.amount)
    if (!form.description.trim()) errs.description = t('tx.err.description')
    if (!Number.isFinite(amount) || amount <= 0) errs.amount = t('tx.err.amount')
    setErrors(errs)
    if (Object.keys(errs).length) return
    onSubmit({ ...form, description: form.description.trim(), amount })
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {/* Budget group segmented control */}
      <div>
        <span className="label">{t('tx.group')}</span>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('tx.group')}>
          {GROUPS.map((g) => {
            const meta = GROUP_META[g]
            const active = form.group === g
            return (
              <button
                key={g}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setGroup(g)}
                className={`rounded-xl border px-2 py-2.5 text-xs font-semibold transition ${
                  active
                    ? `${meta.soft} ${meta.text} border-transparent ring-2 ring-current/30`
                    : 'border-black/10 text-neutral-500 hover:bg-black/5 dark:border-white/10 dark:text-neutral-400 dark:hover:bg-white/10'
                }`}
              >
                {t(meta.labelKey)}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="tx-amount">{t('common.amount')}</label>
          <input
            id="tx-amount"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            className="input"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
            placeholder="0"
          />
          {errors.amount && <p className="mt-1 text-xs text-danger dark:text-danger-dark">{errors.amount}</p>}
        </div>
        <div>
          <label className="label" htmlFor="tx-date">{t('common.date')}</label>
          <input
            id="tx-date"
            type="date"
            className="input"
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="tx-desc">{t('common.description')}</label>
        <input
          id="tx-desc"
          type="text"
          className="input"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder={t('tx.descriptionPlaceholder')}
        />
        {errors.description && (
          <p className="mt-1 text-xs text-danger dark:text-danger-dark">{errors.description}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="tx-sub">{t('tx.subcategory')}</label>
          <select
            id="tx-sub"
            className="input"
            value={form.subcategory}
            onChange={(e) => set('subcategory', e.target.value)}
          >
            {SUBCATEGORIES[form.group].map((s) => (
              <option key={s.id} value={s.id}>
                {t(`cat.${s.id}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="tx-pay">{t('tx.payment')}</label>
          <select
            id="tx-pay"
            className="input"
            value={form.paymentMethod}
            onChange={(e) => set('paymentMethod', e.target.value)}
          >
            {PAYMENT_METHODS.map((p) => (
              <option key={p} value={p}>
                {t(`pay.${p}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="tx-note">
          {t('tx.note')} <span className="text-neutral-400">({t('common.optional')})</span>
        </label>
        <textarea
          id="tx-note"
          className="input resize-none"
          rows={2}
          value={form.note}
          onChange={(e) => set('note', e.target.value)}
          placeholder={t('tx.notePlaceholder')}
        />
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-black/10 px-4 py-3 dark:border-white/10">
        <span>
          <span className="block text-sm font-semibold">{t('tx.recurring')}</span>
          <span className="block text-xs text-neutral-400">{t('tx.recurringHint')}</span>
        </span>
        <input
          type="checkbox"
          checked={form.recurring}
          onChange={(e) => set('recurring', e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="relative h-6 w-11 shrink-0 rounded-full bg-neutral-300 transition peer-checked:bg-savings dark:bg-neutral-600 dark:peer-checked:bg-savings-dark
            after:absolute after:start-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform
            peer-checked:after:translate-x-5 rtl:peer-checked:after:-translate-x-5"
        />
      </label>

      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {t('common.cancel')}
          </button>
        )}
        <button type="submit" className="btn-primary">
          {submitLabel || t('common.save')}
        </button>
      </div>
    </form>
  )
}
