import { Pencil, Trash2, RefreshCw } from 'lucide-react'
import { useI18n } from '../store/uiStore'
import { GROUP_META, subcategoryIcon } from '../utils/categories'
import { formatMoney } from '../utils/currency'
import { formatDate } from '../utils/dates'

export default function TransactionItem({ tx, currency, locale, onEdit, onDelete }) {
  const { t } = useI18n()
  const meta = GROUP_META[tx.group]
  const Icon = subcategoryIcon(tx.group, tx.subcategory)

  return (
    <li className="group flex items-center gap-3 px-4 py-3 transition hover:bg-black/[0.025] dark:hover:bg-white/[0.04]">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.soft} ${meta.text}`}>
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{tx.description}</p>
        <p className="truncate text-xs text-neutral-400">
          {t(`cat.${tx.subcategory}`)} · {formatDate(tx.date, locale)} · {t(`pay.${tx.paymentMethod}`)}
          {tx.recurring && (
            <span className={`ms-1.5 inline-flex items-center gap-0.5 ${meta.text}`}>
              <RefreshCw className="h-3 w-3" aria-hidden />
              {t('tx.recurringBadge')}
            </span>
          )}
        </p>
      </div>
      <p className="shrink-0 text-sm font-bold tabular-nums">{formatMoney(tx.amount, currency, locale)}</p>
      {(onEdit || onDelete) && (
        <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
          {onEdit && (
            <button
              onClick={() => onEdit(tx)}
              className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-black/5 hover:text-neutral-700 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label={t('common.edit')}
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(tx)}
              className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-danger-soft hover:text-danger dark:hover:bg-danger-softdark dark:hover:text-danger-dark"
              aria-label={t('common.delete')}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </li>
  )
}
