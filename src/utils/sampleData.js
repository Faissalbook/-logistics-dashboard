import { currentMonthKey, shiftMonth, clampDayToMonth, todayISO } from './dates'

// Income scale per currency so sample amounts feel realistic.
const INCOME_BY_CURRENCY = {
  GNF: 8000000,
  USD: 3200,
  EUR: 3000,
  GBP: 2800,
  CAD: 4200,
}

const uid = () => crypto.randomUUID()

/**
 * Three months of realistic data (two past months complete, current month
 * partially filled). Amounts are fractions of income so the data reads
 * sensibly in any currency.
 */
export function buildSampleData(currency = 'GNF', income) {
  const base = income || INCOME_BY_CURRENCY[currency] || 3000
  const round = (f) => {
    const v = base * f
    return base >= 100000 ? Math.round(v / 1000) * 1000 : Math.round(v * 100) / 100
  }

  const m0 = currentMonthKey()
  const m1 = shiftMonth(m0, -1)
  const m2 = shiftMonth(m0, -2)

  const rentRecurring = uid()
  const internetRecurring = uid()
  const gymRecurring = uid()
  const emergencyRecurring = uid()

  const monthSet = (m, variance, partial = false) => {
    const txs = [
      // Needs
      { date: clampDayToMonth(m, 1), description: 'Monthly rent', group: 'needs', subcategory: 'housing', amount: round(0.22), paymentMethod: 'bankTransfer', recurring: true, recurringId: rentRecurring },
      { date: clampDayToMonth(m, 3), description: 'Groceries — central market', group: 'needs', subcategory: 'food', amount: round(0.055 * variance), paymentMethod: 'cash' },
      { date: clampDayToMonth(m, 5), description: 'Electricity bill', group: 'needs', subcategory: 'electricity', amount: round(0.022 * variance), paymentMethod: 'mobileMoney' },
      { date: clampDayToMonth(m, 7), description: 'Taxi & fuel', group: 'needs', subcategory: 'transport', amount: round(0.03 * variance), paymentMethod: 'cash' },
      { date: clampDayToMonth(m, 8), description: 'Internet & phone plan', group: 'needs', subcategory: 'phoneInternet', amount: round(0.02), paymentMethod: 'mobileMoney', recurring: true, recurringId: internetRecurring },
      { date: clampDayToMonth(m, 12), description: 'Pharmacy', group: 'needs', subcategory: 'healthcare', amount: round(0.012 * variance), paymentMethod: 'cash' },
      // Wants
      { date: clampDayToMonth(m, 6), description: 'Dinner with friends', group: 'wants', subcategory: 'restaurants', amount: round(0.025 * variance), paymentMethod: 'card' },
      { date: clampDayToMonth(m, 10), description: 'Streaming subscriptions', group: 'wants', subcategory: 'subscriptions', amount: round(0.008), paymentMethod: 'card', recurring: true, recurringId: gymRecurring },
      { date: clampDayToMonth(m, 14), description: 'New clothes', group: 'wants', subcategory: 'shopping', amount: round(0.035 * variance), paymentMethod: 'card' },
      // Savings
      { date: clampDayToMonth(m, 2), description: 'Emergency fund deposit', group: 'savings', subcategory: 'emergencyFund', amount: round(0.1), paymentMethod: 'bankTransfer', recurring: true, recurringId: emergencyRecurring },
      { date: clampDayToMonth(m, 15), description: 'Loan repayment', group: 'savings', subcategory: 'loanRepayment', amount: round(0.05), paymentMethod: 'bankTransfer' },
    ]
    if (!partial) {
      txs.push(
        { date: clampDayToMonth(m, 17), description: 'Groceries — weekly top-up', group: 'needs', subcategory: 'food', amount: round(0.05 * variance), paymentMethod: 'cash' },
        { date: clampDayToMonth(m, 19), description: 'Water bill', group: 'needs', subcategory: 'water', amount: round(0.008), paymentMethod: 'mobileMoney' },
        { date: clampDayToMonth(m, 21), description: 'Cinema night', group: 'wants', subcategory: 'entertainment', amount: round(0.012 * variance), paymentMethod: 'card' },
        { date: clampDayToMonth(m, 23), description: 'Restaurant lunch', group: 'wants', subcategory: 'restaurants', amount: round(0.018 * variance), paymentMethod: 'cash' },
        { date: clampDayToMonth(m, 26), description: 'Weekend trip', group: 'wants', subcategory: 'travel', amount: round(0.03 * variance), paymentMethod: 'card' },
        { date: clampDayToMonth(m, 27), description: 'Investment deposit', group: 'savings', subcategory: 'investments', amount: round(0.04), paymentMethod: 'bankTransfer' },
        { date: clampDayToMonth(m, 28), description: 'Groceries — month end', group: 'needs', subcategory: 'food', amount: round(0.04 * variance), paymentMethod: 'cash' }
      )
    }
    return txs.map((t) => ({ id: uid(), note: '', recurring: false, recurringId: null, goalId: null, ...t }))
  }

  const transactions = [
    ...monthSet(m2, 0.95),
    ...monthSet(m1, 1.1),
    ...monthSet(m0, 1.0, true),
  ]

  const goals = [
    {
      id: uid(),
      name: 'Emergency fund',
      target: round(3),
      current: round(0.9),
      targetDate: shiftMonth(m0, 10) + '-01',
      monthly: round(0.1),
      createdAt: todayISO(),
    },
    {
      id: uid(),
      name: 'New laptop',
      target: round(0.6),
      current: round(0.25),
      targetDate: shiftMonth(m0, 4) + '-01',
      monthly: round(0.06),
      createdAt: todayISO(),
    },
    {
      id: uid(),
      name: 'Business capital',
      target: round(6),
      current: round(0.5),
      targetDate: shiftMonth(m0, 18) + '-01',
      monthly: round(0.08),
      createdAt: todayISO(),
    },
  ]

  const pct = { needs: 50, wants: 30, savings: 20 }
  const months = {
    [m2]: { income: base, pct },
    [m1]: { income: base, pct },
    [m0]: { income: base, pct },
  }

  return { transactions, goals, months, income: base }
}
