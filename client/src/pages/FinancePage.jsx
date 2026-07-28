import { useEffect, useMemo, useState, useCallback, useId } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { formatDisplayDate } from '../shared/formatDisplayDate'
import { useCalendarMode } from '../app/calendarMode'
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
import { AppKpiCards } from '../components/ui'
import { EXPENSE_CATEGORIES, FUND_SOURCES } from '../shared/financeEnums.js'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import { useFlash } from '../app/flash.jsx'
import {
  formatAmount,
  fundRowDisplayName,
  expenseCatLabel,
  resolveExpenseCategoryToCanonical,
  resolveFundSourceToCanonical,
} from '../shared/financeDisplay'
import { IconWallet, IconArrowDown, IconArrowUp, IconScale } from '../components/finance/FinanceStatIcons'
import FinanceOverviewCharts from '../components/finance/FinanceOverviewCharts'
import FinancePortfolioSection from '../components/finance/FinancePortfolioSection'
import FinanceLedgerPanel from '../components/finance/FinanceLedgerPanel'
import FinanceTransactionModal from '../components/finance/FinanceTransactionModal'
import './financeDashboard.css'

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

      <FinanceOverviewCharts
        barData={barData}
        barDataHasData={barDataHasData}
        pieData={pieData}
        expPie={expPie}
        t={t}
        isUr={isUr}
      />

      <FinancePortfolioSection
        t={t}
        isUr={isUr}
        chartGradId={chartGradId}
        fundCategoryChartRows={fundCategoryChartRows}
        hasCategoryFlowData={hasCategoryFlowData}
        portfolioYAxisW={portfolioYAxisW}
        portfolioChartMargin={portfolioChartMargin}
      />

      <FinanceLedgerPanel
        t={t}
        lng={lng}
        mode={mode}
        isUr={isUr}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        ledgerFilterOpen={ledgerFilterOpen}
        onOpenFilters={() => setLedgerFilterOpen(true)}
        ledgerFilterActiveCount={ledgerFilterActiveCount}
        onDownloadExcel={downloadExcel}
        onPrintLedger={printLedger}
        onOpenNewTxModal={openNewTxModal}
        ledgerDraft={ledgerDraft}
        setLedgerDraft={setLedgerDraft}
        onApplyFilters={() => {
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
        onResetFilters={() =>
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
        onCloseFilters={() => setLedgerFilterOpen(false)}
        studentsPick={studentsPick}
        teachersPick={teachersPick}
        txsLoading={txsLoading}
        txs={txs}
        onEditTx={openEditTxModal}
        onDeleteTx={(x) => setDeleteTxTarget({ id: x._id, title: loc(x.title, lng) || '—' })}
        page={page}
        totalPages={totalPages}
        totalTx={totalTx}
        isFetching={isFetching}
        onPrevPage={() => setPage((p) => p - 1)}
        onNextPage={() => setPage((p) => p + 1)}
      />

      <FinanceTransactionModal
        open={txModalOpen}
        editingTxId={editingTxId}
        t={t}
        lng={lng}
        isUr={isUr}
        form={form}
        setForm={setForm}
        txModalErrors={txModalErrors}
        setTxModalErrors={setTxModalErrors}
        expenseCategoryInputValue={expenseCategoryInputValue}
        fundSourceInputValue={fundSourceInputValue}
        salaryPicklist={salaryPicklist}
        feeBalancesWithDue={feeBalancesWithDue}
        receiptFile={receiptFile}
        setReceiptFile={setReceiptFile}
        saving={saving}
        updating={updating}
        onClose={closeTxModal}
        onSubmit={submit}
      />

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
