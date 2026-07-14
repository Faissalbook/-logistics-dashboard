// Month keys are 'YYYY-MM'. Dates are 'YYYY-MM-DD'. All local time.

export function currentMonthKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function todayISO() {
  const d = new Date()
  return `${currentMonthKey()}-${String(d.getDate()).padStart(2, '0')}`
}

export function monthKeyOf(dateStr) {
  return (dateStr || '').slice(0, 7)
}

export function shiftMonth(monthKey, delta) {
  const [y, m] = monthKey.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function compareMonths(a, b) {
  return a < b ? -1 : a > b ? 1 : 0
}

export function daysInMonth(monthKey) {
  const [y, m] = monthKey.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export function clampDayToMonth(monthKey, day) {
  return `${monthKey}-${String(Math.min(day, daysInMonth(monthKey))).padStart(2, '0')}`
}

export function formatMonth(monthKey, locale) {
  const [y, m] = monthKey.split('-').map(Number)
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
    new Date(y, m - 1, 1)
  )
}

export function formatMonthShort(monthKey, locale) {
  const [y, m] = monthKey.split('-').map(Number)
  return new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(y, m - 1, 1))
}

export function formatDate(dateStr, locale) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(y, m - 1, d)
  )
}

export function monthsBetween(fromKey, toKey) {
  const [fy, fm] = fromKey.split('-').map(Number)
  const [ty, tm] = toKey.split('-').map(Number)
  return (ty - fy) * 12 + (tm - fm)
}

export function lastNMonths(endKey, n) {
  const keys = []
  for (let i = n - 1; i >= 0; i--) keys.push(shiftMonth(endKey, -i))
  return keys
}
