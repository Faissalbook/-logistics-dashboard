import { AlertTriangle, CheckCircle2, AlertOctagon } from 'lucide-react'
import { useI18n } from '../store/uiStore'
import { GROUP_META } from '../utils/categories'
import { formatMoney } from '../utils/currency'
import { ProgressBar } from './ui'

const STATUS = {
  ok: { icon: CheckCircle2, chip: 'bg-savings-soft text-savings dark:bg-savings-softdark dark:text-savings-dark', key: 'dash.onTrack' },
  warn: { icon: AlertTriangle, chip: 'bg-wants-soft text-wants dark:bg-wants-softdark dark:text-wants-dark', key: 'dash.nearLimit' },
  over: { icon: AlertOctagon, chip: 'bg-danger-soft text-danger dark:bg-danger-softdark dark:text-danger-dark', key: 'dash.overspent' },
}

export default function BudgetCard({ group, data, currency, locale }) {
  const { t } = useI18n()
  const meta = GROUP_META[group]
  const status = STATUS[data.status]
  const StatusIcon = status.icon
  const isSavings = group === 'savings'
  const money = (v) => formatMoney(v, currency, locale)

  return (
    <div className="card p-5 animate-fade-up">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${meta.bg}`} aria-hidden />
            <h3 className="font-bold">{t(meta.labelKey)}</h3>
          </div>
          <p className="mt-0.5 text-xs text-neutral-400">{t('dash.ofIncome', { pct: data.pct })}</p>
        </div>
        <span className={`chip ${status.chip}`}>
          <StatusIcon className="h-3.5 w-3.5" aria-hidden />
          {t(status.key)}
        </span>
      </div>

      <p className="text-2xl font-bold tracking-tight">
        <span className="whitespace-nowrap">{money(data.spent)}</span>{' '}
        <span className="whitespace-nowrap text-sm font-medium text-neutral-400">/ {money(data.budget)}</span>
      </p>

      <div className="mt-3">
        <ProgressBar
          value={data.progress}
          colorClass={meta.bg}
          trackClass={meta.track}
          over={data.status === 'over'}
        />
      </div>

      <div className="mt-2.5 flex items-center justify-between text-xs">
        <span className="text-neutral-400">
          {t(isSavings ? 'dash.contributed' : 'dash.budgeted')}: {Math.round(data.progress)}%
        </span>
        {data.status === 'over' ? (
          <span className="font-semibold text-danger dark:text-danger-dark">
            {t('dash.overBy', { amount: money(data.overBy) })}
          </span>
        ) : (
          <span className="font-semibold text-neutral-600 dark:text-neutral-300">
            {money(Math.max(data.remaining, 0))} {t('dash.left')}
          </span>
        )}
      </div>
    </div>
  )
}
