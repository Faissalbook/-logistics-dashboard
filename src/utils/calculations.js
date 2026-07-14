import { monthKeyOf } from './dates'

export const clamp = (v, min, max) => Math.min(Math.max(v, min), max)

export function monthTransactions(transactions, monthKey) {
  return transactions.filter((tx) => monthKeyOf(tx.date) === monthKey)
}

export function groupSpent(txs) {
  const totals = { needs: 0, wants: 0, savings: 0 }
  for (const tx of txs) {
    if (totals[tx.group] !== undefined) totals[tx.group] += tx.amount
  }
  return totals
}

// Status thresholds for a category's budget usage.
export function usageStatus(spent, budget) {
  if (budget <= 0) return spent > 0 ? 'over' : 'ok'
  const ratio = spent / budget
  if (ratio > 1) return 'over'
  if (ratio >= 0.8) return 'warn'
  return 'ok'
}

/**
 * All headline numbers for one month.
 * Progress percentages are clamped to [0, 100] — overspending is reported
 * separately via `overBy`, never as a >100% or negative bar.
 */
export function monthStats(monthConfig, txs) {
  const income = monthConfig?.income || 0
  const pct = monthConfig?.pct || { needs: 50, wants: 30, savings: 20 }
  const spent = groupSpent(txs)

  const groups = {}
  for (const g of ['needs', 'wants', 'savings']) {
    const budget = (income * (pct[g] || 0)) / 100
    const used = spent[g]
    groups[g] = {
      pct: pct[g] || 0,
      budget,
      spent: used,
      remaining: budget - used,
      progress: budget > 0 ? clamp((used / budget) * 100, 0, 100) : used > 0 ? 100 : 0,
      overBy: Math.max(0, used - budget),
      status: usageStatus(used, budget),
    }
  }

  const totalSpent = spent.needs + spent.wants
  const totalSaved = spent.savings
  const totalOut = totalSpent + totalSaved
  return {
    income,
    groups,
    totalSpent,
    totalSaved,
    totalOut,
    remaining: income - totalOut,
    usagePct: income > 0 ? clamp((totalOut / income) * 100, 0, 100) : 0,
    usageRaw: income > 0 ? (totalOut / income) * 100 : 0,
    savingsRate: income > 0 ? (totalSaved / income) * 100 : 0,
  }
}

export function spendingBySubcategory(txs) {
  const map = {}
  for (const tx of txs) {
    const key = `${tx.group}:${tx.subcategory}`
    if (!map[key]) map[key] = { group: tx.group, subcategory: tx.subcategory, amount: 0, count: 0 }
    map[key].amount += tx.amount
    map[key].count += 1
  }
  return Object.values(map).sort((a, b) => b.amount - a.amount)
}

export function topCategories(txs, n = 5) {
  return spendingBySubcategory(txs.filter((t) => t.group !== 'savings')).slice(0, n)
}

/**
 * Plain-language insights for the dashboard.
 * Returns [{ id, tone: 'good'|'info'|'warn'|'over', params }] — text is
 * resolved by the caller through t() so insights are fully localized.
 */
export function buildInsights(stats, txs, prevTxs, t, money) {
  const out = []
  if (!stats.income) {
    return [{ id: 'noIncome', tone: 'info', text: t('insight.noIncome') }]
  }

  const g = stats.groups
  // Needs / Wants over or near limit
  for (const key of ['needs', 'wants']) {
    const grp = g[key]
    const label = t(`group.${key}`)
    if (grp.status === 'over' && grp.budget > 0) {
      const overPct = Math.round(((grp.spent - grp.budget) / grp.budget) * 100)
      out.push({
        id: `${key}-over`,
        tone: 'over',
        text: t('insight.aboveLimit', { group: label, pct: overPct }),
      })
    } else if (grp.status === 'warn') {
      out.push({
        id: `${key}-warn`,
        tone: 'warn',
        text: t('insight.wantsUsage', { group: label, pct: Math.round(grp.progress) }),
      })
    }
  }

  // Savings target
  const sv = g.savings
  if (sv.budget > 0) {
    if (sv.spent >= sv.budget) {
      out.push({ id: 'savings-reached', tone: 'good', text: t('insight.savingsReached') })
    } else {
      out.push({
        id: 'savings-more',
        tone: 'info',
        text: t('insight.saveMore', { amount: money(sv.budget - sv.spent) }),
      })
    }
  }

  // Biggest subcategory movement vs last month (spending groups only)
  if (prevTxs?.length) {
    const cur = spendingBySubcategory(txs.filter((x) => x.group !== 'savings'))
    const prev = spendingBySubcategory(prevTxs.filter((x) => x.group !== 'savings'))
    let best = null
    for (const c of cur) {
      const p = prev.find((x) => x.group === c.group && x.subcategory === c.subcategory)
      if (!p || p.amount <= 0) continue
      const change = (c.amount - p.amount) / p.amount
      if (Math.abs(change) >= 0.15 && (!best || Math.abs(change) > Math.abs(best.change))) {
        best = { ...c, change }
      }
    }
    if (best) {
      out.push({
        id: 'category-move',
        tone: best.change > 0 ? 'warn' : 'good',
        text: t(best.change > 0 ? 'insight.categoryUp' : 'insight.categoryDown', {
          category: t(`cat.${best.subcategory}`),
          pct: Math.round(Math.abs(best.change) * 100),
        }),
      })
    }
  }

  if (out.every((i) => i.tone === 'good' || i.tone === 'info')) {
    out.unshift({
      id: 'on-track',
      tone: 'good',
      text: t('insight.onTrack', { pct: Math.round(stats.usageRaw) }),
    })
  }

  return out.slice(0, 4)
}

// Best = furthest under budget; worst = closest to or furthest over budget.
export function bestWorstCategory(monthConfigs, txsByMonth) {
  const totals = {} // subcategory → {spent, budget-share}
  // Compare at the group level across the period for clarity.
  const agg = { needs: { spent: 0, budget: 0 }, wants: { spent: 0, budget: 0 }, savings: { spent: 0, budget: 0 } }
  for (const [monthKey, cfg] of Object.entries(monthConfigs)) {
    const stats = monthStats(cfg, txsByMonth[monthKey] || [])
    for (const g of ['needs', 'wants', 'savings']) {
      agg[g].spent += stats.groups[g].spent
      agg[g].budget += stats.groups[g].budget
    }
  }
  let best = null
  let worst = null
  for (const g of ['needs', 'wants']) {
    if (agg[g].budget <= 0) continue
    const ratio = agg[g].spent / agg[g].budget
    if (!best || ratio < best.ratio) best = { group: g, ratio, ...agg[g] }
    if (!worst || ratio > worst.ratio) worst = { group: g, ratio, ...agg[g] }
  }
  return { best, worst, totals }
}
