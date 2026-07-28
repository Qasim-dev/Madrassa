import { useEffect, useMemo, useState, useCallback, useId } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { formatDisplayDate } from '../shared/formatDisplayDate'
import { useCalendarMode } from '../app/calendarMode'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
} from 'recharts'
import {
  useGetFinanceOverviewQuery,
  useGetTransactionsQuery,
  useCreateTransactionMutation,
  useUpdateTransactionMutation,
  useDeleteTransactionMutation,
  useGetFinanceAccountsQuery,
  useGetTeacherSalaryPicklistQuery,
  useGetFeeBalancesQuery,
  useGetStudentsQuery,
  useGetTeachersQuery,
} from '../services/api'
import { loc, flText } from '../shared/localized'
import { FL } from '../shared/fieldLabels'
import PageHeading from '../components/PageHeading'
import AppDateInput from '../components/AppDateInput'
import { AppInput, AppSelect, AppTextarea, AppCheckbox, AppButton, FormField, FormRow, AppKpiCards, AppFileInput } from '../components/ui'
import FilterDrawer, { FilterToolbar } from '../components/FilterDrawer'
import { EXPENSE_CATEGORIES, FUND_SOURCES, FUND_TYPES, TX_STATUSES } from '../shared/financeEnums.js'
import AppModalShell from '../components/AppModalShell'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import { useFlash } from '../app/flash.jsx'
import { BtnIconLabel, IconFileSpreadsheet, IconPrint, IconPencil, IconTrash } from '../components/ListToolbarIcons'
import './financeDashboard.css'

const CHART_COLORS = ['#0f8f5f', '#12a873', '#26ba99', '#5eead4', '#0b6e49', '#99f6e4', '#075c3b', '#d1fae5']

function formatAmount(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Number(n))
}

function IconWallet() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 7a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" />
      <path d="M16 12h2" />
    </svg>
  )
}

function IconArrowDown() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 5v14M5 12l7 7 7-7" />
    </svg>
  )
}

function IconArrowUp() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 19V5M19 12l-7-7-7 7" />
    </svg>
  )
}

function IconScale() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3v18M5 9l7-4 7 4M5 15l7 4 7-4" />
    </svg>
  )
}

/** Label for a fund row: prefers finance.fundCard.{key}, then finance.fund.{key}, else key. */
function fundRowDisplayName(t, fundKey) {
  const cardKey = `finance.fundCard.${fundKey}`
  const card = t(cardKey)
  if (card && card !== cardKey) return card
  const fundKey2 = `finance.fund.${fundKey}`
  const fund = t(fundKey2)
  if (fund && fund !== fundKey2) return fund
  return fundKey
}

/** Expense category: translated built-in slug, or raw custom value. */
function expenseCatLabel(t, cat) {
  if (!cat) return t('finance.expenseCat.other')
  const k = `finance.expenseCat.${cat}`
  const tr = t(k)
  return tr !== k ? tr : cat
}

/** Fund source: translated built-in key, or raw custom value. */
function fundSourceLabel(t, src) {
  const s = src || 'general'
  const k = `finance.fundSource.${s}`
  const tr = t(k)
  return tr !== k ? tr : s
}

const TX_EXPENSE_CATEGORY_MAX = 60
const TX_FUND_SOURCE_MAX = 40

function normalizeExpenseCategoryInput(raw) {
  return String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, TX_EXPENSE_CATEGORY_MAX)
}

function normalizeFundSourceInput(raw) {
  return String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, TX_FUND_SOURCE_MAX)
}

/** Map typed or translated label back to built-in slug when it matches; else keep custom text. */
function resolveExpenseCategoryToCanonical(raw, t) {
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

function resolveFundSourceToCanonical(raw, t) {
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

export default function FinancePage() {
  const { t, i18n } = useTranslation()
  const chartGradId = useId().replace(/:/g, '')
  const lng = i18n.language
  const { mode } = useCalendarMode()
  const isUr = lng.split('-')[0] === 'ur'
  const { showFlash } = useFlash()
  const token = useSelector((s) => s.auth.token)
  const activeSessionId = useSelector((s) => s.session.activeSessionId)
  const sessArg = activeSessionId ? { sessionId: activeSessionId } : {}

  const { data: overview, isLoading: ovLoading } = useGetFinanceOverviewQuery(sessArg)
  const { data: accounts = [] } = useGetFinanceAccountsQuery()
  const defaultAccountId = accounts[0]?._id

  const [page, setPage] = useState(1)
  const limit = 15
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [tableType, setTableType] = useState('')
  const [tableStatus, setTableStatus] = useState('')
  const [ledgerFund, setLedgerFund] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('')
  const [filterStudentId, setFilterStudentId] = useState('')
  const [filterTeacherId, setFilterTeacherId] = useState('')
  const [ledgerFilterOpen, setLedgerFilterOpen] = useState(false)
  const [ledgerDraft, setLedgerDraft] = useState({
    dateFrom: '',
    dateTo: '',
    tableType: '',
    ledgerFund: '',
    expenseCategory: '',
    filterStudentId: '',
    filterTeacherId: '',
    tableStatus: '',
  })

  useEffect(() => {
    if (!ledgerFilterOpen) return
    setLedgerDraft({
      dateFrom,
      dateTo,
      tableType,
      ledgerFund,
      expenseCategory,
      filterStudentId,
      filterTeacherId,
      tableStatus,
    })
  }, [
    ledgerFilterOpen,
    dateFrom,
    dateTo,
    tableType,
    ledgerFund,
    expenseCategory,
    filterStudentId,
    filterTeacherId,
    tableStatus,
  ])

  const ledgerFilterActiveCount = useMemo(() => {
    let n = 0
    if (dateFrom) n += 1
    if (dateTo) n += 1
    if (tableType) n += 1
    if (ledgerFund) n += 1
    if (tableType === 'expense' && expenseCategory) n += 1
    if (filterStudentId) n += 1
    if (filterTeacherId) n += 1
    if (tableStatus) n += 1
    return n
  }, [dateFrom, dateTo, tableType, ledgerFund, expenseCategory, filterStudentId, filterTeacherId, tableStatus])

  const studentPickParams = useMemo(
    () => ({ ...(activeSessionId ? { sessionId: activeSessionId } : {}) }),
    [activeSessionId]
  )
  const teacherPickParams = useMemo(
    () => ({ ...(activeSessionId ? { sessionId: activeSessionId } : {}) }),
    [activeSessionId]
  )
  const { data: studentsPick = [] } = useGetStudentsQuery(studentPickParams)
  const { data: teachersPick = [] } = useGetTeachersQuery(teacherPickParams)

  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(searchInput), 350)
    return () => clearTimeout(h)
  }, [searchInput])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, dateFrom, dateTo, tableType, tableStatus, ledgerFund, expenseCategory, activeSessionId, filterStudentId, filterTeacherId])

  const txParams = useMemo(() => {
    const p = {
      page,
      limit,
      ...(activeSessionId ? { sessionId: activeSessionId } : {}),
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
      ...(tableType === 'income' || tableType === 'expense' ? { type: tableType } : {}),
      ...(tableStatus ? { status: tableStatus } : {}),
      ...(ledgerFund ? { ledgerFund } : {}),
      ...(tableType === 'expense' && expenseCategory ? { expenseCategory } : {}),
      ...(filterStudentId ? { studentId: filterStudentId } : {}),
      ...(filterTeacherId ? { teacherId: filterTeacherId } : {}),
    }
    return p
  }, [
    page,
    limit,
    activeSessionId,
    debouncedSearch,
    dateFrom,
    dateTo,
    tableType,
    tableStatus,
    ledgerFund,
    expenseCategory,
    filterStudentId,
    filterTeacherId,
  ])

  const { data: txPage, isLoading: txsLoading, isFetching } = useGetTransactionsQuery(txParams)
  const txs = txPage?.items ?? []
  const totalTx = txPage?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(totalTx / limit))

  const [createTx, { isLoading: saving }] = useCreateTransactionMutation()
  const [updateTx, { isLoading: updating }] = useUpdateTransactionMutation()
  const [deleteTx] = useDeleteTransactionMutation()

  const [txModalOpen, setTxModalOpen] = useState(false)
  const [editingTxId, setEditingTxId] = useState(null)
  const [deleteTxTarget, setDeleteTxTarget] = useState(null)

  const { data: salaryPicklist = [] } = useGetTeacherSalaryPicklistQuery(
    {
      paymentStatus: 'pending',
      ...(activeSessionId ? { sessionId: activeSessionId } : {}),
    },
    { skip: !txModalOpen || !!editingTxId }
  )
  const feeBalanceParams = useMemo(
    () => (activeSessionId ? { sessionId: activeSessionId } : undefined),
    [activeSessionId]
  )
  const { data: feeBalances = [] } = useGetFeeBalancesQuery(feeBalanceParams, { skip: !txModalOpen || !!editingTxId })

  const feeBalancesWithDue = useMemo(
    () => (feeBalances || []).filter((b) => (Number(b.due) || 0) > 0),
    [feeBalances]
  )

  const [form, setForm] = useState({
    title: { ur: '', en: '' },
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    type: 'expense',
    fundType: 'general',
    expenseCategory: 'other',
    fundSource: 'general',
    notes: '',
    usageFor: { ur: '', en: '' },
    status: 'posted',
    accountId: '',
    sessionId: '',
    linkTeacherSalaryId: '',
    linkFeeBalanceId: '',
  })
  const [receiptFile, setReceiptFile] = useState(null)
  const [txModalErrors, setTxModalErrors] = useState({})

  const expenseCategoryInputValue = useMemo(() => {
    if (!isUr) return form.expenseCategory || ''
    if (form.expenseCategory && EXPENSE_CATEGORIES.includes(form.expenseCategory)) {
      return t(`finance.expenseCat.${form.expenseCategory}`)
    }
    return form.expenseCategory || ''
  }, [isUr, form.expenseCategory, t, i18n.language])

  const fundSourceInputValue = useMemo(() => {
    if (!isUr) return form.fundSource || ''
    if (form.fundSource && FUND_SOURCES.includes(form.fundSource)) {
      return t(`finance.fundSource.${form.fundSource}`)
    }
    return form.fundSource || ''
  }, [isUr, form.fundSource, t, i18n.language])

  const resetForm = useCallback(
    (keepType) => {
      setForm({
        title: { ur: '', en: '' },
        amount: '',
        date: new Date().toISOString().slice(0, 10),
        type: keepType || 'expense',
        fundType: 'general',
        expenseCategory: 'other',
        fundSource: 'general',
        notes: '',
        usageFor: { ur: '', en: '' },
        status: 'posted',
        accountId: defaultAccountId ? String(defaultAccountId) : '',
        sessionId: activeSessionId ? String(activeSessionId) : '',
        linkTeacherSalaryId: '',
        linkFeeBalanceId: '',
      })
      setReceiptFile(null)
      setTxModalErrors({})
    },
    [defaultAccountId, activeSessionId]
  )

  const closeTxModal = useCallback(() => {
    setTxModalOpen(false)
    setEditingTxId(null)
    setTxModalErrors({})
    resetForm('expense')
  }, [resetForm])

  const openNewTxModal = useCallback(() => {
    setEditingTxId(null)
    setTxModalErrors({})
    resetForm('expense')
    setTxModalOpen(true)
  }, [resetForm])

  const openEditTxModal = useCallback(
    (x) => {
      setTxModalErrors({})
      setEditingTxId(x._id)
      setForm({
        title: { ur: x.title?.ur || '', en: x.title?.en || '' },
        amount: String(x.amount ?? ''),
        date: x.date ? new Date(x.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        type: x.type === 'income' ? 'income' : 'expense',
        fundType: x.fundType || 'general',
        expenseCategory: x.expenseCategory || 'other',
        fundSource: x.fundSource || 'general',
        notes: x.notes || '',
        usageFor: { ur: x.usageFor?.ur || '', en: x.usageFor?.en || '' },
        status: x.status || 'posted',
        accountId: String(x.accountId?._id || x.accountId || defaultAccountId || ''),
        sessionId: x.sessionId ? String(x.sessionId) : activeSessionId ? String(activeSessionId) : '',
        linkTeacherSalaryId: x.linkedTeacherSalaryId ? String(x.linkedTeacherSalaryId) : '',
        linkFeeBalanceId: x.linkedFeeBalanceId ? String(x.linkedFeeBalanceId) : '',
      })
      setReceiptFile(null)
      setTxModalOpen(true)
    },
    [defaultAccountId, activeSessionId]
  )

  async function submit(e) {
    e.preventDefault()
    setTxModalErrors({})
    const amt = Number(form.amount)
    const nextErr = {}
    if (!form.title.ur?.trim() && !form.title.en?.trim()) {
      nextErr.title = t('finance.validationTitle')
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      nextErr.amount = t('finance.validationAmount')
    }
    const expenseCategoryNorm =
      form.type === 'expense' ? resolveExpenseCategoryToCanonical(form.expenseCategory, t) : 'other'
    let fundSourceNorm = form.type === 'expense' ? resolveFundSourceToCanonical(form.fundSource, t) : 'general'
    if (form.type === 'expense') {
      if (!expenseCategoryNorm) {
        nextErr.expenseCategory = t('finance.validationExpenseCategory')
      }
      if (!fundSourceNorm) fundSourceNorm = 'general'
    }
    if (Object.keys(nextErr).length) {
      setTxModalErrors(nextErr)
      return
    }
    const accountId = form.accountId || defaultAccountId
    const sessionIdField = form.sessionId || activeSessionId
    const basePayload = {
      title: form.title,
      amount: amt,
      date: form.date,
      type: form.type,
      fundType: form.type === 'income' ? form.fundType : 'general',
      expenseCategory: form.type === 'expense' ? expenseCategoryNorm : 'other',
      fundSource: form.type === 'expense' ? fundSourceNorm : 'general',
      notes: form.notes,
      usageFor: form.usageFor,
      status: form.status,
      ...(sessionIdField && isSessionOid(sessionIdField) ? { sessionId: sessionIdField } : {}),
      ...(accountId ? { accountId: String(accountId) } : {}),
      ...(!editingTxId && form.linkTeacherSalaryId ? { linkedTeacherSalaryId: form.linkTeacherSalaryId } : {}),
      ...(!editingTxId && form.linkFeeBalanceId ? { linkedFeeBalanceId: form.linkFeeBalanceId } : {}),
    }
    try {
      if (editingTxId) {
        if (receiptFile) {
          const fd = new FormData()
          fd.append('titleUr', form.title.ur)
          fd.append('titleEn', form.title.en)
          fd.append('amount', String(amt))
          fd.append('date', form.date)
          fd.append('type', form.type)
          fd.append('fundType', form.type === 'income' ? form.fundType : 'general')
          fd.append('expenseCategory', form.type === 'expense' ? expenseCategoryNorm : 'other')
          fd.append('fundSource', form.type === 'expense' ? fundSourceNorm : 'general')
          fd.append('notes', form.notes)
          fd.append('usageForUr', form.usageFor.ur)
          fd.append('usageForEn', form.usageFor.en)
          fd.append('status', form.status)
          if (sessionIdField && isSessionOid(sessionIdField)) fd.append('sessionId', String(sessionIdField))
          if (accountId) fd.append('accountId', String(accountId))
          fd.append('receipt', receiptFile)
          await updateTx({ id: editingTxId, body: fd }).unwrap()
        } else {
          await updateTx({ id: editingTxId, body: basePayload }).unwrap()
        }
      } else if (receiptFile) {
        const fd = new FormData()
        fd.append('titleUr', form.title.ur)
        fd.append('titleEn', form.title.en)
        fd.append('amount', String(amt))
        fd.append('date', form.date)
        fd.append('type', form.type)
        fd.append('fundType', form.type === 'income' ? form.fundType : 'general')
        fd.append('expenseCategory', form.type === 'expense' ? expenseCategoryNorm : 'other')
        fd.append('fundSource', form.type === 'expense' ? fundSourceNorm : 'general')
        fd.append('notes', form.notes)
        fd.append('usageForUr', form.usageFor.ur)
        fd.append('usageForEn', form.usageFor.en)
        fd.append('status', form.status)
        if (sessionIdField && isSessionOid(sessionIdField)) fd.append('sessionId', String(sessionIdField))
        if (accountId) fd.append('accountId', String(accountId))
        if (form.linkTeacherSalaryId) fd.append('linkedTeacherSalaryId', form.linkTeacherSalaryId)
        if (form.linkFeeBalanceId) fd.append('linkedFeeBalanceId', form.linkFeeBalanceId)
        fd.append('receipt', receiptFile)
        await createTx(fd).unwrap()
      } else {
        await createTx(basePayload).unwrap()
      }
      closeTxModal()
    } catch (err) {
      showFlash(err?.data?.message || err?.error || 'Save failed')
    }
  }

  function isSessionOid(id) {
    return id && /^[a-fA-F0-9]{24}$/.test(String(id))
  }

  const exportQuery = useMemo(() => {
    const p = new URLSearchParams()
    if (activeSessionId) p.set('sessionId', activeSessionId)
    if (debouncedSearch.trim()) p.set('search', debouncedSearch.trim())
    if (dateFrom) p.set('dateFrom', dateFrom)
    if (dateTo) p.set('dateTo', dateTo)
    if (tableType === 'income' || tableType === 'expense') p.set('type', tableType)
    if (tableStatus) p.set('status', tableStatus)
    if (ledgerFund) p.set('ledgerFund', ledgerFund)
    if (tableType === 'expense' && expenseCategory) p.set('expenseCategory', expenseCategory)
    if (filterStudentId) p.set('studentId', filterStudentId)
    if (filterTeacherId) p.set('teacherId', filterTeacherId)
    return p.toString()
  }, [
    activeSessionId,
    debouncedSearch,
    dateFrom,
    dateTo,
    tableType,
    tableStatus,
    ledgerFund,
    expenseCategory,
    filterStudentId,
    filterTeacherId,
  ])

  async function downloadExcel() {
    if (!token) return
    const qs = exportQuery
    const res = await fetch(`/api/finance/transactions/export${qs ? `?${qs}` : ''}`, {
      headers: { authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      showFlash(t('finance.exportFailed'))
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finance-${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  function printLedger() {
    const rows = txs
      .map(
        (x) => `<tr>
        <td>${formatDisplayDate(x.date, lng, mode)}</td>
        <td>${loc(x.title, lng)}</td>
        <td>${x.type}</td>
        <td>${formatAmount(x.amount)}</td>
      </tr>`
      )
      .join('')
    const html = `<!DOCTYPE html><html dir="${isUr ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"/><title>${t('finance.ledgerTitle')}</title>
      <style>body{font-family:system-ui,sans-serif;padding:20px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #e2e8f0;padding:8px;font-size:13px}</style></head><body>
      <h1>${t('finance.ledgerTitle')}</h1>
      <table><thead><tr><th>${flText(FL.date, lng)}</th><th>${t('finance.colTitle')}</th><th>${t('finance.colType')}</th><th>${t('finance.colAmount')}</th></tr></thead><tbody>${rows}</tbody></table>
      </body></html>`
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 200)
  }

  const monthly = overview?.monthlyIncomeExpense ?? []
  const barData = monthly.map((m) => ({
    label: m.month?.slice(5) + '/' + m.month?.slice(2, 4),
    income: m.income,
    expense: m.expense,
  }))
  const barDataHasData = barData.some((x) => Number(x.income) > 0 || Number(x.expense) > 0)
  const pieData = (overview?.fundPie ?? [])
    .filter((x) => Number(x.value) > 0)
    .map((x) => ({
      name: t(`finance.fund.${x.fund}`),
      value: Number(x.value) || 0,
    }))
  const expPie = (overview?.expenseBreakdown ?? [])
    .filter((x) => Number(x.value) > 0)
    .map((x) => ({
      name: expenseCatLabel(t, x.category),
      value: Number(x.value) || 0,
    }))

  const fundCards = overview?.fundSummaries ?? []
  const feeDue = overview?.totalFeesDue ?? 0
  const feeIncome = overview?.feeIncome ?? 0
  const fundCategoryChartRows = useMemo(() => {
    const rows = (fundCards || []).map((f) => ({
      id: f.key,
      name: fundRowDisplayName(t, f.key),
      received: Number(f.received) || 0,
      spent: Number(f.used) || 0,
      remaining: Number(f.remaining) || 0,
    }))
    rows.push({
      id: 'feesDue',
      name: t('finance.fundCard.feesDue'),
      received: Number(feeIncome) || 0,
      spent: Number(feeDue) || 0,
      remaining: (Number(feeIncome) || 0) - (Number(feeDue) || 0),
    })
    return rows
  }, [fundCards, feeIncome, feeDue, t, i18n.language])

  const hasCategoryFlowData = useMemo(
    () => fundCategoryChartRows.some((r) => (r.received || 0) > 0 || (r.spent || 0) > 0),
    [fundCategoryChartRows]
  )

  const portfolioYAxisW = isUr ? 176 : 154
  const portfolioChartMargin = { top: 10, right: 20, left: 20, bottom: 36 }

  const statCards = [
    {
      key: 'income',
      tone: 'income',
      icon: <IconArrowUp />,
      label: flText(FL.financeStatIncome, lng),
      value: formatAmount(overview?.totalIncome ?? 0),
      hint: t('finance.statHintIncome'),
    },
    {
      key: 'expense',
      tone: 'expense',
      icon: <IconArrowDown />,
      label: flText(FL.financeStatExpense, lng),
      value: formatAmount(overview?.totalExpenses ?? 0),
      hint: t('finance.statHintExpense'),
    },
    {
      key: 'bal',
      tone: 'balance',
      icon: <IconWallet />,
      label: flText(FL.financeStatAccount, lng),
      value: formatAmount(overview?.totalAccountCurrent ?? 0),
      hint: t('finance.statHintBalance'),
    },
    {
      key: 'net',
      tone: 'net',
      icon: <IconScale />,
      label: flText(FL.financeStatNet, lng),
      value: formatAmount(overview?.netPlus ?? 0),
      hint: t('finance.statHintNet'),
    },
  ]

  const secondaryStatCards = [
    {
      key: 'feeIncome',
      tone: 'income',
      label: t('finance.feesCollected'),
      value: formatAmount(feeIncome),
    },
    {
      key: 'feeDue',
      tone: 'expense',
      label: t('finance.feesOutstanding'),
      value: formatAmount(feeDue),
    },
    {
      key: 'salaryPaid',
      tone: 'balance',
      label: t('finance.salaryPaidShort'),
      value: formatAmount(overview?.salaryPaidTotal ?? 0),
    },
    {
      key: 'salaryPending',
      tone: 'net',
      label: t('finance.salaryPendingShort'),
      value: formatAmount(overview?.salaryPendingTotal ?? 0),
    },
  ]

  return (
    <div className="finance-dash">
      <PageHeading navKey="navFinance" />
      <div className="finance-dash__hero" lang={isUr ? 'ur' : 'en'}>
        <div className="finance-dash__hero-title">{t('finance.heroTitle')}</div>
        <div className="finance-dash__hero-sub">{t('finance.heroSub')}</div>
      </div>

      <AppKpiCards loading={ovLoading} items={statCards} columns={4} />

      <AppKpiCards loading={ovLoading} items={secondaryStatCards} columns={4} className="mb-3" />

      <div className="finance-dash__charts">
        <div className="finance-dash__chart-card">
          <div className="finance-dash__chart-title">{t('finance.chartMonthly')}</div>
          <div className="finance-dash__chart-body">
            {barDataHasData ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} margin={{ top: 8, right: 8, left: 4, bottom: 8 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => formatAmount(v)} />
                  <Legend verticalAlign="bottom" align="center" layout="horizontal" wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="income" fill="#10b981" name={t('finance.typeIncome')} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="#f87171" name={t('finance.typeExpense')} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="finance-dash__chart-empty text-secondary small" dir={isUr ? 'rtl' : 'ltr'}>
                {t('finance.chartEmpty')}
              </div>
            )}
          </div>
        </div>
        <div className="finance-dash__chart-card">
          <div className="finance-dash__chart-title">{t('finance.chartFundPie')}</div>
          <div className="finance-dash__chart-body">
            {pieData.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="42%"
                    outerRadius={78}
                    paddingAngle={1}
                    label={false}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatAmount(v)} />
                  <Legend verticalAlign="bottom" align="center" layout="horizontal" wrapperStyle={{ fontSize: '0.78rem' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="finance-dash__chart-empty text-secondary small" dir={isUr ? 'rtl' : 'ltr'}>
                {t('finance.chartEmpty')}
              </div>
            )}
          </div>
        </div>
        <div className="finance-dash__chart-card">
          <div className="finance-dash__chart-title">{t('finance.chartExpense')}</div>
          <div className="finance-dash__chart-body">
            {expPie.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                  <Pie
                    data={expPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="42%"
                    outerRadius={78}
                    paddingAngle={1}
                    label={false}
                  >
                    {expPie.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatAmount(v)} />
                  <Legend verticalAlign="bottom" align="center" layout="horizontal" wrapperStyle={{ fontSize: '0.78rem' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="finance-dash__chart-empty text-secondary small" dir={isUr ? 'rtl' : 'ltr'}>
                {t('finance.chartEmpty')}
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="finance-dash__portfolio" lang={isUr ? 'ur' : 'en'}>
        <header className="finance-dash__portfolio-head">
          <h2 className="finance-dash__portfolio-title">{t('finance.portfolioTitle')}</h2>
          <p className="finance-dash__portfolio-sub">{t('finance.portfolioSub')}</p>
        </header>

        <div className="finance-dash__portfolio-bento">
          <div className="finance-dash__glass-chart">
            <div className="finance-dash__glass-chart__head">
              <span className="finance-dash__glass-chart__kicker">{t('finance.chartCategoryFlow')}</span>
            </div>
            <div className="finance-dash__glass-chart__body">
              {hasCategoryFlowData ? (
                <div className="finance-dash__glass-chart__chart">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                      layout="vertical"
                      data={fundCategoryChartRows}
                      margin={portfolioChartMargin}
                    >
                      <defs>
                        <linearGradient id={`${chartGradId}-recv`} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#34d399" />
                          <stop offset="100%" stopColor="#059669" />
                        </linearGradient>
                        <linearGradient id={`${chartGradId}-spent`} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#f87171" />
                          <stop offset="100%" stopColor="#dc2626" />
                        </linearGradient>
                      </defs>
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => formatAmount(v)} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={portfolioYAxisW}
                        tick={{ fontSize: 10, fill: '#475569' }}
                        interval={0}
                      />
                      <Tooltip formatter={(v) => formatAmount(v)} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 12px 40px rgba(15,23,42,0.12)' }} />
                      <Legend verticalAlign="bottom" align="center" layout="horizontal" wrapperStyle={{ fontSize: 12 }} />
                      <Bar
                        dataKey="received"
                        fill={`url(#${chartGradId}-recv)`}
                        name={t('finance.received')}
                        radius={[0, 6, 6, 0]}
                        maxBarSize={28}
                      />
                      <Bar
                        dataKey="spent"
                        fill={`url(#${chartGradId}-spent)`}
                        name={t('finance.used')}
                        radius={[0, 6, 6, 0]}
                        maxBarSize={28}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="finance-dash__glass-chart__empty text-secondary small" dir={isUr ? 'rtl' : 'ltr'}>
                  {t('finance.chartEmpty')}
                </div>
              )}
            </div>
          </div>

          <div className="finance-dash__glass-chart finance-dash__glass-chart--balance">
            <div className="finance-dash__glass-chart__head">
              <span className="finance-dash__glass-chart__kicker">{t('finance.chartCategoryBalance')}</span>
            </div>
            <div className="finance-dash__glass-chart__body">
              {fundCategoryChartRows.length ? (
                <div className="finance-dash__glass-chart__chart">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                      layout="vertical"
                      data={fundCategoryChartRows}
                      margin={portfolioChartMargin}
                    >
                      <defs>
                        <linearGradient id={`${chartGradId}-pos`} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#2dd4bf" />
                          <stop offset="100%" stopColor="#0f8f5f" />
                        </linearGradient>
                        <linearGradient id={`${chartGradId}-neg`} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#fca5a5" />
                          <stop offset="100%" stopColor="#dc2626" />
                        </linearGradient>
                      </defs>
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => formatAmount(v)} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={portfolioYAxisW}
                        tick={{ fontSize: 10, fill: '#475569' }}
                        interval={0}
                      />
                      <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="5 5" />
                      <Tooltip formatter={(v) => formatAmount(v)} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 12px 40px rgba(15,23,42,0.12)' }} />
                      <Bar dataKey="remaining" name={t('finance.remaining')} radius={[0, 6, 6, 0]} maxBarSize={32}>
                        {fundCategoryChartRows.map((row, i) => (
                          <Cell
                            key={i}
                            fill={(row.remaining || 0) >= 0 ? `url(#${chartGradId}-pos)` : `url(#${chartGradId}-neg)`}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="finance-dash__glass-chart__empty text-secondary small" dir={isUr ? 'rtl' : 'ltr'}>
                  {t('finance.chartEmpty')}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="finance-dash__panel">
        <div className="finance-dash__panel-head d-flex flex-wrap justify-content-between align-items-center gap-2">
          <span>{t('finance.ledgerTitle')}</span>
          <button type="button" className="btn btn-sm finance-dash__cta" onClick={openNewTxModal}>
            {t('finance.newEntry')}
          </button>
        </div>
        <div className="finance-dash__toolbar finance-dash__toolbar--filters">
          <FilterToolbar
            search={searchInput}
            onSearchChange={setSearchInput}
            searchPlaceholder={t('common.search')}
            searchId="finance-ledger-search"
            onOpenFilters={() => setLedgerFilterOpen(true)}
            activeCount={ledgerFilterActiveCount}
          >
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={downloadExcel}>
              <BtnIconLabel icon={<IconFileSpreadsheet />}>{t('finance.exportExcel')}</BtnIconLabel>
            </button>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={printLedger}>
              <BtnIconLabel icon={<IconPrint />}>{t('finance.printPdf')}</BtnIconLabel>
            </button>
          </FilterToolbar>
          <FilterDrawer
            open={ledgerFilterOpen}
            onClose={() => setLedgerFilterOpen(false)}
            onApply={() => {
              setDateFrom(ledgerDraft.dateFrom)
              setDateTo(ledgerDraft.dateTo)
              setTableType(ledgerDraft.tableType)
              setLedgerFund(ledgerDraft.ledgerFund)
              setExpenseCategory(
                ledgerDraft.tableType === 'expense'
                  ? resolveExpenseCategoryToCanonical(ledgerDraft.expenseCategory, t)
                  : ''
              )
              setFilterStudentId(ledgerDraft.filterStudentId)
              setFilterTeacherId(ledgerDraft.filterTeacherId)
              setTableStatus(ledgerDraft.tableStatus)
              setLedgerFilterOpen(false)
            }}
            onReset={() =>
              setLedgerDraft({
                dateFrom: '',
                dateTo: '',
                tableType: '',
                ledgerFund: '',
                expenseCategory: '',
                filterStudentId: '',
                filterTeacherId: '',
                tableStatus: '',
              })
            }
          >
            <div className="filter-drawer__field">
              <label className="filter-drawer__label">{t('finance.filterDateFrom')}</label>
              <AppDateInput
                lng={lng}
                value={ledgerDraft.dateFrom}
                onChange={(v) => setLedgerDraft((d) => ({ ...d, dateFrom: v }))}
              />
            </div>
            <div className="filter-drawer__field">
              <label className="filter-drawer__label">{t('finance.filterDateTo')}</label>
              <AppDateInput
                lng={lng}
                value={ledgerDraft.dateTo}
                onChange={(v) => setLedgerDraft((d) => ({ ...d, dateTo: v }))}
              />
            </div>
            <div className="filter-drawer__field">
              <label className="filter-drawer__label" htmlFor="finance-ledger-type">
                {t('finance.colType')}
              </label>
              <AppSelect
                id="finance-ledger-type"
                className="w-100"
                value={ledgerDraft.tableType}
                onChange={(e) =>
                  setLedgerDraft((d) => ({
                    ...d,
                    tableType: e.target.value,
                    expenseCategory: e.target.value === 'expense' ? d.expenseCategory : '',
                  }))
                }
              >
                <option value="">{t('finance.filterAll')}</option>
                <option value="income">{t('finance.typeIncome')}</option>
                <option value="expense">{t('finance.typeExpense')}</option>
              </AppSelect>
            </div>
            <div className="filter-drawer__field">
              <label className="filter-drawer__label" htmlFor="finance-ledger-fund">
                {t('finance.colFund')}
              </label>
              <AppSelect
                id="finance-ledger-fund"
                className="w-100"
                value={ledgerDraft.ledgerFund}
                onChange={(e) => setLedgerDraft((d) => ({ ...d, ledgerFund: e.target.value }))}
              >
                <option value="">{t('finance.filterAll')}</option>
                {FUND_TYPES.filter((x) => x !== 'general').map((f) => (
                  <option key={f} value={f}>
                    {t(`finance.fund.${f}`)}
                  </option>
                ))}
              </AppSelect>
            </div>
            {ledgerDraft.tableType === 'expense' ? (
              <div className="filter-drawer__field">
                <label className="filter-drawer__label" htmlFor="finance-ledger-exp-cat-filter">
                  {t('finance.expenseCategory')}
                </label>
                <AppInput
                  id="finance-ledger-exp-cat-filter"
                  list="finance-datalist-ledger-exp-cat"
                  autoComplete="off"
                  placeholder={t('finance.filterAll')}
                  dir={isUr ? 'rtl' : 'ltr'}
                  spellCheck={false}
                  value={ledgerDraft.expenseCategory}
                  maxLength={TX_EXPENSE_CATEGORY_MAX}
                  onChange={(e) =>
                    setLedgerDraft((d) => ({
                      ...d,
                      expenseCategory: e.target.value.slice(0, TX_EXPENSE_CATEGORY_MAX),
                    }))
                  }
                  onBlur={() =>
                    setLedgerDraft((d) => ({
                      ...d,
                      expenseCategory: resolveExpenseCategoryToCanonical(d.expenseCategory, t),
                    }))
                  }
                />
              </div>
            ) : null}
            <div className="filter-drawer__field">
              <label className="filter-drawer__label" htmlFor="finance-ledger-student">
                {t('finance.filterStudent')}
              </label>
              <AppSelect
                id="finance-ledger-student"
                className="w-100"
                value={ledgerDraft.filterStudentId}
                onChange={(e) => setLedgerDraft((d) => ({ ...d, filterStudentId: e.target.value }))}
              >
                <option value="">{t('finance.filterAll')}</option>
                {(studentsPick || []).map((s) => (
                  <option key={s._id} value={s._id}>
                    {loc(s.name, lng)}
                  </option>
                ))}
              </AppSelect>
            </div>
            <div className="filter-drawer__field">
              <label className="filter-drawer__label" htmlFor="finance-ledger-teacher">
                {t('finance.filterTeacher')}
              </label>
              <AppSelect
                id="finance-ledger-teacher"
                className="w-100"
                value={ledgerDraft.filterTeacherId}
                onChange={(e) => setLedgerDraft((d) => ({ ...d, filterTeacherId: e.target.value }))}
              >
                <option value="">{t('finance.filterAll')}</option>
                {(teachersPick || []).map((te) => (
                  <option key={te._id} value={te._id}>
                    {loc(te.name, lng)}
                  </option>
                ))}
              </AppSelect>
            </div>
            <div className="filter-drawer__field">
              <label className="filter-drawer__label" htmlFor="finance-ledger-status">
                {t('finance.status')}
              </label>
              <AppSelect
                id="finance-ledger-status"
                className="w-100"
                value={ledgerDraft.tableStatus}
                onChange={(e) => setLedgerDraft((d) => ({ ...d, tableStatus: e.target.value }))}
              >
                <option value="">{t('finance.filterAll')}</option>
                {TX_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`finance.txStatus.${s}`)}
                  </option>
                ))}
              </AppSelect>
            </div>
          </FilterDrawer>
        </div>
        <datalist id="finance-datalist-ledger-exp-cat">
          {EXPENSE_CATEGORIES.map((f) => (
            <option key={f} value={f}>
              {t(`finance.expenseCat.${f}`)}
            </option>
          ))}
        </datalist>
        <div className="finance-dash__table-wrap">
          {txsLoading ? (
            <div className="p-4 text-secondary">{t('common.loading')}</div>
          ) : (
            <table className="finance-dash__table">
              <thead>
                <tr>
                  <th>{t('finance.colRelated')}</th>
                  <th>{t('finance.colTitle')}</th>
                  <th>{t('finance.colType')}</th>
                  <th>{t('finance.colFund')}</th>
                  <th>{t('finance.colAmount')}</th>
                  <th>{t('finance.colDate')}</th>
                  <th>{t('finance.colUsage')}</th>
                  <th>{t('finance.colStatus')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {txs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center text-secondary py-4">
                      {t('common.noRecords')}
                    </td>
                  </tr>
                ) : (
                  txs.map((x) => (
                    <tr key={x._id}>
                      <td className="small">
                        {x.studentId
                          ? loc(x.studentId.name, lng)
                          : x.teacherId
                            ? loc(x.teacherId.name, lng)
                            : x.inventoryItemId
                              ? loc(x.inventoryItemId.name, lng)
                              : '—'}
                      </td>
                      <td>
                        <div className="fw-medium">{loc(x.title, lng)}</div>
                        {x.linkedTeacherSalaryId ? (
                          <span className="finance-dash__link-chip">{t('finance.tagSalary')}</span>
                        ) : null}
                        {x.linkedFeeBalanceId ? (
                          <span className="finance-dash__link-chip finance-dash__link-chip--fee">{t('finance.tagFee')}</span>
                        ) : null}
                      </td>
                      <td>
                        <span className={`finance-dash__badge ${x.type === 'income' ? 'finance-dash__badge--income' : 'finance-dash__badge--expense'}`}>
                          {x.type === 'income' ? t('finance.typeIncome') : t('finance.typeExpense')}
                        </span>
                      </td>
                      <td className="small">
                        {x.type === 'income'
                          ? t(`finance.fund.${x.fundType || 'general'}`)
                          : `${expenseCatLabel(t, x.expenseCategory)} / ${fundSourceLabel(t, x.fundSource)}`}
                      </td>
                      <td className="table-num fw-semibold">{formatAmount(x.amount)}</td>
                      <td className="small">{formatDisplayDate(x.date, lng, mode)}</td>
                      <td className="small">{loc(x.usageFor, lng) || '—'}</td>
                      <td>
                        <span className={`finance-dash__badge ${x.status === 'posted' ? 'finance-dash__badge--posted' : 'finance-dash__badge--pending'}`}>
                          {t(`finance.txStatus.${x.status || 'posted'}`)}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-1 align-items-center">
                          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openEditTxModal(x)}>
                            <BtnIconLabel icon={<IconPencil />}>{t('common.edit')}</BtnIconLabel>
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => setDeleteTxTarget({ id: x._id, title: loc(x.title, lng) || '—' })}
                          >
                            <BtnIconLabel icon={<IconTrash />}>{t('common.delete')}</BtnIconLabel>
                          </button>
                          {x.receiptUrl ? (
                            <a href={x.receiptUrl} target="_blank" rel="noopener noreferrer" className="btn btn-link btn-sm p-0">
                              {t('finance.viewReceipt')}
                            </a>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
        <div className="finance-dash__pagination">
          <span className="small text-secondary">
            {t('finance.pageOf', { page, totalPages, total: totalTx })}
            {isFetching ? ` ${t('common.loading')}` : ''}
          </span>
          <div className="btn-group">
            <button type="button" className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              {t('finance.prev')}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              {t('finance.next')}
            </button>
          </div>
        </div>
      </div>

      {txModalOpen ? (
        <AppModalShell
          title={editingTxId ? t('finance.modalEditEntry') : t('finance.modalNewEntry')}
          onClose={closeTxModal}
          size="lg"
          dialogClassName="finance-dash__modal-dialog"
          dir={isUr ? 'rtl' : 'ltr'}
        >
          <form className="modal-app-form" onSubmit={submit}>
            <div className="modal-app-body">
              <div className="row g-3">
                <div className="col-12 col-md-4" data-lang-field="ur">
                  <FormField k="titleUr" htmlFor="fx-tu" langField="ur" error={txModalErrors.title}>
                    <AppInput
                      id="fx-tu"
                      invalid={!!txModalErrors.title}
                      value={form.title.ur}
                      onChange={(e) => {
                        setTxModalErrors((er) => {
                          if (!er.title) return er
                          const n = { ...er }
                          delete n.title
                          return n
                        })
                        setForm({ ...form, title: { ...form.title, ur: e.target.value } })
                      }}
                    />
                  </FormField>
                </div>
                <div className="col-12 col-md-4" data-lang-field="en">
                  <FormField k="titleEn" htmlFor="fx-te" langField="en" error={txModalErrors.title}>
                    <AppInput
                      id="fx-te"
                      invalid={!!txModalErrors.title}
                      value={form.title.en}
                      onChange={(e) => {
                        setTxModalErrors((er) => {
                          if (!er.title) return er
                          const n = { ...er }
                          delete n.title
                          return n
                        })
                        setForm({ ...form, title: { ...form.title, en: e.target.value } })
                      }}
                    />
                  </FormField>
                </div>
                <div className="col-12 col-md-4">
                  <FormField k="amount" htmlFor="fx-amt" error={txModalErrors.amount}>
                    <AppInput
                      id="fx-amt"
                      type="number"
                      latin
                      invalid={!!txModalErrors.amount}
                      value={form.amount}
                      onChange={(e) => {
                        setTxModalErrors((er) => {
                          if (!er.amount) return er
                          const n = { ...er }
                          delete n.amount
                          return n
                        })
                        setForm({ ...form, amount: e.target.value })
                      }}
                      min={0}
                      step="0.01"
                    />
                  </FormField>
                </div>
                <div className="col-12 col-md-4">
                  <FormField k="date" htmlFor="fx-dt">
                    <AppDateInput id="fx-dt" lng={lng} value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
                  </FormField>
                </div>
                <div className="col-12 col-md-4">
                  <FormField k="txType" htmlFor="fx-ty" labelClassName="small text-secondary">
                    <AppSelect
                      id="fx-ty"
                      value={form.type}
                      onChange={(e) => {
                        const type = e.target.value
                        setTxModalErrors({})
                        setForm((f) => ({
                          ...f,
                          type,
                          linkTeacherSalaryId: type !== 'expense' ? '' : f.linkTeacherSalaryId,
                          linkFeeBalanceId: type !== 'income' ? '' : f.linkFeeBalanceId,
                        }))
                      }}
                    >
                      <option value="income">{t('finance.typeIncome')}</option>
                      <option value="expense">{t('finance.typeExpense')}</option>
                    </AppSelect>
                  </FormField>
                </div>
                {form.type === 'income' ? (
                  <div className="col-12 col-md-4">
                    <FormField label={t('finance.fundType')} htmlFor="fx-fund-type-inc" labelClassName="small text-secondary">
                      <AppSelect
                        id="fx-fund-type-inc"
                        value={form.fundType}
                        onChange={(e) => {
                          const fundType = e.target.value
                          setForm((f) => ({
                            ...f,
                            fundType,
                            linkFeeBalanceId: fundType !== 'fees' ? '' : f.linkFeeBalanceId,
                          }))
                        }}
                      >
                        {FUND_TYPES.map((f) => (
                          <option key={f} value={f}>
                            {t(`finance.fund.${f}`)}
                          </option>
                        ))}
                      </AppSelect>
                    </FormField>
                  </div>
                ) : (
                  <div className="col-12 col-md-4">
                    <FormField
                      label={t('finance.expenseCategory')}
                      htmlFor="fx-exp-cat"
                      required
                      labelClassName="small text-secondary"
                      error={txModalErrors.expenseCategory}
                    >
                      <AppInput
                        id="fx-exp-cat"
                        className="finance-dash__modal-combo"
                        list="finance-datalist-modal-exp-cat"
                        autoComplete="off"
                        dir={isUr ? 'rtl' : 'ltr'}
                        spellCheck={false}
                        maxLength={TX_EXPENSE_CATEGORY_MAX}
                        invalid={!!txModalErrors.expenseCategory}
                        value={expenseCategoryInputValue}
                        onChange={(e) => {
                          const raw = e.target.value.slice(0, TX_EXPENSE_CATEGORY_MAX)
                          const canonical = resolveExpenseCategoryToCanonical(raw, t)
                          setTxModalErrors((err) => {
                            if (!err.expenseCategory) return err
                            const next = { ...err }
                            delete next.expenseCategory
                            return next
                          })
                          setForm((f) => ({
                            ...f,
                            expenseCategory: canonical,
                            linkTeacherSalaryId: canonical !== 'salary' ? '' : f.linkTeacherSalaryId,
                          }))
                        }}
                        onBlur={() =>
                          setForm((f) => ({
                            ...f,
                            expenseCategory: resolveExpenseCategoryToCanonical(f.expenseCategory, t),
                          }))
                        }
                      />
                    </FormField>
                  </div>
                )}
                {form.type === 'expense' ? (
                  <>
                    <div className="col-12 col-md-4">
                      <FormField label={t('finance.expenseFundSource')} htmlFor="fx-fund-src" labelClassName="small text-secondary">
                        <AppInput
                          id="fx-fund-src"
                          className="finance-dash__modal-combo"
                          list="finance-datalist-modal-fund-src"
                          autoComplete="off"
                          dir={isUr ? 'rtl' : 'ltr'}
                          spellCheck={false}
                          maxLength={TX_FUND_SOURCE_MAX}
                          value={fundSourceInputValue}
                          onChange={(e) => {
                            const raw = e.target.value.slice(0, TX_FUND_SOURCE_MAX)
                            const canonical = resolveFundSourceToCanonical(raw, t)
                            setForm((f) => ({ ...f, fundSource: canonical }))
                          }}
                          onBlur={() =>
                            setForm((f) => ({
                              ...f,
                              fundSource: resolveFundSourceToCanonical(f.fundSource, t) || 'general',
                            }))
                          }
                        />
                      </FormField>
                    </div>
                    <div className="col-12 col-md-4">
                      <FormField label={t('finance.status')} htmlFor="fx-st-exp" labelClassName="small text-secondary">
                        <AppSelect id="fx-st-exp" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                          {TX_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {t(`finance.txStatus.${s}`)}
                            </option>
                          ))}
                        </AppSelect>
                      </FormField>
                    </div>
                <div className="col-12 col-md-4" data-lang-field="ur">
                  <FormField k="usageForUr" htmlFor="fx-uu" langField="ur">
                    <AppInput
                      id="fx-uu"
                      dir="rtl"
                      value={form.usageFor.ur}
                      onChange={(e) => setForm({ ...form, usageFor: { ...form.usageFor, ur: e.target.value } })}
                    />
                  </FormField>
                </div>
                <div className="col-12 col-md-4" data-lang-field="en">
                  <FormField k="usageForEn" htmlFor="fx-ue" langField="en">
                    <AppInput
                      id="fx-ue"
                      dir="ltr"
                      value={form.usageFor.en}
                      onChange={(e) => setForm({ ...form, usageFor: { ...form.usageFor, en: e.target.value } })}
                    />
                  </FormField>
                </div>
                  </>
                ) : (
                  <>
                    <div className="col-12 col-md-4">
                      <FormField label={t('finance.status')} htmlFor="fx-st-inc" labelClassName="small text-secondary">
                        <AppSelect id="fx-st-inc" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                          {TX_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {t(`finance.txStatus.${s}`)}
                            </option>
                          ))}
                        </AppSelect>
                      </FormField>
                    </div>
                    <div className="col-12 col-md-4" data-lang-field="ur">
                      <FormField k="usageForUr" htmlFor="fx-uu" langField="ur">
                        <AppInput
                          id="fx-uu"
                          dir="rtl"
                          value={form.usageFor.ur}
                          onChange={(e) => setForm({ ...form, usageFor: { ...form.usageFor, ur: e.target.value } })}
                        />
                      </FormField>
                    </div>
                    <div className="col-12 col-md-4" data-lang-field="en">
                      <FormField k="usageForEn" htmlFor="fx-ue" langField="en">
                        <AppInput
                          id="fx-ue"
                          dir="ltr"
                          value={form.usageFor.en}
                          onChange={(e) => setForm({ ...form, usageFor: { ...form.usageFor, en: e.target.value } })}
                        />
                      </FormField>
                    </div>
                  </>
                )}
                {!editingTxId && form.type === 'expense' && resolveExpenseCategoryToCanonical(form.expenseCategory, t) === 'salary' ? (
                  <div className="col-12">
                    <div className="finance-dash__link-panel">
                      <FormField label={t('finance.linkSalaryTitle')} labelClassName="fw-semibold text-secondary mb-1">
                        <AppSelect
                          value={form.linkTeacherSalaryId}
                          onChange={(e) => {
                            const id = e.target.value
                            setForm((f) => {
                              const next = { ...f, linkTeacherSalaryId: id }
                              if (id) {
                                const sal = salaryPicklist.find((s) => String(s._id) === id)
                                const net = Math.round(Number(sal?.netSalary) || 0)
                                if (sal && (!f.amount || Number(f.amount) === 0)) next.amount = String(net)
                              }
                              return next
                            })
                          }}
                        >
                          <option value="">{t('finance.linkSalaryNone')}</option>
                          {salaryPicklist.map((s) => (
                            <option key={s._id} value={String(s._id)}>
                              {loc(s.teacherId?.name || {}, lng)} — {formatAmount(s.netSalary)}
                              {s.invoiceNumber ? ` (${s.invoiceNumber})` : ''}
                            </option>
                          ))}
                        </AppSelect>
                      </FormField>
                      <div className="small text-secondary mt-1">{t('finance.linkSalaryHint')}</div>
                    </div>
                  </div>
                ) : null}
                {!editingTxId && form.type === 'income' && form.fundType === 'fees' ? (
                  <div className="col-12">
                    <div className="finance-dash__link-panel">
                      <FormField label={t('finance.linkFeeTitle')} labelClassName="fw-semibold text-secondary mb-1">
                        <AppSelect
                          value={form.linkFeeBalanceId}
                          onChange={(e) => {
                            const id = e.target.value
                            setForm((f) => {
                              const next = { ...f, linkFeeBalanceId: id }
                              if (id) {
                                const row = feeBalancesWithDue.find((b) => String(b._id) === id)
                                const due = Math.round(Number(row?.due) || 0)
                                if (row && (!f.amount || Number(f.amount) === 0)) next.amount = String(due)
                              }
                              return next
                            })
                          }}
                        >
                          <option value="">{t('finance.linkFeeNone')}</option>
                          {feeBalancesWithDue.map((b) => (
                            <option key={b._id} value={String(b._id)}>
                              {loc(b.studentId?.name || {}, lng)} — {t('finance.feesDueShort')} {formatAmount(b.due)}
                            </option>
                          ))}
                        </AppSelect>
                      </FormField>
                      <div className="small text-secondary mt-1">{t('finance.linkFeeHint')}</div>
                    </div>
                  </div>
                ) : null}
                {editingTxId && (form.linkTeacherSalaryId || form.linkFeeBalanceId) ? (
                  <div className="col-12">
                    <div className="alert alert-light border small mb-0 py-2">
                      {form.linkTeacherSalaryId ? <div>{t('finance.editLinkedSalary')}</div> : null}
                      {form.linkFeeBalanceId ? <div>{t('finance.editLinkedFee')}</div> : null}
                    </div>
                  </div>
                ) : null}
                <div className="col-12">
                  <FormField k="notes" htmlFor="fx-notes">
                    <AppTextarea
                      id="fx-notes"
                      dir={isUr ? 'rtl' : 'ltr'}
                      rows={2}
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                  </FormField>
                </div>
                <div className="col-12">
                  <FormField label={t('finance.receipt')} htmlFor="fx-receipt" labelClassName="small text-secondary">
                    <AppFileInput
                      id="fx-receipt"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      valueName={receiptFile?.name}
                      onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                    />
                  </FormField>
                </div>
              </div>
              <datalist id="finance-datalist-modal-exp-cat">
                {EXPENSE_CATEGORIES.map((f) => (
                  <option key={f} value={f}>
                    {t(`finance.expenseCat.${f}`)}
                  </option>
                ))}
              </datalist>
              <datalist id="finance-datalist-modal-fund-src">
                {FUND_SOURCES.map((f) => (
                  <option key={f} value={f}>
                    {t(`finance.fundSource.${f}`)}
                  </option>
                ))}
              </datalist>
            </div>
            <div className="modal-app-footer finance-dash__modal-footer d-flex flex-wrap gap-2 justify-content-start align-items-center">
              <AppButton type="submit" className="finance-dash__cta" disabled={saving || updating}>
                {t('common.save')}
              </AppButton>
              <AppButton type="button" variant="secondary" onClick={closeTxModal}>
                {t('common.cancel')}
              </AppButton>
            </div>
          </form>
        </AppModalShell>
      ) : null}

      <ConfirmDeleteModal
        open={!!deleteTxTarget}
        title={t('finance.confirmDeleteTitle')}
        message={deleteTxTarget ? t('finance.confirmDeleteBody', { title: deleteTxTarget.title }) : ''}
        onClose={() => setDeleteTxTarget(null)}
        onConfirm={async () => {
          await deleteTx(deleteTxTarget.id).unwrap()
          if (editingTxId === deleteTxTarget.id) closeTxModal()
        }}
        dir={isUr ? 'rtl' : 'ltr'}
        dialogClassName="finance-dash__modal-dialog"
      />
    </div>
  )
}
