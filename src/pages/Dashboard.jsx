import { Link } from 'react-router-dom'
import {
  Wallet, TrendingDown, PiggyBank, Scale, Lightbulb, CheckCircle2, AlertTriangle,
  AlertOctagon, Info, ArrowRight, ArrowLeft, ReceiptText,
} from 'lucide-react'
import { useI18n } from '../store/uiStore'
import { useAuthStore } from '../store/authStore'
import { useBudgetStore, resolveMonthConfig } from '../store/budgetStore'
import { monthTransactions, monthStats, buildInsights } from '../utils/calculations'
import { formatMoney } from '../utils/currency'
import { formatMonth, shiftMonth } from '../utils/dates'
import { GROUPS } from '../utils/categories'
import BudgetCard from '../components/BudgetCard'
import MonthSelector from '../components/MonthSelector'
import TransactionItem from '../components/TransactionItem'
import { SpendingDoughnut } from '../components/charts'
import { EmptyState, ProgressBar } from '../components/ui'

const TONE_META = {
  good: { icon: CheckCircle2, cls: 'text-savings dark:text-savings-dark' },
  info: { icon: Info, cls: 'text-needs dark:text-needs-dark' },
  warn: { icon: AlertTriangle, cls: 'text-wants dark:text-wants-dark' },
  over: { icon: AlertOctagon, cls: 'text-danger dark:text-danger-dark' },
}

function StatTile({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="card p-4 animate-fade-up">
      <div className="flex items-center gap-2 text-neutral-400">
        <Icon className="h-4 w-4" aria-hidden />
        <p className="text-xs font-medium">{label}</p>
      </div>
      <p className={`mt-1.5 truncate text-xl font-bold tracking-tight ${accent || ''}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-neutral-400">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const { t, locale, isRTL } = useI18n()
  const user = useAuthStore((s) => s.user)
  const { currency, selectedMonth, months, transactions, setSelectedMonth } = useBudgetStore()

  const cfg = resolveMonthConfig(months, selectedMonth)
  const txs = monthTransactions(transactions, selectedMonth)
  const prevTxs = monthTransactions(transactions, shiftMonth(selectedMonth, -1))
  const stats = monthStats(cfg, txs)
  const money = (v) => formatMoney(v, currency, locale)
  const insights = buildInsights(stats, txs, prevTxs, t, money)

  const recent = [...txs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
  const ViewAllArrow = isRTL ? ArrowLeft : ArrowRight

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {t('dash.hello', { name: user?.name?.split(' ')[0] || '' })}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {t('dash.overview', { month: formatMonth(selectedMonth, locale) })}
          </p>
        </div>
        <MonthSelector month={selectedMonth} onChange={setSelectedMonth} />
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile icon={Wallet} label={t('dash.income')} value={money(stats.income)} />
        <StatTile icon={TrendingDown} label={t('dash.spent')} value={money(stats.totalSpent)} />
        <StatTile
          icon={Scale}
          label={t('dash.remaining')}
          value={money(stats.remaining)}
          accent={stats.remaining < 0 ? 'text-danger dark:text-danger-dark' : ''}
        />
        <StatTile
          icon={PiggyBank}
          label={t('dash.saved')}
          value={money(stats.totalSaved)}
          sub={`${t('reports.savingsRate')}: ${stats.savingsRate.toFixed(1)}%`}
        />
      </div>

      {/* Overall usage */}
      <div className="card p-5 animate-fade-up">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-sm font-semibold">{t('dash.usage')}</p>
          <p className="text-sm font-bold tabular-nums">{Math.round(stats.usageRaw)}%</p>
        </div>
        <ProgressBar
          value={stats.usagePct}
          colorClass="bg-[#0b0b0b] dark:bg-white"
          trackClass="bg-black/10 dark:bg-white/15"
          over={stats.usageRaw > 100}
        />
      </div>

      {/* Budget cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {GROUPS.map((g) => (
          <BudgetCard key={g} group={g} data={stats.groups[g]} currency={currency} locale={locale} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Spending distribution */}
        <section className="card p-5 animate-fade-up lg:col-span-2">
          <h2 className="mb-3 font-bold">{t('dash.spendingDistribution')}</h2>
          {stats.totalOut > 0 ? (
            <SpendingDoughnut stats={stats} currency={currency} locale={locale} />
          ) : (
            <p className="py-10 text-center text-sm text-neutral-400">{t('dash.noSpending')}</p>
          )}
        </section>

        <div className="space-y-4 lg:col-span-3">
          {/* Insights */}
          <section className="card p-5 animate-fade-up">
            <h2 className="mb-3 flex items-center gap-2 font-bold">
              <Lightbulb className="h-4 w-4 text-wants dark:text-wants-dark" aria-hidden />
              {t('dash.insights')}
            </h2>
            <ul className="space-y-2.5">
              {insights.map((ins) => {
                const meta = TONE_META[ins.tone]
                const Icon = meta.icon
                return (
                  <li key={ins.id} className="flex items-start gap-2.5 text-sm">
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.cls}`} aria-hidden />
                    <span className="text-neutral-700 dark:text-neutral-200">{ins.text}</span>
                  </li>
                )
              })}
            </ul>
          </section>

          {/* Recent transactions */}
          <section className="card animate-fade-up">
            <div className="flex items-center justify-between px-5 pt-4">
              <h2 className="font-bold">{t('dash.recent')}</h2>
              <Link
                to="/transactions"
                className="flex items-center gap-1 text-sm font-semibold text-needs hover:underline dark:text-needs-dark"
              >
                {t('dash.viewAll')}
                <ViewAllArrow className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
            {recent.length ? (
              <ul className="mt-2 divide-y divide-black/5 pb-2 dark:divide-white/5">
                {recent.map((tx) => (
                  <TransactionItem key={tx.id} tx={tx} currency={currency} locale={locale} />
                ))}
              </ul>
            ) : (
              <div className="px-5 pb-5 pt-3">
                <EmptyState
                  icon={ReceiptText}
                  title={t('dash.noTx')}
                  action={
                    <Link to="/add" className="btn-primary">
                      {t('dash.addFirst')}
                    </Link>
                  }
                />
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
