import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatMoney } from './currency'
import { translations } from '../i18n/translations'

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function csvEscape(value) {
  const s = String(value ?? '')
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
}

const toCSV = (rows) => rows.map((r) => r.map(csvEscape).join(',')).join('\r\n')

// jsPDF's built-in fonts can't shape Arabic script, so PDF exports fall back
// to English labels when the UI language is Arabic. CSV keeps the UI language.
const pdfSafe = (t, language) => (language === 'ar' ? (key, params) => enFallback(key, params) : t)

function enFallback(key, params) {
  let str = translations.en[key] ?? key
  if (params) for (const [k, v] of Object.entries(params)) str = str.replaceAll(`{${k}}`, String(v))
  return str
}

export function exportTransactionsCSV({ txs, currency, locale, t, filename }) {
  const rows = [
    [t('common.date'), t('common.description'), t('tx.group'), t('tx.subcategory'), t('common.amount'), t('tx.payment'), t('tx.note'), t('tx.recurring')],
    ...txs.map((tx) => [
      tx.date,
      tx.description,
      t(`group.${tx.group}`),
      t(`cat.${tx.subcategory}`),
      tx.amount,
      t(`pay.${tx.paymentMethod}`),
      tx.note || '',
      tx.recurring ? 'yes' : 'no',
    ]),
  ]
  downloadBlob('﻿' + toCSV(rows), filename || 'budgetflow-transactions.csv', 'text/csv;charset=utf-8')
}

export function exportReportCSV({ title, summaryRows, categoryRows, t, filename }) {
  const rows = [
    [title],
    [],
    ...summaryRows,
    [],
    [t('reports.byCategory')],
    [t('tx.subcategory'), t('tx.group'), t('common.amount')],
    ...categoryRows,
  ]
  downloadBlob('﻿' + toCSV(rows), filename || 'budgetflow-report.csv', 'text/csv;charset=utf-8')
}

export function exportReportPDF({ periodLabel, stats, byCategory, txs, currency, locale, t: tRaw, language, filename }) {
  const t = pdfSafe(tRaw, language)
  const money = (v) => formatMoney(v, currency, language === 'ar' ? 'en-US' : locale)
  const doc = new jsPDF()

  doc.setFontSize(18)
  doc.setFont(undefined, 'bold')
  doc.text('BudgetFlow 50/30/20', 14, 18)
  doc.setFontSize(12)
  doc.setFont(undefined, 'normal')
  doc.text(`${t('reports.report')} — ${periodLabel}`, 14, 26)
  doc.setTextColor(120)
  doc.setFontSize(9)
  doc.text(new Date().toLocaleString(language === 'ar' ? 'en-US' : locale), 14, 32)
  doc.setTextColor(0)

  autoTable(doc, {
    startY: 38,
    head: [[t('reports.title'), '']],
    body: [
      [t('reports.income'), money(stats.income)],
      [t('reports.spending'), money(stats.totalSpent)],
      [t('reports.savings'), money(stats.totalSaved)],
      [t('reports.savingsRate'), `${stats.savingsRate.toFixed(1)}%`],
      [t('dash.remaining'), money(stats.remaining)],
    ],
    theme: 'striped',
    headStyles: { fillColor: [26, 26, 25] },
  })

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 8,
    head: [[t('reports.budgetVsActual'), t('reports.budget'), t('reports.actual'), t('dash.left')]],
    body: ['needs', 'wants', 'savings'].map((g) => [
      t(`group.${g}`),
      money(stats.groups[g].budget),
      money(stats.groups[g].spent),
      money(stats.groups[g].remaining),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [42, 120, 214] },
  })

  if (byCategory.length) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [[t('reports.byCategory'), t('tx.group'), t('common.amount')]],
      body: byCategory.map((c) => [t(`cat.${c.subcategory}`), t(`group.${c.group}`), money(c.amount)]),
      theme: 'striped',
      headStyles: { fillColor: [27, 175, 122] },
    })
  }

  if (txs?.length) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [[t('common.date'), t('common.description'), t('tx.group'), t('common.amount')]],
      body: txs.map((tx) => [tx.date, tx.description, t(`group.${tx.group}`), money(tx.amount)]),
      theme: 'striped',
      headStyles: { fillColor: [235, 104, 52] },
      styles: { fontSize: 8 },
    })
  }

  doc.save(filename || 'budgetflow-report.pdf')
}
