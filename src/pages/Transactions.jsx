import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus, ReceiptText } from 'lucide-react'
import { useI18n } from '../store/uiStore'
import { useBudgetStore } from '../store/budgetStore'
import { monthTransactions } from '../utils/calculations'
import { formatMoney } from '../utils/currency'
import { GROUPS, GROUP_META } from '../utils/categories'
import MonthSelector from '../components/MonthSelector'
import TransactionItem from '../components/TransactionItem'
import TransactionForm from '../components/TransactionForm'
import { Modal, ConfirmDialog, EmptyState } from '../components/ui'

export default function Transactions() {
  const { t, locale } = useI18n()
  const { currency, selectedMonth, transactions, setSelectedMonth, updateTransaction, deleteTransaction } =
    useBudgetStore()

  const [query, setQuery] = useState('')
  const [groupFilter, setGroupFilter] = useState('all')
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const txs = useMemo(() => {
    let list = monthTransactions(transactions, selectedMonth)
    if (groupFilter !== 'all') list = list.filter((tx) => tx.group === groupFilter)
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (tx) =>
          tx.description.toLowerCase().includes(q) ||
          t(`cat.${tx.subcategory}`).toLowerCase().includes(q) ||
          (tx.note || '').toLowerCase().includes(q)
      )
    }
    return list.sort((a, b) => b.date.localeCompare(a.date))
  }, [transactions, selectedMonth, groupFilter, query, t])

  const total = txs.reduce((s, tx) => s + tx.amount, 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t('tx.title')}</h1>
        <MonthSelector month={selectedMonth} onChange={setSelectedMonth} />
      </div>

      {/* Filters — one row above the list */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden />
          <input
            type="search"
            className="input ps-9"
            placeholder={t('tx.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t('common.search')}
          />
        </div>
        <div className="flex gap-1.5" role="radiogroup" aria-label={t('tx.group')}>
          {['all', ...GROUPS].map((g) => {
            const active = groupFilter === g
            const meta = g !== 'all' ? GROUP_META[g] : null
            return (
              <button
                key={g}
                role="radio"
                aria-checked={active}
                onClick={() => setGroupFilter(g)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  active
                    ? meta
                      ? `${meta.soft} ${meta.text}`
                      : 'bg-[#0b0b0b] text-white dark:bg-white dark:text-[#0b0b0b]'
                    : 'border border-black/10 text-neutral-500 hover:bg-black/5 dark:border-white/10 dark:text-neutral-400 dark:hover:bg-white/10'
                }`}
              >
                {g === 'all' ? t('common.all') : t(GROUP_META[g].labelKey)}
              </button>
            )
          })}
        </div>
      </div>

      {txs.length ? (
        <div className="card animate-fade-up">
          <div className="flex items-center justify-between border-b border-black/5 px-4 py-3 text-sm dark:border-white/5">
            <p className="text-neutral-500 dark:text-neutral-400">
              {txs.length === 1 ? t('tx.count.one') : t('tx.count', { count: txs.length })}
            </p>
            <p className="font-bold tabular-nums">{formatMoney(total, currency, locale)}</p>
          </div>
          <ul className="divide-y divide-black/5 dark:divide-white/5">
            {txs.map((tx) => (
              <TransactionItem
                key={tx.id}
                tx={tx}
                currency={currency}
                locale={locale}
                onEdit={setEditing}
                onDelete={setDeleting}
              />
            ))}
          </ul>
        </div>
      ) : (
        <EmptyState
          icon={ReceiptText}
          title={t('tx.empty')}
          hint={t('tx.emptyHint')}
          action={
            <Link to="/add" className="btn-primary">
              <Plus className="h-4 w-4" />
              {t('tx.addTitle')}
            </Link>
          }
        />
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={t('tx.editTitle')}>
        {editing && (
          <TransactionForm
            initial={editing}
            submitLabel={t('common.save')}
            onCancel={() => setEditing(null)}
            onSubmit={(values) => {
              updateTransaction(editing.id, values)
              setEditing(null)
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleteTransaction(deleting.id)}
        title={t('tx.deleteTitle')}
        body={deleting ? t('tx.deleteBody', { name: deleting.description, amount: formatMoney(deleting.amount, currency, locale) }) : ''}
        confirmLabel={t('common.delete')}
      />
    </div>
  )
}
