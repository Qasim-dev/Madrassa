import { useEffect, useMemo, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  useGetInventoryStatsQuery,
  useGetInventoryItemsQuery,
  useCreateInventoryItemMutation,
  useUpdateInventoryItemMutation,
  useDeleteInventoryItemMutation,
  useGetInventoryMovementsQuery,
  useCreateInventoryMovementMutation,
  useGetFinanceAccountsQuery,
} from '../services/api'
import { loc, flText } from '../shared/localized'
import { formatDisplayDate } from '../shared/formatDisplayDate'
import { useCalendarMode } from '../app/calendarMode'
import { FL } from '../shared/fieldLabels'
import PageHeading from '../components/PageHeading'
import { useFlash } from '../app/flash.jsx'
import AppDateInput from '../components/AppDateInput'
import AppModalShell from '../components/AppModalShell'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import { BtnIconLabel, IconPencil, IconTrash, IconFileSpreadsheet, IconPrint } from '../components/ListToolbarIcons'
import { INV_CATEGORIES, INV_UNITS } from '../shared/inventoryEnums.js'
import { EXPENSE_CATEGORIES, FUND_SOURCES } from '../shared/financeEnums.js'
import { AppInput, AppSelect, AppTextarea, AppCheckbox, AppButton, FormField, FormRow, AppKpiCards, AppFileInput } from '../components/ui'
import FilterDrawer, { FilterToolbar } from '../components/FilterDrawer'
import './inventoryDashboard.css'

const CHART_COL = ['#0f8f5f', '#12a873', '#26ba99', '#5eead4', '#0b6e49', '#99f6e4', '#075c3b', '#d1fae5']
const MOVEMENT_FLOWS = ['purchase', 'usage', 'transfer', 'damage', 'expiry', 'return', 'other']

function fmt(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Number(n))
}

function stockBadge(st, t) {
  if (st === 'out') return <span className="inv-dash__badge inv-dash__badge--out">{t('inventory.stock.out')}</span>
  if (st === 'low') return <span className="inv-dash__badge inv-dash__badge--low">{t('inventory.stock.low')}</span>
  return <span className="inv-dash__badge inv-dash__badge--ok">{t('inventory.stock.ok')}</span>
}

function stockStatus(it) {
  const q = Number(it.quantity) || 0
  const m = Number(it.minStockLevel) || 5
  if (q <= 0) return 'out'
  if (q <= m) return 'low'
  return 'ok'
}

function MovFieldErr({ message }) {
  return (
    <div className="inv-dash__modal-field-msg" aria-live="polite">
      {message ? <div className="invalid-feedback d-block inv-dash__modal-field-error">{message}</div> : null}
    </div>
  )
}

function IconBox() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 7l8-4 8 4M4 7v10l8 4 8-4V7" />
    </svg>
  )
}

function emptyItemForm() {
  return {
    id: null,
    name: { ur: '', en: '' },
    quantity: '',
    category: 'other',
    unit: 'piece',
    unitPrice: '',
    minStockLevel: '5',
    supplier: { ur: '', en: '' },
    purchaseDate: '',
    expiryDate: '',
    location: '',
    barcode: '',
    notes: '',
  }
}

function emptyMovForm() {
  return {
    kind: 'entry',
    itemId: '',
    quantity: '1',
    date: new Date().toISOString().slice(0, 10),
    reason: 'usage',
    usageUr: '',
    usageEn: '',
    personUr: '',
    personEn: '',
    movementFlow: 'purchase',
    department: '',
    referenceNo: '',
    fromLocation: '',
    toLocation: '',
    createFinanceExpense: false,
    totalPurchaseCost: '',
    purchaseExpenseCategory: 'ration',
    purchaseFundSource: 'general',
    purchaseAccountId: '',
  }
}

export default function InventoryPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const isUr = lng.split('-')[0] === 'ur'
  const { showFlash } = useFlash()
  const { mode } = useCalendarMode()
  const token = useSelector((s) => s.auth.token)
  const activeSessionId = useSelector((s) => s.session.activeSessionId)
  const sessArg = activeSessionId ? { sessionId: activeSessionId } : {}

  const { data: stats, isLoading: stLoading } = useGetInventoryStatsQuery(sessArg)

  const [itemPage, setItemPage] = useState(1)
  const itemLimit = 15
  const [searchInp, setSearchInp] = useState('')
  const [debSearch, setDebSearch] = useState('')
  const [fltCategory, setFltCategory] = useState('')
  const [fltStock, setFltStock] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [itemsFilterOpen, setItemsFilterOpen] = useState(false)
  const [itemsDraft, setItemsDraft] = useState({
    category: '',
    stock: '',
    dateFrom: '',
    dateTo: '',
  })

  useEffect(() => {
    if (!itemsFilterOpen) return
    setItemsDraft({
      category: fltCategory,
      stock: fltStock,
      dateFrom,
      dateTo,
    })
  }, [itemsFilterOpen, fltCategory, fltStock, dateFrom, dateTo])

  const itemsFilterActiveCount = useMemo(() => {
    let n = 0
    if (fltCategory) n += 1
    if (fltStock) n += 1
    if (dateFrom) n += 1
    if (dateTo) n += 1
    return n
  }, [fltCategory, fltStock, dateFrom, dateTo])

  useEffect(() => {
    const h = setTimeout(() => setDebSearch(searchInp), 350)
    return () => clearTimeout(h)
  }, [searchInp])
  useEffect(() => {
    setItemPage(1)
  }, [debSearch, fltCategory, fltStock, dateFrom, dateTo, activeSessionId])

  const itemParams = useMemo(
    () => ({
      page: itemPage,
      limit: itemLimit,
      ...(activeSessionId ? { sessionId: activeSessionId } : {}),
      ...(debSearch.trim() ? { search: debSearch.trim() } : {}),
      ...(fltCategory ? { category: fltCategory } : {}),
      ...(fltStock ? { stockStatus: fltStock } : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
    }),
    [itemPage, itemLimit, activeSessionId, debSearch, fltCategory, fltStock, dateFrom, dateTo]
  )

  const { data: itemPageData, isLoading: itemsLoading, isFetching: itemsFetching } = useGetInventoryItemsQuery(itemParams)
  const items = itemPageData?.items ?? []
  const itemsTotal = itemPageData?.total ?? 0
  const itemPages = Math.max(1, Math.ceil(itemsTotal / itemLimit))

  const pickParams = useMemo(
    () => ({ page: 1, limit: 500, ...(activeSessionId ? { sessionId: activeSessionId } : {}) }),
    [activeSessionId]
  )
  const { data: pickData } = useGetInventoryItemsQuery(pickParams)
  const pickItems = pickData?.items ?? []

  const [movPage, setMovPage] = useState(1)
  const movLimit = 12
  const movParams = useMemo(
    () => ({
      page: movPage,
      limit: movLimit,
      ...(activeSessionId ? { sessionId: activeSessionId } : {}),
    }),
    [movPage, movLimit, activeSessionId]
  )
  const { data: movData, isLoading: movLoading } = useGetInventoryMovementsQuery(movParams)
  const movements = movData?.items ?? []
  const movTotal = movData?.total ?? 0
  const movPages = Math.max(1, Math.ceil(movTotal / movLimit))

  const [createItem, { isLoading: creating }] = useCreateInventoryItemMutation()
  const [updateItem, { isLoading: updating }] = useUpdateInventoryItemMutation()
  const [deleteItemMut] = useDeleteInventoryItemMutation()
  const [createMovement, { isLoading: movSaving }] = useCreateInventoryMovementMutation()

  const { data: financeAccounts = [] } = useGetFinanceAccountsQuery()
  const defaultFinanceAccountId = financeAccounts[0]?._id ? String(financeAccounts[0]._id) : ''

  const [itemForm, setItemForm] = useState(emptyItemForm)
  const [receiptFile, setReceiptFile] = useState(null)

  const [movForm, setMovForm] = useState(emptyMovForm)

  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [movModalOpen, setMovModalOpen] = useState(false)
  const [deleteInvTarget, setDeleteInvTarget] = useState(null)

  useEffect(() => {
    if (!movModalOpen || !defaultFinanceAccountId) return
    setMovForm((f) => {
      if (f.purchaseAccountId) return f
      return { ...f, purchaseAccountId: defaultFinanceAccountId }
    })
  }, [movModalOpen, defaultFinanceAccountId])

  useEffect(() => {
    if (!financeAccounts.length) {
      setMovForm((f) => (f.createFinanceExpense ? { ...f, createFinanceExpense: false } : f))
    }
  }, [financeAccounts.length])

  const resetMovForm = useCallback(() => {
    setMovForm(emptyMovForm())
  }, [])

  const movementValidation = useMemo(() => {
    const errors = {}
    if (!movForm.itemId) errors.itemId = t('inventory.pickItem')

    const q = Number(movForm.quantity)
    if (!Number.isFinite(q) || q <= 0) errors.quantity = t('inventory.invalidQty')
    else if (!Number.isInteger(q)) errors.quantity = t('inventory.errQtyWhole')

    const dateStr = String(movForm.date || '').trim()
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) errors.date = t('inventory.errDateRequired')

    if (movForm.movementFlow === 'transfer') {
      if (!String(movForm.fromLocation).trim()) errors.fromLocation = t('inventory.errTransferFrom')
      if (!String(movForm.toLocation).trim()) errors.toLocation = t('inventory.errTransferTo')
    }

    if (movForm.kind === 'exit') {
      const hasUsage = String(movForm.usageUr).trim() || String(movForm.usageEn).trim()
      const hasDept = String(movForm.department).trim()
      if (!hasUsage && !hasDept) errors.usageOrDept = t('inventory.errExitUsageOrDept')
    }

    const selectedItem = pickItems.find((i) => String(i._id) === String(movForm.itemId))
    const available = selectedItem != null ? Number(selectedItem.quantity) || 0 : 0
    if (
      selectedItem &&
      (movForm.kind === 'exit' || movForm.kind === 'registration') &&
      Number.isFinite(q) &&
      q > available
    ) {
      errors.stock = t('inventory.errInsufficientStock', { available })
    }

    if (movForm.kind === 'entry' && movForm.createFinanceExpense) {
      if (!financeAccounts.length) {
        errors.finance = t('inventory.noFinanceAccounts')
      } else {
        const tc = Number(movForm.totalPurchaseCost)
        if (!Number.isFinite(tc) || tc <= 0) errors.purchaseCost = t('inventory.errPurchaseCost')
        const accOk =
          movForm.purchaseAccountId &&
          financeAccounts.some((a) => String(a._id) === String(movForm.purchaseAccountId))
        if (!accOk) errors.purchaseAccount = t('inventory.errPurchaseAccount')
      }
    }

    const valid = Object.keys(errors).length === 0
    return { errors, valid }
  }, [movForm, pickItems, financeAccounts, t])

  const linePreview = useMemo(() => {
    const q = Number(itemForm.quantity) || 0
    const p = Number(itemForm.unitPrice) || 0
    return Math.round(q * p * 100) / 100
  }, [itemForm.quantity, itemForm.unitPrice])

  const clearItemForm = useCallback(() => {
    setItemForm(emptyItemForm())
    setReceiptFile(null)
  }, [])

  const closeItemModal = useCallback(() => {
    setItemModalOpen(false)
    setItemForm(emptyItemForm())
    setReceiptFile(null)
  }, [])

  const openAddItemModal = useCallback(() => {
    setItemForm(emptyItemForm())
    setReceiptFile(null)
    setItemModalOpen(true)
  }, [])

  function startEdit(it) {
    setItemForm({
      id: it._id,
      name: { ur: it.name?.ur || '', en: it.name?.en || '' },
      quantity: String(it.quantity ?? ''),
      category: it.category || 'other',
      unit: it.unit || 'piece',
      unitPrice: String(it.unitPrice ?? ''),
      minStockLevel: String(it.minStockLevel ?? 5),
      supplier: { ur: it.supplier?.ur || '', en: it.supplier?.en || '' },
      purchaseDate: it.purchaseDate ? new Date(it.purchaseDate).toISOString().slice(0, 10) : '',
      expiryDate: it.expiryDate ? new Date(it.expiryDate).toISOString().slice(0, 10) : '',
      location: it.location || '',
      barcode: it.barcode || '',
      notes: it.notes || '',
    })
    setReceiptFile(null)
    setItemModalOpen(true)
  }

  async function submitItem(e) {
    e.preventDefault()
    if (!itemForm.name.ur && !itemForm.name.en) {
      showFlash(t('inventory.validationName'))
      return
    }
    const qty = Number(itemForm.quantity) || 0
    const body = {
      name: itemForm.name,
      quantity: qty,
      category: itemForm.category,
      unit: itemForm.unit,
      unitPrice: Math.max(0, Number(itemForm.unitPrice) || 0),
      minStockLevel: Math.max(0, Number(itemForm.minStockLevel) || 0),
      supplier: itemForm.supplier,
      purchaseDate: itemForm.purchaseDate || null,
      expiryDate: itemForm.expiryDate || null,
      location: itemForm.location,
      barcode: itemForm.barcode,
      notes: itemForm.notes,
      ...(activeSessionId ? { sessionId: activeSessionId } : {}),
    }
    try {
      if (itemForm.id) {
        await updateItem({ id: itemForm.id, ...body }).unwrap()
      } else if (receiptFile) {
        const fd = new FormData()
        fd.append('nameUr', itemForm.name.ur)
        fd.append('nameEn', itemForm.name.en)
        fd.append('quantity', String(qty))
        fd.append('category', itemForm.category)
        fd.append('unit', itemForm.unit)
        fd.append('unitPrice', String(body.unitPrice))
        fd.append('minStockLevel', String(body.minStockLevel))
        fd.append('supplierUr', itemForm.supplier.ur)
        fd.append('supplierEn', itemForm.supplier.en)
        if (itemForm.purchaseDate) fd.append('purchaseDate', itemForm.purchaseDate)
        if (itemForm.expiryDate) fd.append('expiryDate', itemForm.expiryDate)
        fd.append('location', itemForm.location)
        fd.append('barcode', itemForm.barcode)
        fd.append('notes', itemForm.notes)
        if (activeSessionId) fd.append('sessionId', activeSessionId)
        fd.append('receipt', receiptFile)
        await createItem(fd).unwrap()
      } else {
        await createItem(body).unwrap()
      }
      clearItemForm()
      setItemModalOpen(false)
    } catch (err) {
      showFlash(err?.data?.message || err?.error || 'Save failed')
    }
  }

  async function submitMovement(e) {
    e.preventDefault()
    if (!movementValidation.valid) {
      const msg = Object.values(movementValidation.errors).find(Boolean)
      if (msg) showFlash(msg)
      return
    }
    const q = Number(movForm.quantity)
    try {
      await createMovement({
        kind: movForm.kind,
        itemId: movForm.itemId,
        quantity: q,
        date: movForm.date,
        reason: movForm.kind === 'registration' ? movForm.reason : '',
        usageLocation: { ur: movForm.usageUr, en: movForm.usageEn },
        responsiblePerson: { ur: movForm.personUr, en: movForm.personEn },
        movementFlow: movForm.movementFlow,
        department: movForm.department,
        referenceNo: movForm.referenceNo,
        fromLocation: movForm.fromLocation,
        toLocation: movForm.toLocation,
        createFinanceExpense: movForm.kind === 'entry' && movForm.createFinanceExpense,
        totalPurchaseCost:
          movForm.kind === 'entry' && movForm.createFinanceExpense ? Number(movForm.totalPurchaseCost) : undefined,
        purchaseExpenseCategory:
          movForm.kind === 'entry' && movForm.createFinanceExpense ? movForm.purchaseExpenseCategory : undefined,
        purchaseFundSource:
          movForm.kind === 'entry' && movForm.createFinanceExpense ? movForm.purchaseFundSource : undefined,
        accountId:
          movForm.kind === 'entry' && movForm.createFinanceExpense && movForm.purchaseAccountId
            ? movForm.purchaseAccountId
            : undefined,
      }).unwrap()
      resetMovForm()
      setMovModalOpen(false)
    } catch (err) {
      showFlash(err?.data?.message || err?.error || 'Save failed')
    }
  }

  const exportQs = useMemo(() => {
    const p = new URLSearchParams()
    if (activeSessionId) p.set('sessionId', activeSessionId)
    if (debSearch.trim()) p.set('search', debSearch.trim())
    if (fltCategory) p.set('category', fltCategory)
    if (fltStock) p.set('stockStatus', fltStock)
    if (dateFrom) p.set('dateFrom', dateFrom)
    if (dateTo) p.set('dateTo', dateTo)
    return p.toString()
  }, [activeSessionId, debSearch, fltCategory, fltStock, dateFrom, dateTo])

  async function exportExcel() {
    if (!token) return
    const res = await fetch(`/api/inventory/items/export${exportQs ? `?${exportQs}` : ''}`, {
      headers: { authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      showFlash(t('inventory.exportFailed'))
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventory-${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  function printItems() {
    const rows = items
      .map(
        (it) => `<tr><td>${loc(it.name, lng)}</td><td>${it.category}</td><td>${it.quantity}</td><td>${stockStatus(it)}</td></tr>`
      )
      .join('')
    const html = `<!DOCTYPE html><html dir="${isUr ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"/><title>${t('inventory.itemsList')}</title>
      <style>body{font-family:system-ui;padding:16px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #e2e8f0;padding:6px;font-size:13px}</style></head><body>
      <h1>${t('inventory.itemsList')}</h1><table><thead><tr><th>${flText(FL.inventoryItemName, lng)}</th><th>${t('inventory.category')}</th><th>${flText(FL.inventoryQty, lng)}</th><th>${t('inventory.colStatus')}</th></tr></thead><tbody>${rows}</tbody></table></body></html>`
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 200)
  }

  const pieCat = (stats?.categoryDistribution ?? [])
    .filter((x) => Number(x.value) > 0)
    .map((x) => ({
      name: t(`inventory.category.${x.category}`),
      value: Number(x.value) || 0,
    }))
  const barUse = (stats?.monthlyUsageCostSeries ?? []).map((x) => ({
    m: x.month?.slice(5) + '/' + x.month?.slice(2, 4),
    cost: x.cost,
  }))
  const barUseHasData = barUse.some((x) => Number(x.cost) > 0)

  const statRow = [
    { key: 'items', icon: <IconBox />, label: t('inventory.dash.totalItems'), value: fmt(stats?.totalItems), hint: t('inventory.dash.hintItems'), tone: 'teal' },
    { key: 'avail', icon: <IconBox />, label: t('inventory.dash.available'), value: fmt(stats?.availableStock), hint: t('inventory.dash.hintAvail'), tone: 'emerald' },
    { key: 'low', icon: <IconBox />, label: t('inventory.dash.lowStock'), value: fmt(stats?.lowStockCount), hint: t('inventory.dash.hintLow'), tone: 'warn' },
    { key: 'out', icon: <IconBox />, label: t('inventory.dash.outStock'), value: fmt(stats?.outOfStockCount), hint: t('inventory.dash.hintOut'), tone: 'danger' },
    { key: 'cost', icon: <IconBox />, label: t('inventory.dash.monthlyCost'), value: fmt(stats?.monthlyUsageCost), hint: t('inventory.dash.hintCost'), tone: 'blue' },
  ]

  const mvErr = movementValidation.errors

  return (
    <div>
      <PageHeading navKey="navInventory" />
      <div className="inv-dash__hero" lang={isUr ? 'ur' : 'en'}>
        <div className="inv-dash__hero-title">{t('inventory.heroTitle')}</div>
        <div className="inv-dash__hero-sub">{t('inventory.heroSub')}</div>
      </div>

      <AppKpiCards loading={stLoading} columns={5} items={statRow} />

      {(stats?.alerts?.length ?? 0) > 0 ? (
        <div className="inv-dash__alerts">
          <div className="inv-dash__alerts-title">{t('inventory.alertsTitle')}</div>
          {(stats.alerts || []).slice(0, 12).map((a, i) => (
            <div key={i} className="inv-dash__alert-row">
              {a.type === 'low_stock' && t('inventory.alertLow', { name: loc(a.name, lng), q: a.quantity })}
              {a.type === 'expiring' && t('inventory.alertExpire', { name: loc(a.name, lng) })}
              {a.type === 'high_usage' && t('inventory.alertHighUse', { name: loc(a.name, lng), r: a.ratio })}
              {a.type === 'reorder' && t('inventory.alertReorder', { name: loc(a.name, lng) })}
            </div>
          ))}
        </div>
      ) : null}

      <div className="inv-dash__charts">
        <div className="inv-dash__chart-box">
          <div className="inv-dash__chart-title">{t('inventory.chartCategory')}</div>
          <div className="inv-dash__chart-body">
            {pieCat.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <Pie
                    data={pieCat}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="42%"
                    innerRadius={0}
                    outerRadius={78}
                    paddingAngle={1}
                    label={false}
                  >
                    {pieCat.map((_, i) => (
                      <Cell key={i} fill={CHART_COL[i % CHART_COL.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} />
                  <Legend verticalAlign="bottom" align="center" layout="horizontal" wrapperStyle={{ fontSize: '0.78rem' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="inv-dash__chart-empty text-secondary small" dir={isUr ? 'rtl' : 'ltr'}>
                {t('inventory.chartEmpty')}
              </div>
            )}
          </div>
        </div>
        <div className="inv-dash__chart-box">
          <div className="inv-dash__chart-title">{t('inventory.chartMonthlyUse')}</div>
          <div className="inv-dash__chart-body">
            {barUseHasData ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barUse} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                  <XAxis dataKey="m" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => fmt(v)} />
                  <Bar dataKey="cost" fill="#0f8f5f" name={t('inventory.dash.monthlyCost')} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="inv-dash__chart-empty text-secondary small" dir={isUr ? 'rtl' : 'ltr'}>
                {t('inventory.chartEmpty')}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="inv-dash__panel">
        <div className="inv-dash__panel-head d-flex flex-wrap justify-content-between align-items-center gap-2">
          <span>{t('inventory.movementTitle')}</span>
          <button
            type="button"
            className="btn btn-sm inv-dash__cta"
            onClick={() => {
              resetMovForm()
              setMovModalOpen(true)
            }}
          >
            {t('inventory.newMovement')}
          </button>
        </div>
        <div className="inv-dash__panel-body">
          <p className="small text-secondary mb-0">{t('inventory.hintMovements')}</p>
        </div>
      </div>

      <div className="inv-dash__panel">
        <div className="inv-dash__panel-head">{t('inventory.movementsList')}</div>
        <div className="inv-dash__table-wrap">
          {movLoading ? (
            <div className="p-3 text-secondary">{t('common.loading')}</div>
          ) : (
            <table className="inv-dash__table mb-0">
              <thead>
                <tr>
                  <th>{flText(FL.inventoryItemName, lng)}</th>
                  <th>{t('inventory.colUsage')}</th>
                  <th>{flText(FL.inventoryQty, lng)}</th>
                  <th>{t('inventory.colDirection')}</th>
                  <th>{flText(FL.date, lng)}</th>
                  <th>{t('inventory.colResponsible')}</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-secondary py-4">
                      {t('common.noRecords')}
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m._id}>
                      <td>{loc(m.itemId?.name || {}, lng)}</td>
                      <td className="small">{loc(m.usageLocation || {}, lng) || '—'}</td>
                      <td className="table-num">{m.quantity}</td>
                      <td>
                        <span className="inv-dash__badge inv-dash__badge--ok">{m.kind === 'entry' ? t('inventory.direction.in') : t('inventory.direction.out')}</span>
                      </td>
                      <td className="small">{formatDisplayDate(m.date, lng, mode)}</td>
                      <td className="small">{loc(m.responsiblePerson || {}, lng) || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
        <div className="inv-dash__pagination">
          <span className="small text-secondary">
            {t('inventory.pageOf', { page: movPage, pages: movPages, total: movTotal })}
          </span>
          <div className="btn-group">
            <button type="button" className="btn btn-sm btn-outline-secondary" disabled={movPage <= 1} onClick={() => setMovPage((p) => p - 1)}>
              {t('inventory.prev')}
            </button>
            <button type="button" className="btn btn-sm btn-outline-secondary" disabled={movPage >= movPages} onClick={() => setMovPage((p) => p + 1)}>
              {t('inventory.next')}
            </button>
          </div>
        </div>
      </div>

      <div className="inv-dash__panel">
        <div className="inv-dash__panel-head d-flex flex-wrap justify-content-between align-items-center gap-2">
          <span>{t('inventory.itemsList')}</span>
          <button type="button" className="btn btn-sm inv-dash__cta" onClick={openAddItemModal}>
            {t('inventory.addItem')}
          </button>
        </div>
        <div className="inv-dash__toolbar inv-dash__toolbar--filters">
          <FilterToolbar
            search={searchInp}
            onSearchChange={setSearchInp}
            searchPlaceholder={t('common.search')}
            searchId="inv-items-search"
            onOpenFilters={() => setItemsFilterOpen(true)}
            activeCount={itemsFilterActiveCount}
          >
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={exportExcel}>
              <BtnIconLabel icon={<IconFileSpreadsheet />}>{t('inventory.exportExcel')}</BtnIconLabel>
            </button>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={printItems}>
              <BtnIconLabel icon={<IconPrint />}>{t('inventory.print')}</BtnIconLabel>
            </button>
          </FilterToolbar>
          <FilterDrawer
            open={itemsFilterOpen}
            onClose={() => setItemsFilterOpen(false)}
            onApply={() => {
              setFltCategory(itemsDraft.category)
              setFltStock(itemsDraft.stock)
              setDateFrom(itemsDraft.dateFrom)
              setDateTo(itemsDraft.dateTo)
              setItemsFilterOpen(false)
            }}
            onReset={() =>
              setItemsDraft({
                category: '',
                stock: '',
                dateFrom: '',
                dateTo: '',
              })
            }
          >
            <div className="filter-drawer__field">
              <label className="filter-drawer__label" htmlFor="inv-flt-category">
                {t('inventory.category')}
              </label>
              <AppSelect
                id="inv-flt-category"
                className="w-100"
                value={itemsDraft.category}
                onChange={(e) => setItemsDraft((d) => ({ ...d, category: e.target.value }))}
              >
                <option value="">{t('inventory.filterAll')}</option>
                {INV_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`inventory.category.${c}`)}
                  </option>
                ))}
              </AppSelect>
            </div>
            <div className="filter-drawer__field">
              <label className="filter-drawer__label" htmlFor="inv-flt-stock">
                {t('inventory.colStatus')}
              </label>
              <AppSelect
                id="inv-flt-stock"
                className="w-100"
                value={itemsDraft.stock}
                onChange={(e) => setItemsDraft((d) => ({ ...d, stock: e.target.value }))}
              >
                <option value="">{t('inventory.filterAll')}</option>
                <option value="available">{t('inventory.stock.ok')}</option>
                <option value="low">{t('inventory.stock.low')}</option>
                <option value="out">{t('inventory.stock.out')}</option>
              </AppSelect>
            </div>
            <div className="filter-drawer__field">
              <label className="filter-drawer__label">{t('inventory.filterPurchaseFrom')}</label>
              <AppDateInput
                lng={lng}
                value={itemsDraft.dateFrom}
                onChange={(v) => setItemsDraft((d) => ({ ...d, dateFrom: v }))}
              />
            </div>
            <div className="filter-drawer__field">
              <label className="filter-drawer__label">{t('inventory.filterPurchaseTo')}</label>
              <AppDateInput
                lng={lng}
                value={itemsDraft.dateTo}
                onChange={(v) => setItemsDraft((d) => ({ ...d, dateTo: v }))}
              />
            </div>
          </FilterDrawer>
        </div>
        <table className="inv-dash__table mb-0">
          <thead>
            <tr>
              <th>{flText(FL.inventoryItemName, lng)}</th>
              <th>{t('inventory.category')}</th>
              <th>{flText(FL.inventoryQty, lng)}</th>
              <th>{t('inventory.unit')}</th>
              <th>{flText(FL.inventoryUnitPrice, lng)}</th>
              <th>{flText(FL.inventorySupplierUr, lng)}</th>
              <th>{flText(FL.inventoryPurchaseDate, lng)}</th>
              <th>{t('inventory.colStatus')}</th>
              <th>{flText(FL.inventoryLocation, lng)}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {itemsLoading ? (
              <tr>
                <td colSpan={10} className="text-center py-4 text-secondary">
                  {t('common.loading')}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-4 text-secondary">
                  {t('common.noRecords')}
                </td>
              </tr>
            ) : (
              items.map((it) => {
                const st = stockStatus(it)
                return (
                  <tr key={it._id}>
                    <td>{loc(it.name, lng)}</td>
                    <td className="small">{t(`inventory.category.${it.category || 'other'}`)}</td>
                    <td className="table-num">{it.quantity}</td>
                    <td className="small">{t(`inventory.unit.${it.unit || 'piece'}`)}</td>
                    <td className="table-num">{fmt(it.unitPrice)}</td>
                    <td className="small">{loc(it.supplier, lng) || '—'}</td>
                    <td className="small">{formatDisplayDate(it.purchaseDate, lng, mode)}</td>
                    <td>{stockBadge(st, t)}</td>
                    <td className="small">{it.location || '—'}</td>
                    <td>
                      <div className="d-flex flex-wrap gap-1">
                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => startEdit(it)}>
                          <BtnIconLabel icon={<IconPencil />}>{t('common.edit')}</BtnIconLabel>
                        </button>
                        {it.receiptUrl ? (
                          <a href={it.receiptUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-secondary">
                            {t('inventory.receipt')}
                          </a>
                        ) : null}
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => setDeleteInvTarget({ id: it._id, name: loc(it.name, lng) || '—' })}
                        >
                          <BtnIconLabel icon={<IconTrash />}>{t('common.delete')}</BtnIconLabel>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
        <div className="inv-dash__pagination">
          <span className="small text-secondary">
            {t('inventory.pageOf', { page: itemPage, pages: itemPages, total: itemsTotal })}
            {itemsFetching ? ` ${t('common.loading')}` : ''}
          </span>
          <div className="btn-group">
            <button type="button" className="btn btn-sm btn-outline-secondary" disabled={itemPage <= 1} onClick={() => setItemPage((p) => p - 1)}>
              {t('inventory.prev')}
            </button>
            <button type="button" className="btn btn-sm btn-outline-secondary" disabled={itemPage >= itemPages} onClick={() => setItemPage((p) => p + 1)}>
              {t('inventory.next')}
            </button>
          </div>
        </div>
      </div>

      {movModalOpen ? (
        <AppModalShell
          title={t('inventory.movementTitle')}
          onClose={() => {
            setMovModalOpen(false)
            resetMovForm()
          }}
          size="lg"
          dir={isUr ? 'rtl' : 'ltr'}
          dialogClassName="inv-dash__modal-dialog"
        >
          <form className="modal-app-form" onSubmit={submitMovement}>
            <div className="modal-app-body">
              <div className="row g-3 align-items-start">
                <div className="col-12 col-md-4">
                  <FormField k="inventoryMovementKind" htmlFor="mv-k" labelClassName="small mb-0">
                    <AppSelect
                      id="mv-k"
                      value={movForm.kind}
                      onChange={(e) => {
                        const kind = e.target.value
                        setMovForm((f) => {
                          const movementFlow =
                            kind === 'exit' ? 'usage' : kind === 'registration' ? 'damage' : kind === 'entry' ? 'purchase' : f.movementFlow
                          return {
                            ...f,
                            kind,
                            movementFlow,
                            createFinanceExpense: kind === 'entry' ? f.createFinanceExpense : false,
                          }
                        })
                      }}
                    >
                      <option value="entry">{t('inventory.kind.entry')}</option>
                      <option value="exit">{t('inventory.kind.exit')}</option>
                      <option value="registration">{t('inventory.kind.registration')}</option>
                    </AppSelect>
                  </FormField>
                </div>
                <div className="col-12 col-md-4">
                  <FormField k="inventoryItemName" htmlFor="mv-i" labelClassName="small mb-0" error={mvErr.itemId}>
                    <AppSelect
                      id="mv-i"
                      invalid={!!mvErr.itemId}
                      value={movForm.itemId}
                      onChange={(e) => setMovForm({ ...movForm, itemId: e.target.value })}
                    >
                      <option value="">{t('inventory.pickItem')}</option>
                      {pickItems.map((it) => (
                        <option key={it._id} value={it._id}>
                          {loc(it.name, lng)}
                        </option>
                      ))}
                    </AppSelect>
                  </FormField>
                </div>
                <div className="col-12 col-md-4">
                  <FormField k="inventoryQty" htmlFor="mv-q" labelClassName="small mb-0" error={mvErr.quantity || mvErr.stock}>
                    <AppInput
                      id="mv-q"
                      type="number"
                      min={1}
                      step={1}
                      latin
                      invalid={!!(mvErr.quantity || mvErr.stock)}
                      value={movForm.quantity}
                      onChange={(e) => setMovForm({ ...movForm, quantity: e.target.value })}
                    />
                  </FormField>
                </div>
                <div className="col-12 col-md-4">
                  <FormField k="date" htmlFor="mv-d" labelClassName="small mb-0" error={mvErr.date}>
                    <AppDateInput
                      id="mv-d"
                      lng={lng}
                      value={movForm.date}
                      onChange={(v) => setMovForm({ ...movForm, date: v })}
                    />
                  </FormField>
                </div>
                {movForm.kind === 'registration' ? (
                  <div className="col-12 col-md-4">
                    <FormField k="inventoryMovementReason" htmlFor="mv-r" labelClassName="small mb-0">
                      <AppSelect id="mv-r" value={movForm.reason} onChange={(e) => setMovForm({ ...movForm, reason: e.target.value })}>
                        <option value="usage">{t('inventory.reason.usage')}</option>
                        <option value="damage">{t('inventory.reason.damage')}</option>
                      </AppSelect>
                    </FormField>
                  </div>
                ) : null}
                <div className="col-12 col-md-4">
                  <FormField
                    k="inventoryUsageLocUr"
                    htmlFor="mv-uu"
                    labelClassName="small mb-0"
                    langField="ur"
                    error={movForm.kind === 'exit' ? mvErr.usageOrDept : undefined}
                  >
                    <AppInput
                      id="mv-uu"
                      invalid={movForm.kind === 'exit' && !!mvErr.usageOrDept}
                      value={movForm.usageUr}
                      onChange={(e) => setMovForm({ ...movForm, usageUr: e.target.value })}
                    />
                  </FormField>
                </div>
                <div className="col-12 col-md-4">
                  <FormField
                    k="inventoryUsageLocEn"
                    htmlFor="mv-ue"
                    labelClassName="small mb-0"
                    langField="en"
                    error={movForm.kind === 'exit' ? mvErr.usageOrDept : undefined}
                  >
                    <AppInput
                      id="mv-ue"
                      invalid={movForm.kind === 'exit' && !!mvErr.usageOrDept}
                      value={movForm.usageEn}
                      onChange={(e) => setMovForm({ ...movForm, usageEn: e.target.value })}
                    />
                  </FormField>
                </div>
                <div className="col-12 col-md-4">
                  <FormField k="inventoryResponsibleUr" htmlFor="mv-pu" labelClassName="small mb-0" langField="ur">
                    <AppInput id="mv-pu" value={movForm.personUr} onChange={(e) => setMovForm({ ...movForm, personUr: e.target.value })} />
                  </FormField>
                </div>
                <div className="col-12 col-md-4">
                  <FormField k="inventoryResponsibleEn" htmlFor="mv-pe" labelClassName="small mb-0" langField="en">
                    <AppInput id="mv-pe" value={movForm.personEn} onChange={(e) => setMovForm({ ...movForm, personEn: e.target.value })} />
                  </FormField>
                </div>
                <div className="col-12">
                  <hr className="my-1 opacity-25" />
                </div>
                <div className="col-12 col-md-4">
                  <FormField k="inventoryMovementFlow" htmlFor="mv-fl" labelClassName="small mb-0">
                    <AppSelect
                      id="mv-fl"
                      value={movForm.movementFlow}
                      onChange={(e) => setMovForm({ ...movForm, movementFlow: e.target.value })}
                    >
                      {MOVEMENT_FLOWS.map((flow) => (
                        <option key={flow} value={flow}>
                          {t(`inventory.flow.${flow}`)}
                        </option>
                      ))}
                    </AppSelect>
                  </FormField>
                </div>
                <div className="col-12 col-md-4">
                  <FormField
                    k="inventoryDepartment"
                    htmlFor="mv-dept"
                    labelClassName="small mb-0"
                    error={movForm.kind === 'exit' ? mvErr.usageOrDept : undefined}
                  >
                    <AppInput
                      id="mv-dept"
                      invalid={movForm.kind === 'exit' && !!mvErr.usageOrDept}
                      value={movForm.department}
                      onChange={(e) => setMovForm({ ...movForm, department: e.target.value })}
                    />
                  </FormField>
                </div>
                <div className="col-12 col-md-4">
                  <FormField k="inventoryReferenceNo" htmlFor="mv-ref" labelClassName="small mb-0">
                    <AppInput
                      id="mv-ref"
                      latin
                      value={movForm.referenceNo}
                      onChange={(e) => setMovForm({ ...movForm, referenceNo: e.target.value })}
                    />
                  </FormField>
                </div>
                {movForm.kind === 'exit' ? (
                  <div className="col-12">
                    <MovFieldErr message={mvErr.usageOrDept} />
                  </div>
                ) : null}
                {movForm.movementFlow === 'transfer' ? (
                  <>
                    <div className="col-12 col-md-4">
                      <FormField k="inventoryFromLocation" htmlFor="mv-from" labelClassName="small mb-0" error={mvErr.fromLocation}>
                        <AppInput
                          id="mv-from"
                          invalid={!!mvErr.fromLocation}
                          value={movForm.fromLocation}
                          onChange={(e) => setMovForm({ ...movForm, fromLocation: e.target.value })}
                        />
                      </FormField>
                    </div>
                    <div className="col-12 col-md-4">
                      <FormField k="inventoryToLocation" htmlFor="mv-to" labelClassName="small mb-0" error={mvErr.toLocation}>
                        <AppInput
                          id="mv-to"
                          invalid={!!mvErr.toLocation}
                          value={movForm.toLocation}
                          onChange={(e) => setMovForm({ ...movForm, toLocation: e.target.value })}
                        />
                      </FormField>
                    </div>
                  </>
                ) : null}
                {movForm.kind === 'entry' ? (
                  <>
                    <div className="col-12 col-md-4 mt-1">
                      <FormField error={mvErr.finance}>
                        <AppCheckbox
                          id="mv-fin"
                          disabled={!financeAccounts.length}
                          title={!financeAccounts.length ? t('inventory.noFinanceAccounts') : undefined}
                          checked={movForm.createFinanceExpense}
                          onChange={(e) => {
                            if (!financeAccounts.length) return
                            setMovForm({ ...movForm, createFinanceExpense: e.target.checked })
                          }}
                          label={flText(FL.inventoryLinkPurchaseExpense, lng)}
                          size="sm"
                        />
                      </FormField>
                    </div>
                    {movForm.createFinanceExpense ? (
                      <>
                        <div className="col-12 col-md-4">
                          <FormField k="inventoryPurchaseTotalCost" htmlFor="mv-cost" labelClassName="small mb-0" error={mvErr.purchaseCost}>
                            <AppInput
                              id="mv-cost"
                              type="number"
                              min={0}
                              step="0.01"
                              latin
                              invalid={!!mvErr.purchaseCost}
                              value={movForm.totalPurchaseCost}
                              onChange={(e) => setMovForm({ ...movForm, totalPurchaseCost: e.target.value })}
                            />
                          </FormField>
                        </div>
                        <div className="col-12 col-md-4">
                          <FormField k="inventoryPurchaseExpenseCategory" htmlFor="mv-excat" labelClassName="small mb-0">
                            <AppSelect
                              id="mv-excat"
                              value={movForm.purchaseExpenseCategory}
                              onChange={(e) => setMovForm({ ...movForm, purchaseExpenseCategory: e.target.value })}
                            >
                              {EXPENSE_CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                  {t(`finance.expenseCat.${c}`)}
                                </option>
                              ))}
                            </AppSelect>
                          </FormField>
                        </div>
                        <div className="col-12 col-md-4">
                          <FormField k="inventoryPurchaseFundSource" htmlFor="mv-fund" labelClassName="small mb-0">
                            <AppSelect
                              id="mv-fund"
                              value={movForm.purchaseFundSource}
                              onChange={(e) => setMovForm({ ...movForm, purchaseFundSource: e.target.value })}
                            >
                              {FUND_SOURCES.map((fs) => (
                                <option key={fs} value={fs}>
                                  {t(`finance.fundSource.${fs}`)}
                                </option>
                              ))}
                            </AppSelect>
                          </FormField>
                        </div>
                        <div className="col-12 col-md-4">
                          <FormField k="inventoryFinanceAccount" htmlFor="mv-acc" labelClassName="small mb-0" error={mvErr.purchaseAccount}>
                            {financeAccounts.length ? (
                              <AppSelect
                                id="mv-acc"
                                invalid={!!mvErr.purchaseAccount}
                                value={movForm.purchaseAccountId}
                                onChange={(e) => setMovForm({ ...movForm, purchaseAccountId: e.target.value })}
                              >
                                <option value="">{t('inventory.pickFinanceAccount')}</option>
                                {financeAccounts.map((acc) => (
                                  <option key={acc._id} value={acc._id}>
                                    {loc(acc.name, lng) || acc._id}
                                  </option>
                                ))}
                              </AppSelect>
                            ) : (
                              <div className="small text-danger">{t('inventory.noFinanceAccounts')}</div>
                            )}
                          </FormField>
                        </div>
                      </>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
            <div className="modal-app-footer d-flex flex-wrap gap-2 justify-content-end">
              <AppButton type="button" variant="secondary" onClick={() => { setMovModalOpen(false); resetMovForm() }}>
                {t('common.cancel')}
              </AppButton>
              <AppButton type="submit" variant="primary" disabled={movSaving || !movementValidation.valid}>
                {t('common.save')}
              </AppButton>
            </div>
          </form>
        </AppModalShell>
      ) : null}

      {itemModalOpen ? (
        <AppModalShell
          title={itemForm.id ? t('inventory.editItem') : t('inventory.addItem')}
          onClose={closeItemModal}
          size="lg"
          dir={isUr ? 'rtl' : 'ltr'}
          dialogClassName="inv-dash__modal-dialog"
        >
          <form className="modal-app-form" onSubmit={submitItem}>
            <div className="modal-app-body">
              <div className="row g-3">
                <div className="col-12 col-md-4">
                  <FormField k="nameUrField" htmlFor="it-nu" langField="ur">
                    <AppInput id="it-nu" value={itemForm.name.ur} onChange={(e) => setItemForm({ ...itemForm, name: { ...itemForm.name, ur: e.target.value } })} />
                  </FormField>
                </div>
                <div className="col-12 col-md-4">
                  <FormField k="nameEnField" htmlFor="it-ne" langField="en">
                    <AppInput id="it-ne" value={itemForm.name.en} onChange={(e) => setItemForm({ ...itemForm, name: { ...itemForm.name, en: e.target.value } })} />
                  </FormField>
                </div>
                <div className="col-12 col-md-4">
                  <FormField k="inventoryCategory" htmlFor="it-cat" labelClassName="small text-secondary">
                    <AppSelect
                      id="it-cat"
                      value={itemForm.category}
                      onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                    >
                      {INV_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {t(`inventory.category.${c}`)}
                        </option>
                      ))}
                    </AppSelect>
                  </FormField>
                </div>
                <div className="col-12 col-md-4">
                  <FormField k="inventoryQty" htmlFor="it-q">
                    <AppInput
                      id="it-q"
                      type="number"
                      latin
                      value={itemForm.quantity}
                      onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
                    />
                  </FormField>
                </div>
                <div className="col-12 col-md-4">
                  <FormField k="inventoryUnitField" htmlFor="it-unit" labelClassName="small text-secondary">
                    <AppSelect
                      id="it-unit"
                      value={itemForm.unit}
                      onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                    >
                      {INV_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {t(`inventory.unit.${u}`)}
                        </option>
                      ))}
                    </AppSelect>
                  </FormField>
                </div>
                <div className="col-12 col-md-4">
                  <FormField k="inventoryUnitPrice" htmlFor="it-p">
                    <AppInput id="it-p" type="number" min={0} step="0.01" latin value={itemForm.unitPrice} onChange={(e) => setItemForm({ ...itemForm, unitPrice: e.target.value })} />
                  </FormField>
                </div>
                <div className="col-12 col-md-4">
                  <FormField k="inventoryLineValue" htmlFor="it-lv">
                    <AppInput id="it-lv" readOnly className="bg-light" latin value={linePreview} />
                  </FormField>
                </div>
                <div className="col-12 col-md-4">
                  <FormField k="inventoryMinStock" htmlFor="it-min">
                    <AppInput id="it-min" type="number" min={0} latin value={itemForm.minStockLevel} onChange={(e) => setItemForm({ ...itemForm, minStockLevel: e.target.value })} />
                  </FormField>
                </div>
                <div className="col-12 col-md-4">
                  <FormField k="inventoryPurchaseDate" htmlFor="it-pd">
                    <AppDateInput id="it-pd" lng={lng} value={itemForm.purchaseDate} onChange={(v) => setItemForm({ ...itemForm, purchaseDate: v })} />
                  </FormField>
                </div>
                <div className="col-12 col-md-4">
                  <FormField k="inventorySupplierUr" htmlFor="it-su" langField="ur">
                    <AppInput id="it-su" value={itemForm.supplier.ur} onChange={(e) => setItemForm({ ...itemForm, supplier: { ...itemForm.supplier, ur: e.target.value } })} />
                  </FormField>
                </div>
                <div className="col-12 col-md-4">
                  <FormField k="inventorySupplierEn" htmlFor="it-se" langField="en">
                    <AppInput id="it-se" value={itemForm.supplier.en} onChange={(e) => setItemForm({ ...itemForm, supplier: { ...itemForm.supplier, en: e.target.value } })} />
                  </FormField>
                </div>
                <div className="col-12 col-md-4">
                  <FormField k="inventoryExpiryDate" htmlFor="it-ex">
                    <AppDateInput id="it-ex" lng={lng} value={itemForm.expiryDate} onChange={(v) => setItemForm({ ...itemForm, expiryDate: v })} />
                  </FormField>
                </div>
                <div className="col-12 col-md-4">
                  <FormField k="inventoryLocation" htmlFor="it-loc">
                    <AppInput id="it-loc" value={itemForm.location} onChange={(e) => setItemForm({ ...itemForm, location: e.target.value })} />
                  </FormField>
                </div>
                <div className="col-12 col-md-4">
                  <FormField k="inventoryBarcode" htmlFor="it-bc">
                    <AppInput id="it-bc" latin value={itemForm.barcode} onChange={(e) => setItemForm({ ...itemForm, barcode: e.target.value })} />
                  </FormField>
                </div>
                <div className="col-12 col-md-4">
                  <FormField k="notes" htmlFor="it-no">
                    <AppInput id="it-no" value={itemForm.notes} onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })} />
                  </FormField>
                </div>
                {!itemForm.id ? (
                  <div className="col-12">
                    <FormField label={t('inventory.receipt')} htmlFor="it-receipt" labelClassName="small text-secondary">
                      <AppFileInput
                        id="it-receipt"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        valueName={receiptFile?.name}
                        onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                      />
                    </FormField>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="modal-app-footer d-flex flex-wrap gap-2 justify-content-end">
              <AppButton type="button" variant="secondary" onClick={closeItemModal}>
                {t('common.cancel')}
              </AppButton>
              <AppButton type="submit" variant="success" disabled={creating || updating}>
                {t('common.save')}
              </AppButton>
            </div>
          </form>
        </AppModalShell>
      ) : null}

      <ConfirmDeleteModal
        open={!!deleteInvTarget}
        title={t('inventory.modalDeleteItemTitle')}
        message={deleteInvTarget ? t('inventory.modalDeleteItemBody', { name: deleteInvTarget.name }) : ''}
        onClose={() => setDeleteInvTarget(null)}
        onConfirm={async () => {
          await deleteItemMut(deleteInvTarget.id).unwrap()
          if (itemForm.id === deleteInvTarget.id) closeItemModal()
        }}
      />
    </div>
  )
}
