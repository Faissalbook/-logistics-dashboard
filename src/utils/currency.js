export const CURRENCIES = [
  { code: 'GNF', name: 'Guinean Franc', decimals: 0, style: 'suffix' },
  { code: 'USD', name: 'US Dollar', decimals: 2, style: 'intl' },
  { code: 'EUR', name: 'Euro', decimals: 2, style: 'intl' },
  { code: 'GBP', name: 'British Pound', decimals: 2, style: 'intl' },
  { code: 'CAD', name: 'Canadian Dollar', decimals: 2, style: 'intl' },
]

function currencyMeta(code) {
  return CURRENCIES.find((c) => c.code === code) || { code, decimals: 0, style: 'suffix' }
}

// GNF and custom codes render as "3,500,000 GNF" (whole numbers, thousands
// separators); ISO currencies use the locale's native currency formatting.
export function formatMoney(amount, currencyCode, locale = 'en-US', options = {}) {
  const value = Number.isFinite(amount) ? amount : 0
  const meta = currencyMeta(currencyCode)
  const decimals = options.compact ? 0 : meta.decimals

  if (meta.style === 'intl') {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: meta.code,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value)
    } catch {
      // unknown ISO code — fall through to suffix style
    }
  }
  const num = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value)
  return `${num} ${meta.code}`
}

export function formatNumber(value, locale = 'en-US', decimals = 0) {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(value) ? value : 0)
}

// Compact form for chart axis ticks: 1.2M, 350K…
export function formatCompact(value, locale = 'en-US') {
  return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(
    Number.isFinite(value) ? value : 0
  )
}
