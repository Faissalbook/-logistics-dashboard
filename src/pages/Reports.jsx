import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, FileDown, FileText, Trophy, AlertTriangle, BarChart3 } from 'lucide-react'
import { useI18n } from '../store/uiStore'
import { useBudgetStore, resolveMonthConfig } from '../store/budgetStore'
import { monthTransactions, monthStats, spendingBySubcategory, topCategories, clamp } from '../utils/calculations'
import { formatMoney } from '../utils/currency'
import { formatMonth, formatMonthShort, lastNMonths, monthKeyOf } from '../utils/dates'
import { GROUP_META } from '../utils/categories'
import MonthSelector from '../components/MonthSelector'
import { BudgetVsActualChart, TrendChart, SavingsProgressChart, TopCategoriesList } from '../components/charts'
import { EmptyState } from '../components/ui'
import { exportTransactionsCSV, exportReportCSV, exportReportPDF } from '../utils/exporters'

function emptyAgg() {
  return {
    income: 0,
    totalSpent: 0,
    totalSaved: 0,
    totalOut: 0,
    remaining: 0,
    savingsRate: 0,
    usageRaw: 0,
    groups: {
      needs: { budget: 0, spent: 0, remaining: 0, pct: 0, progress: 0, overBy: 0, status: 'ok' },
      wants: { budget: 0, spent: 0, remaining: 0, pct: 0, progress: 0, overBy: 0, status: 'ok' },
      savings: { budget: 0, spent: 0, remaining: 0, pct: 0, progress: 0, overBy: 0, status: 'ok' },
    },
  }
}

export default function Reports() {
  const { t, locale, language } = useI18n()
  const { currency, selectedMonth, months, transactions, setSelectedMonth } = useBudgetStore()
  const [period, setPeriod] = useState('monthly')
  const [year, setYear] = useState(Number(selectedMonth.slice(0, 4)))

  const money = (v) => formatMoney(v, currency, locale)

  // ----- Monthly data -----
  const monthTxs = useMemo(
    () => monthTransactions(transactions, selectedMonth),
    [transactions, selectedMonth]
  )
  const monthCfg = resolveMonthConfig(months, selectedMonth)
  const mStats = useMemo(() => monthStats(monthCfg, monthTxs), [monthCfg, monthTxs])

  // ----- Yearly data -----
  const yearData = useMemo(() => {
    const keys = [...Array(12)].map((_, i) => `${year}-${String(i + 1).padStart(2, '0')}`)
    // Only months the user actually budgeted or spent in count toward totals.
    const activeKeys = keys.filter(
      (k) => months[k] || transactions.some((tx) => monthKeyOf(tx.date) === k)
    )
    const agg = emptyAgg()
    const perMonth = []
    for (const k of keys) {
      const txs = monthTransactions(transactions, k)
      const isActive = activeKeys.includes(k)
      const stats = isActive ? monthStats(resolveMonthConfig(months, k), txs) : null
      perMonth.push({ key: k, stats, txs })
      if (!stats) continue
      agg.income += stats.income
      agg.totalSpent += stats.totalSpent
      agg.totalSaved += stats.totalSaved
      for (const g of ['needs', 'wants', 'savings']) {
        agg.groups[g].budget += stats.groups[g].budget
        agg.groups[g].spent += stats.groups[g].spent
        agg.groups[g].pct = stats.groups[g].pct
      }
    }
    agg.totalOut = agg.totalSpent + agg.totalSaved
    agg.remaining = agg.income - agg.totalOut
    agg.savingsRate = agg.income > 0 ? (agg.totalSaved / agg.income) * 100 : 0
    agg.usageRaw = agg.income > 0 ? (agg.totalOut / agg.income) * 100 : 0
    for (const g of ['needs', 'wants', 'savings']) {
      const grp = agg.groups[g]
      grp.remaining = grp.budget - grp.spent
      grp.overBy = Math.max(0, grp.spent - grp.budget)
      grp.progress = grp.budget > 0 ? clamp((grp.spent / grp.budget) * 100, 0, 100) : 0
      grp.status = grp.budget > 0 && grp.spent > grp.budget ? 'over' : grp.budget > 0 && grp.spent / grp.budget >= 0.8 ? 'warn' : 'ok'
    }
    return { agg, perMonth, activeKeys }
  }, [transactions, months, year])

  const isMonthly = period === 'monthly'
  const stats = isMonthly ? mStats : yearData.agg
  const periodTxs = isMonthly
    ? monthTxs
    : yearData.perMonth.flatMap((m) => m.txs)
  const byCategory = useMemo(() => spendingBySubcategory(periodTxs), [periodTxs])
  const top5 = useMemo(() => topCategories(periodTxs, 5), [periodTxs])
  const periodLabel = isMonthly ? formatMonth(selectedMonth, locale) : String(year)

  // Chart series: last 6 months (monthly view) or the 12 months of the year.
  const seriesKeys = isMonthly
    ? lastNMonths(selectedMonth, 6)
    : yearData.perMonth.map((m) => m.key)
  const trendSeries = seriesKeys.map((k) => {
    const s = isMonthly
      ? monthStats(resolveMonthConfig(months, k), monthTransactions(transactions, k))
      : yearData.perMonth.find((m) => m.key === k)?.stats
    return {
      label: formatMonthShort(k, locale),
      needs: s?.groups.needs.spent ?? 0,
      wants: s?.groups.wants.spent ?? 0,
      savings: s?.groups.savings.spent ?? 0,
      saved: s?.groups.savings.spent ?? 0,
      target: s?.groups.savings.budget ?? 0,
    }
  })

  // Best / worst performing spending group over the period.
  const bestWorst = useMemo(() => {
    const candidates = ['needs', 'wants']
      .map((g) => ({ g, ...stats.groups[g] }))
      .filter((c) => c.budget > 0)
      .sort((a, b) => a.spent / a.budget - b.spent / b.budget)
    return candidates.length
      ? { best: candidates[0], worst: candidates[candidates.length - 1] }
      : { best: null, worst: null }
  }, [stats])

  const hasData = periodTxs.length > 0 || stats.income > 0

  const doExportReportCSV = () =>
    exportReportCSV({
      title: `BudgetFlow — ${t('reports.report')} ${periodLabel}`,
      summaryRows: [
        [t('reports.income'), stats.income],
        [t('reports.spending'), stats.totalSpent],
        [t('reports.savings'), stats.totalSaved],
        [t('reports.savingsRate'), `${stats.savingsRate.toFixed(1)}%`],
        [t('dash.remaining'), stats.remaining],
        [],
        [t('reports.budgetVsActual'), t('reports.budget'), t('reports.actual')],
        ...['needs', 'wants', 'savings'].map((g) => [t(`group.${g}`), stats.groups[g].budget, stats.groups[g].spent]),
      ],
      categoryRows: byCategory.map((c) => [t(`cat.${c.subcategory}`), t(`group.${c.group}`), c.amount]),
      t,
      filename: `budgetflow-report-${isMonthly ? selectedMonth : year}.csv`,
    })

  const doExportTxCSV = () =>
    exportTransactionsCSV({
      txs: [...periodTxs].sort((a, b) => a.date.localeCompare(b.date)),
      currency,
      locale,
      t,
      filename: `budgetflow-transactions-${isMonthly ? selectedMonth : year}.csv`,
    })

  const doExportPDF = () =>
    exportReportPDF({
      periodLabel,
      stats,
      byCategory,
      txs: [...periodTxs].sort((a, b) => a.date.localeCompare(b.date)),
      currency,
      locale,
      t,
      language,
      filename: `budgetflow-report-${isMonthly ? selectedMonth : year}.pdf`,
    })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t('reports.title')}</h1>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl border border-black/10 p-1 dark:border-white/10" role="radiogroup">
            {['monthly', 'yearly'].map((p) => (
              <button
                key={p}
                role="radio"
                aria-checked={period === p}
                onClick={() => setPeriod(p)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  period === p
                    ? 'bg-[#0b0b0b] text-white dark:bg-white dark:text-[#0b0b0b]'
                    : 'text-neutral-500 hover:bg-black/5 dark:text-neutral-400 dark:hover:bg-white/10'
                }`}
              >
                {t(p === 'monthly' ? 'common.monthly' : 'common.yearly')}
              </button>
            ))}
          </div>
          {isMonthly ? (
            <MonthSelector month={selectedMonth} onChange={setSelectedMonth} />
          ) : (
            <div className="inline-flex items-center gap-1 rounded-xl border border-black/10 bg-surface-light p-1 dark:border-white/10 dark:bg-surface-dark">
              <button onClick={() => setYear(year - 1)} className="rounded-lg p-1.5 text-neutral-500 hover:bg-black/5 dark:hover:bg-white/10" aria-label="Previous year">
                <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
              </button>
              <span className="min-w-[4rem] text-center text-sm font-semibold tabular-nums">{year}</span>
              <button onClick={() => setYear(year + 1)} className="rounded-lg p-1.5 text-neutral-500 hover:bg-black/5 dark:hover:bg-white/10" aria-label="Next year">
                <ChevronRight className="h-4 w-4 rtl:rotate-180" />
              </button>
            </div>
          )}
        </div>
      </div>

      {!hasData ? (
        <EmptyState icon={BarChart3} title={t('reports.noData')} />
      ) : (
        <>
          {/* Summary tiles */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            {[
              [t('reports.income'), money(stats.income)],
              [t('reports.spending'), money(stats.totalSpent)],
              [t('reports.savings'), money(stats.totalSaved)],
              [t('reports.savingsRate'), `${stats.savingsRate.toFixed(1)}%`],
            ].map(([label, value]) => (
              <div key={label} className="card p-4 animate-fade-up">
                <p className="text-xs font-medium text-neutral-400">{label}</p>
                <p className="mt-1.5 truncate text-xl font-bold tracking-tight">{value}</p>
              </div>
            ))}
          </div>

          {/* Export actions */}
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={doExportReportCSV}>
              <FileDown className="h-4 w-4" />
              {t('reports.exportCSV')} — {t('reports.report')}
            </button>
            <button className="btn-secondary" onClick={doExportTxCSV}>
              <FileDown className="h-4 w-4" />
              {t('reports.exportCSV')} — {t('reports.transactions')}
            </button>
            <button className="btn-secondary" onClick={doExportPDF}>
              <FileText className="h-4 w-4" />
              {t('reports.exportPDF')}
            </button>
          </div>

          {/* Best / worst */}
          {bestWorst.best && (
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="card flex items-center gap-3 p-4 animate-fade-up">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-savings-soft text-savings dark:bg-savings-softdark dark:text-savings-dark">
                  <Trophy className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-neutral-400">{t('reports.best')} · {t('reports.bestHint')}</p>
                  <p className="truncate font-bold">
                    {t(GROUP_META[bestWorst.best.g].labelKey)}
                    <span className="ms-2 text-sm font-semibold text-neutral-400">
                      {t('reports.ofBudget', { pct: Math.round((bestWorst.best.spent / bestWorst.best.budget) * 100) })}
                    </span>
                  </p>
                </div>
              </div>
              <div className="card flex items-center gap-3 p-4 animate-fade-up">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-wants-soft text-wants dark:bg-wants-softdark dark:text-wants-dark">
                  <AlertTriangle className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-neutral-400">{t('reports.worst')} · {t('reports.worstHint')}</p>
                  <p className="truncate font-bold">
                    {t(GROUP_META[bestWorst.worst.g].labelKey)}
                    <span className="ms-2 text-sm font-semibold text-neutral-400">
                      {t('reports.ofBudget', { pct: Math.round((bestWorst.worst.spent / bestWorst.worst.budget) * 100) })}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card p-5 animate-fade-up">
              <h2 className="mb-3 font-bold">{t('reports.budgetVsActual')}</h2>
              <BudgetVsActualChart stats={stats} currency={currency} locale={locale} />
            </section>
            <section className="card p-5 animate-fade-up">
              <h2 className="mb-3 font-bold">{t('reports.top5')}</h2>
              {top5.length ? (
                <TopCategoriesList items={top5} currency={currency} locale={locale} />
              ) : (
                <p className="py-8 text-center text-sm text-neutral-400">{t('reports.noData')}</p>
              )}
            </section>
            <section className="card p-5 animate-fade-up">
              <h2 className="mb-3 font-bold">{t('reports.trend')}</h2>
              <TrendChart series={trendSeries} currency={currency} locale={locale} />
            </section>
            <section className="card p-5 animate-fade-up">
              <h2 className="mb-3 font-bold">{t('reports.savingsProgress')}</h2>
              <SavingsProgressChart series={trendSeries} currency={currency} locale={locale} />
            </section>
          </div>
        </>
      )}
    </div>
  )
}
