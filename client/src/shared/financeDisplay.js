import { EXPENSE_CATEGORIES, FUND_SOURCES } from './financeEnums.js'

export const CHART_COLORS = ['#0f8f5f', '#12a873', '#26ba99', '#5eead4', '#0b6e49', '#99f6e4', '#075c3b', '#d1fae5']

export function formatAmount(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Number(n))
}

export function fundRowDisplayName(t, fundKey) {
  const cardKey = `finance.fundCard.${fundKey}`
  const card = t(cardKey)
  if (card && card !== cardKey) return card
  const fundKey2 = `finance.fund.${fundKey}`
  const fund = t(fundKey2)
  if (fund && fund !== fundKey2) return fund
  return fundKey
}

export function expenseCatLabel(t, cat) {
  if (!cat) return t('finance.expenseCat.other')
  const k = `finance.expenseCat.${cat}`
  const tr = t(k)
  return tr !== k ? tr : cat
}

export function fundSourceLabel(t, src) {
  const s = src || 'general'
  const k = `finance.fundSource.${s}`
  const tr = t(k)
  return tr !== k ? tr : s
}

export const TX_EXPENSE_CATEGORY_MAX = 60
export const TX_FUND_SOURCE_MAX = 40

export function normalizeExpenseCategoryInput(raw) {
  return String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, TX_EXPENSE_CATEGORY_MAX)
}

export function normalizeFundSourceInput(raw) {
  return String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, TX_FUND_SOURCE_MAX)
}

export function resolveExpenseCategoryToCanonical(raw, t) {
  const s = normalizeExpenseCategoryInput(raw)
  if (!s) return ''
  if (EXPENSE_CATEGORIES.includes(s)) return s
  const lower = s.toLowerCase()
  for (const slug of EXPENSE_CATEGORIES) {
    if (slug.toLowerCase() === lower) return slug
    const label = normalizeExpenseCategoryInput(t(`finance.expenseCat.${slug}`))
    if (label && label === s) return slug
  }
  return s
}

export function resolveFundSourceToCanonical(raw, t) {
  const s = normalizeFundSourceInput(raw)
  if (!s) return ''
  if (FUND_SOURCES.includes(s)) return s
  const lower = s.toLowerCase()
  for (const slug of FUND_SOURCES) {
    if (slug.toLowerCase() === lower) return slug
    const label = normalizeFundSourceInput(t(`finance.fundSource.${slug}`))
    if (label && label === s) return slug
  }
  return s
}
