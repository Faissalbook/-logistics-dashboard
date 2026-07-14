import { create } from 'zustand'
import { currentMonthKey, monthKeyOf, compareMonths, clampDayToMonth, shiftMonth } from '../utils/dates'
import { buildSampleData } from '../utils/sampleData'

const dataKey = (userId) => `bf.data.${userId}`
const uid = () => crypto.randomUUID()

const DEFAULT_PCT = { needs: 50, wants: 30, savings: 20 }

const emptyData = () => ({
  setupComplete: false,
  currency: 'GNF',
  selectedMonth: currentMonthKey(),
  months: {}, // monthKey → { income, pct: {needs, wants, savings} }
  transactions: [],
  goals: [],
})

function readData(userId) {
  try {
    const raw = JSON.parse(localStorage.getItem(dataKey(userId)))
    if (raw && typeof raw === 'object') return { ...emptyData(), ...raw }
  } catch {
    // corrupt payload — start fresh
  }
  return emptyData()
}

/**
 * Config for a month, inheriting income/percentages from the most recent
 * earlier month when the month itself has no explicit config.
 */
export function resolveMonthConfig(months, monthKey) {
  if (months[monthKey]) return months[monthKey]
  const keys = Object.keys(months).filter((k) => compareMonths(k, monthKey) < 0).sort()
  if (keys.length) return months[keys[keys.length - 1]]
  return { income: 0, pct: DEFAULT_PCT }
}

/**
 * Copies recurring transactions into `monthKey` when the series started
 * earlier and has no instance there yet. Only past/current months are
 * filled, so browsing ahead never fabricates future spending.
 */
function materializeRecurring(transactions, goals, monthKey) {
  if (compareMonths(monthKey, currentMonthKey()) > 0) return null

  const bySeries = new Map()
  for (const tx of transactions) {
    if (!tx.recurring || !tx.recurringId) continue
    const list = bySeries.get(tx.recurringId) || []
    list.push(tx)
    bySeries.set(tx.recurringId, list)
  }

  const created = []
  const goalIncrements = new Map()
  for (const list of bySeries.values()) {
    list.sort((a, b) => a.date.localeCompare(b.date))
    const first = list[0]
    const latest = list[list.length - 1]
    const hasInstance = list.some((tx) => monthKeyOf(tx.date) === monthKey)
    if (hasInstance || compareMonths(monthKeyOf(first.date), monthKey) >= 0) continue

    const day = Number(latest.date.slice(8, 10))
    created.push({
      ...latest,
      id: uid(),
      date: clampDayToMonth(monthKey, day),
    })
    if (latest.goalId) {
      goalIncrements.set(latest.goalId, (goalIncrements.get(latest.goalId) || 0) + latest.amount)
    }
  }
  if (!created.length) return null

  const nextGoals = goalIncrements.size
    ? goals.map((g) =>
        goalIncrements.has(g.id) ? { ...g, current: g.current + goalIncrements.get(g.id) } : g
      )
    : goals
  return { transactions: [...transactions, ...created], goals: nextGoals }
}

export const useBudgetStore = create((set, get) => {
  let activeUserId = null

  const save = () => {
    if (!activeUserId) return
    const { setupComplete, currency, selectedMonth, months, transactions, goals } = get()
    localStorage.setItem(
      dataKey(activeUserId),
      JSON.stringify({ setupComplete, currency, selectedMonth, months, transactions, goals })
    )
  }

  const mutate = (patch) => {
    set(patch)
    save()
  }

  return {
    ...emptyData(),
    loaded: false,

    loadForUser: (userId) => {
      activeUserId = userId
      if (!userId) {
        set({ ...emptyData(), loaded: false })
        return
      }
      const data = readData(userId)
      // Always land on the real current month at sign-in.
      data.selectedMonth = currentMonthKey()
      set({ ...data, loaded: true })
      get().applyRecurring(data.selectedMonth)
    },

    completeSetup: ({ currency, income, month, pct, withSample }) => {
      if (withSample) {
        const sample = buildSampleData(currency, income)
        sample.months[month] = { income, pct }
        mutate({
          setupComplete: true,
          currency,
          selectedMonth: month,
          months: sample.months,
          transactions: sample.transactions,
          goals: sample.goals,
        })
      } else {
        mutate({
          setupComplete: true,
          currency,
          selectedMonth: month,
          months: { [month]: { income, pct } },
        })
      }
    },

    setSelectedMonth: (monthKey) => {
      mutate({ selectedMonth: monthKey })
      get().applyRecurring(monthKey)
    },

    setCurrency: (currency) => mutate({ currency }),

    updateMonthConfig: (monthKey, { income, pct }) => {
      const months = { ...get().months }
      const cur = resolveMonthConfig(months, monthKey)
      months[monthKey] = {
        income: income ?? cur.income,
        pct: pct ?? cur.pct,
      }
      mutate({ months })
    },

    applyRecurring: (monthKey) => {
      const { transactions, goals } = get()
      const result = materializeRecurring(transactions, goals, monthKey)
      if (result) mutate(result)
    },

    addTransaction: (tx) => {
      const record = {
        id: uid(),
        note: '',
        goalId: null,
        ...tx,
        recurringId: tx.recurring ? uid() : null,
      }
      const patch = { transactions: [...get().transactions, record] }
      if (record.goalId && record.group === 'savings') {
        patch.goals = get().goals.map((g) =>
          g.id === record.goalId ? { ...g, current: g.current + record.amount } : g
        )
      }
      mutate(patch)
      return record
    },

    updateTransaction: (id, changes) => {
      const prev = get().transactions.find((t) => t.id === id)
      if (!prev) return
      const next = { ...prev, ...changes }
      // Turning recurring on/off manages series membership.
      if (changes.recurring !== undefined) {
        if (changes.recurring && !prev.recurringId) next.recurringId = uid()
        if (!changes.recurring) next.recurringId = null
      }
      const patch = { transactions: get().transactions.map((t) => (t.id === id ? next : t)) }
      // Keep linked goal totals consistent when the amount changes.
      if (prev.goalId && prev.group === 'savings') {
        const delta = (next.amount || 0) - prev.amount
        if (delta !== 0) {
          patch.goals = get().goals.map((g) =>
            g.id === prev.goalId ? { ...g, current: Math.max(0, g.current + delta) } : g
          )
        }
      }
      mutate(patch)
    },

    deleteTransaction: (id) => {
      const tx = get().transactions.find((t) => t.id === id)
      const patch = { transactions: get().transactions.filter((t) => t.id !== id) }
      if (tx?.goalId && tx.group === 'savings') {
        patch.goals = get().goals.map((g) =>
          g.id === tx.goalId ? { ...g, current: Math.max(0, g.current - tx.amount) } : g
        )
      }
      mutate(patch)
    },

    addGoal: (goal) => {
      const record = { id: uid(), current: 0, createdAt: new Date().toISOString(), ...goal }
      mutate({ goals: [...get().goals, record] })
      return record
    },

    updateGoal: (id, changes) =>
      mutate({ goals: get().goals.map((g) => (g.id === id ? { ...g, ...changes } : g)) }),

    deleteGoal: (id) => {
      // Keep the transactions but unlink them from the removed goal.
      mutate({
        goals: get().goals.filter((g) => g.id !== id),
        transactions: get().transactions.map((t) => (t.goalId === id ? { ...t, goalId: null } : t)),
      })
    },

    contributeToGoal: (goalId, { amount, date, recurring }) => {
      const goal = get().goals.find((g) => g.id === goalId)
      if (!goal) return
      get().addTransaction({
        date,
        description: goal.name,
        amount,
        group: 'savings',
        subcategory: 'otherGoals',
        paymentMethod: 'bankTransfer',
        recurring: !!recurring,
        goalId,
      })
    },

    loadSampleData: () => {
      const { currency, months, selectedMonth } = get()
      const cfg = resolveMonthConfig(months, selectedMonth)
      const sample = buildSampleData(currency, cfg.income || undefined)
      mutate({
        setupComplete: true,
        months: { ...sample.months, ...months },
        transactions: [...get().transactions, ...sample.transactions],
        goals: [...get().goals, ...sample.goals],
      })
    },

    clearAllData: () => {
      const { currency } = get()
      mutate({ ...emptyData(), currency, loaded: true, setupComplete: false })
    },
  }
})

export { DEFAULT_PCT, shiftMonth }
