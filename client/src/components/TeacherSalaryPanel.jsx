import { useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import {
  useGetTeacherSalariesQuery,
  useGetTeacherSalariesOverviewQuery,
  useCreateTeacherSalaryMutation,
  useUpdateTeacherSalaryMutation,
  useDeleteTeacherSalaryMutation,
  usePayTeacherSalarySlipMutation,
  useGetFinanceAccountsQuery,
} from '../services/api'
import { loc } from '../shared/localized'
import { formatDisplayDate, toInputDate } from '../shared/formatDisplayDate'
import { useCalendarMode } from '../app/calendarMode'
import DataTable from './DataTable'
import AppModalShell from './AppModalShell'
import ConfirmDeleteModal from './ConfirmDeleteModal'
import { AppInput, AppSelect, AppTextarea, FormField } from './ui'
import { BtnIconLabel, IconPlus, IconPencil, IconTrash, IconPrint } from './ListToolbarIcons'
import { useFlash } from '../app/flash.jsx'
import { useFormValidation } from '../shared/validation'
import { salaryFormSchema } from '../shared/validation/formSchemas'

const SALARY_FIELD_IDS = { basicSalary: 'sal-basic', toDate: 'sal-to' }

function num(v) {
  const n = parseFloat(String(v).replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}

function formatMoney(n) {
  if (n == null || Number.isNaN(n)) return '—'
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n)
}

function isoToInputDate(iso) {
  return toInputDate(iso)
}

function openSalaryInvoicePrint(salary, teacherName, rtl, lng, calendarMode) {
  const dir = rtl ? 'rtl' : 'ltr'
  const rows = [
    ['Invoice / رسید', salary.invoiceNumber || '—'],
    ['Basic / بنیادی', formatMoney(salary.basicSalary)],
    ['Gross / کل', formatMoney(salary.totalSalary)],
    ['Deductions / کٹوتی', formatMoney(salary.totalDeduction)],
    ['Net / خالص', formatMoney(salary.netSalary)],
    ['Period / مدت', `${formatDisplayDate(salary.fromDate, lng, calendarMode)} – ${formatDisplayDate(salary.toDate, lng, calendarMode)}`],
    ['Payment / ادائیگی', salary.paymentStatus === 'paid' ? (rtl ? 'ادا شدہ' : 'Paid') : rtl ? 'واجب' : 'Due'],
  ]
  const bodyRows = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:600">${k}</td><td style="padding:8px;border:1px solid #e2e8f0">${String(v)}</td></tr>`
    )
    .join('')
  const html = `<!DOCTYPE html><html dir="${dir}"><head><meta charset="utf-8"/><title>Salary slip</title>
    <style>body{font-family:system-ui,sans-serif;padding:24px;max-width:640px;margin:0 auto;color:#0f172a} h1{font-size:1.25rem;margin:0 0 12px} .sub{color:#64748b;font-size:0.9rem;margin-bottom:20px}</style></head><body>
    <h1>${rtl ? 'تنخواہ کی رسید' : 'Salary slip'}</h1>
    <p class="sub"><strong>${rtl ? 'استاد' : 'Teacher'}:</strong> ${teacherName}</p>
    <table style="width:100%;border-collapse:collapse">${bodyRows}</table>
    </body></html>`
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 250)
}

function emptyForm() {
  return {
    basicSalary: '',
    houseAllowance: '',
    medicalAllowance: '',
    transportAllowance: '',
    otherAllowances: '',
    taxDeduction: '',
    otherDeductions: '',
    fromDate: '',
    toDate: '',
    status: 'active',
    notes: '',
    paymentStatus: 'pending',
    invoiceNumber: '',
  }
}

function mapRowToForm(row) {
  return {
    basicSalary: row.basicSalary ?? '',
    houseAllowance: row.houseAllowance ?? '',
    medicalAllowance: row.medicalAllowance ?? '',
    transportAllowance: row.transportAllowance ?? '',
    otherAllowances: row.otherAllowances ?? '',
    taxDeduction: row.taxDeduction ?? '',
    otherDeductions: row.otherDeductions ?? '',
    fromDate: isoToInputDate(row.fromDate),
    toDate: isoToInputDate(row.toDate),
    status: row.status || 'active',
    notes: row.notes || '',
    paymentStatus: row.paymentStatus === 'paid' ? 'paid' : 'pending',
    invoiceNumber: row.invoiceNumber || '',
  }
}

export default function TeacherSalaryPanel({ teachers, lng, fixedTeacherId, embedded }) {
  const { t } = useTranslation()
  const { showFlash } = useFlash()
  const activeSessionId = useSelector((s) => s.session.activeSessionId)
  const { data: financeAccounts = [] } = useGetFinanceAccountsQuery()
  const [paySlip, { isLoading: payingSlip }] = usePayTeacherSalarySlipMutation()
  const en = lng?.toLowerCase().startsWith('en')
  const { mode } = useCalendarMode()
  const [teacherId, setTeacherId] = useState(() => (fixedTeacherId ? String(fixedTeacherId) : ''))
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [salaryDeleteTarget, setSalaryDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)

  const {
    errors: fieldErrors,
    setErrors: setFieldErrors,
    onBlurField,
    revalidateIfError,
    validateAll,
    focusInvalid,
  } = useFormValidation({
    schema: salaryFormSchema,
    t,
    fieldIds: SALARY_FIELD_IDS,
    order: ['basicSalary', 'toDate'],
  })

  const { data: salaries = [], isLoading } = useGetTeacherSalariesQuery(teacherId, {
    skip: !teacherId,
  })
  const { data: salaryOverview } = useGetTeacherSalariesOverviewQuery()
  const [createSalary] = useCreateTeacherSalaryMutation()
  const [updateSalary] = useUpdateTeacherSalaryMutation()
  const [deleteSalary] = useDeleteTeacherSalaryMutation()

  const totalsPreview = useMemo(() => {
    const basic = num(form.basicSalary)
    const add =
      num(form.houseAllowance) +
      num(form.medicalAllowance) +
      num(form.transportAllowance) +
      num(form.otherAllowances)
    const totalSalary = basic + add
    const totalDeduction = num(form.taxDeduction) + num(form.otherDeductions)
    const netSalary = totalSalary - totalDeduction
    return { totalSalary, totalDeduction, netSalary }
  }, [form])

  const salaryPrintPayload = () => {
    const row = editingId ? salaries.find((s) => s._id === editingId) : null
    const basic = num(form.basicSalary)
    return {
      invoiceNumber: form.invoiceNumber || row?.invoiceNumber || '',
      basicSalary: basic || row?.basicSalary || 0,
      totalSalary: totalsPreview.totalSalary,
      totalDeduction: totalsPreview.totalDeduction,
      netSalary: totalsPreview.netSalary,
      fromDate: form.fromDate ? new Date(`${form.fromDate}T12:00:00`).toISOString() : row?.fromDate,
      toDate: form.toDate ? new Date(`${form.toDate}T12:00:00`).toISOString() : row?.toDate,
      paymentStatus: form.paymentStatus,
    }
  }

  const teacherDisplayName = useMemo(() => {
    const te = teachers.find((x) => String(x._id) === String(teacherId || ''))
    return te ? loc(te.name, lng) : ''
  }, [teachers, teacherId, lng])

  useEffect(() => {
    if (!modal) {
      setForm(emptyForm())
      setEditingId(null)
      setFieldErrors({})
    }
  }, [modal, setFieldErrors])

  useEffect(() => {
    if (fixedTeacherId) setTeacherId(String(fixedTeacherId))
  }, [fixedTeacherId])

  function openNew() {
    if (!teacherId) return
    setEditingId(null)
    setForm(emptyForm())
    setFieldErrors({})
    setModal('edit')
  }

  function openEdit(row) {
    setEditingId(row._id)
    setForm(mapRowToForm(row))
    setFieldErrors({})
    setModal('edit')
  }

  async function save(e) {
    e.preventDefault()
    if (!teacherId) return
    const nextErrors = validateAll(form)
    if (Object.keys(nextErrors).length) {
      focusInvalid(nextErrors)
      return
    }
    const payload = {
      teacherId,
      basicSalary: num(form.basicSalary),
      houseAllowance: num(form.houseAllowance),
      medicalAllowance: num(form.medicalAllowance),
      transportAllowance: num(form.transportAllowance),
      otherAllowances: num(form.otherAllowances),
      taxDeduction: num(form.taxDeduction),
      otherDeductions: num(form.otherDeductions),
      fromDate: form.fromDate ? new Date(form.fromDate + 'T12:00:00') : null,
      toDate: form.toDate ? new Date(form.toDate + 'T12:00:00') : null,
      status: form.status,
      notes: form.notes?.trim() || '',
      paymentStatus: form.paymentStatus,
    }
    setSaving(true)
    try {
      if (editingId) await updateSalary({ id: editingId, ...payload }).unwrap()
      else await createSalary(payload).unwrap()
      setModal(null)
    } catch (err) {
      showFlash(err?.data?.message || err?.error || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const L = {
    title: en ? 'Teacher salary system' : 'اساتذہ کی تنخواہ کا نظام',
    pickTeacher: en ? 'Select teacher' : 'استاد منتخب کریں',
    pickPlaceholder: en ? '— Select teacher —' : '-- استاد منتخب کریں --',
    add: en ? 'Add salary' : 'نئی تنخواہ شامل کریں',
    emptyNeedTeacher: en ? 'Please select a teacher' : 'براہ کرم استاد منتخب کریں',
    emptyNoRows: en ? 'No salary records for this teacher.' : 'اس استاد کی کوئی تنخواہ کا اندراج نہیں۔',
    basic: en ? 'Basic salary' : 'بنیادی تنخواہ',
    house: en ? 'House allowance' : 'گھر کا الاؤنس',
    medical: en ? 'Medical allowance' : 'طبی الاؤنس',
    transport: en ? 'Transport allowance' : 'ٹرانسپورٹ الاؤنس',
    otherAllow: en ? 'Other allowances' : 'دیگر الاؤنسز',
    tax: en ? 'Tax deduction' : 'ٹیکس کٹوتی',
    otherDed: en ? 'Other deductions' : 'دیگر کٹوتیاں',
    totalSal: en ? 'Total salary' : 'کل تنخواہ',
    totalDed: en ? 'Total deduction' : 'کل کٹوتی',
    net: en ? 'Net salary' : 'خالص تنخواہ',
    from: en ? 'From date' : 'از تاریخ',
    to: en ? 'To date' : 'تا تاریخ',
    status: en ? 'Status' : 'حالت',
    notes: en ? 'Notes' : 'نوٹس',
    active: en ? 'Active' : 'فعال',
    inactive: en ? 'Inactive' : 'غیر فعال',
    modalTitle: en ? 'Salary entry' : 'تنخواہ کا اندراج',
    save: en ? 'Save' : 'محفوظ کریں',
    close: en ? 'Close' : 'بند کریں',
    invoice: en ? 'Invoice no.' : 'رسید نمبر',
    payment: en ? 'Payment' : 'ادائیگی',
    payPending: en ? 'Due' : 'واجب',
    payPaid: en ? 'Paid' : 'ادا شدہ',
    markPaid: en ? 'Pay & post expense' : 'ادائیگی اور خرچ',
    printSlip: en ? 'Print slip' : 'رسید پرنٹ',
    dashDue: en ? 'Due slips (all teachers)' : 'واجب سلپ (تمام)',
    dashPaid: en ? 'Paid slips' : 'ادا شدہ سلپ',
    dashNetDue: en ? 'Net still due' : 'کل واجب خالص',
    dashNetPaid: en ? 'Net paid (recorded)' : 'کل ادا شدہ خالص',
    dashRecords: en ? 'Total salary records' : 'کل تنخواہ کے اندراج',
  }

  const columns = [
    { key: 'i', headerKey: 'hashSerial', numeric: true, cell: (_r, i) => i + 1 },
    {
      key: 'basic',
      headerKey: 'salaryBasic',
      numeric: true,
      cell: (r) => formatMoney(r.basicSalary),
    },
    {
      key: 'total',
      headerKey: 'salaryTotalGross',
      numeric: true,
      cell: (r) => formatMoney(r.totalSalary),
    },
    {
      key: 'ded',
      headerKey: 'salaryDeduction',
      numeric: true,
      cell: (r) => formatMoney(r.totalDeduction),
    },
    {
      key: 'net',
      headerKey: 'salaryNet',
      numeric: true,
      cell: (r) => formatMoney(r.netSalary),
    },
    {
      key: 'inv',
      headerKey: 'salaryInvoice',
      cell: (r) => <span className="font-monospace small">{r.invoiceNumber || '—'}</span>,
    },
    {
      key: 'pay',
      headerKey: 'salaryPayment',
      cell: (r) =>
        r.paymentStatus === 'paid' ? (
          <span className="badge bg-success">{L.payPaid}</span>
        ) : (
          <span className="badge bg-warning text-dark">{L.payPending}</span>
        ),
    },
    {
      key: 'from',
      headerKey: 'salaryFrom',
      cell: (r) => formatDisplayDate(r.fromDate, lng, mode),
    },
    {
      key: 'to',
      headerKey: 'salaryTo',
      cell: (r) => formatDisplayDate(r.toDate, lng, mode),
    },
    { key: 'st', headerKey: 'salaryStatusLabel', cell: (r) => r.status },
    {
      key: 'actions',
      headerKey: 'actions',
      hidePrint: true,
      cell: (r) => (
        <div className="data-table__actions">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => openSalaryInvoicePrint(r, teacherDisplayName, !en, lng, mode)}
          >
            <BtnIconLabel icon={<IconPrint />}>{L.printSlip}</BtnIconLabel>
          </button>
          {r.paymentStatus !== 'paid' ? (
            <button
              type="button"
              className="btn btn-sm btn-outline-success"
              disabled={payingSlip || !financeAccounts[0]?._id}
              title={!financeAccounts[0]?._id ? (en ? 'Add a finance account first' : 'پہلے مالی کھاتہ بنائیں') : undefined}
              onClick={async () => {
                const acc = financeAccounts[0]?._id
                if (!acc) {
                  showFlash(en ? 'Create a cash/bank account under Finance first.' : 'پہلے آمد و خرچ میں کھاتہ بنائیں۔')
                  return
                }
                try {
                  await paySlip({
                    id: r._id,
                    body: {
                      accountId: String(acc),
                      ...(activeSessionId ? { sessionId: String(activeSessionId) } : {}),
                      paymentMethod: 'cash',
                    },
                  }).unwrap()
                } catch (err) {
                  showFlash(err?.data?.message || err?.error || 'Failed')
                }
              }}
            >
              {L.markPaid}
            </button>
          ) : null}
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openEdit(r)}>
            <BtnIconLabel icon={<IconPencil />}>{en ? 'Edit' : 'ترمیم'}</BtnIconLabel>
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() =>
              setSalaryDeleteTarget({
                id: r._id,
                name: [teacherDisplayName, r.invoiceNumber, formatMoney(r.netSalary)].filter(Boolean).join(' — ') || '—',
              })
            }
          >
            <BtnIconLabel icon={<IconTrash />}>{en ? 'Delete' : 'حذف'}</BtnIconLabel>
          </button>
        </div>
      ),
    },
  ]

  const fixedTeacherRow = fixedTeacherId ? teachers.find((te) => String(te._id) === String(fixedTeacherId)) : null

  const panelWrapClass = embedded
    ? 'teacher-salary-panel teacher-salary-panel--embedded'
    : 'teacher-salary-panel content-panel p-0 overflow-hidden mb-4'

  const toolbarRow = (
    <div className="d-flex flex-wrap gap-2 align-items-end w-100">
      <div className="teacher-salary-panel__pick flex-grow-1 min-w-0">
        {fixedTeacherId ? (
          <>
            <span className="page-toolbar__label d-block">{L.pickTeacher}</span>
            <div
              className="mt-1 rounded-3 border px-3 py-2 bg-light mb-0 fw-semibold teacher-salary-panel__pick-readonly"
              lang={en ? 'en' : 'ur'}
            >
              {fixedTeacherRow ? loc(fixedTeacherRow.name, lng) : fixedTeacherId}
            </div>
          </>
        ) : (
          <>
            <label className="page-toolbar__label d-block" htmlFor="salary-teacher-pick">
              {L.pickTeacher}
            </label>
            <AppSelect
              id="salary-teacher-pick"
              className="w-100 mt-1"
             
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
            >
              <option value="">{L.pickPlaceholder}</option>
              {teachers.map((te) => (
                <option key={te._id} value={te._id}>
                  {loc(te.name, lng)}
                </option>
              ))}
            </AppSelect>
          </>
        )}
      </div>
      <button
        type="button"
        className="btn btn-sm btn-outline-success flex-shrink-0"
        disabled={!teacherId}
        onClick={openNew}
      >
        <BtnIconLabel icon={<IconPlus />}>{L.add}</BtnIconLabel>
      </button>
    </div>
  )

  const ov = salaryOverview || {}
  const salaryDash = (
    <div className="row g-3 mb-3">
      <div className="col-md-4">
        <div className="stat-card h-100 p-3">
          <div className="small text-secondary mb-2 fw-semibold" lang={en ? 'en' : 'ur'}>
            {L.dashDue}
          </div>
          <div className="h5 mb-1 table-num">{ov.pendingCount ?? 0}</div>
          <div className="small text-muted">
            {L.dashNetDue}: {formatMoney(ov.totalNetPending ?? 0)}
          </div>
        </div>
      </div>
      <div className="col-md-4">
        <div className="stat-card h-100 p-3">
          <div className="small text-secondary mb-2 fw-semibold" lang={en ? 'en' : 'ur'}>
            {L.dashPaid}
          </div>
          <div className="h5 mb-1 table-num">{ov.paidCount ?? 0}</div>
          <div className="small text-muted">
            {L.dashNetPaid}: {formatMoney(ov.totalNetPaid ?? 0)}
          </div>
        </div>
      </div>
      <div className="col-md-4">
        <div className="stat-card h-100 p-3">
          <div className="small text-secondary mb-2 fw-semibold" lang={en ? 'en' : 'ur'}>
            {L.dashRecords}
          </div>
          <div className="h5 mb-0 table-num">{ov.totalRecords ?? 0}</div>
        </div>
      </div>
    </div>
  )

  const mainBody = (
    <>
      {salaryDash}
      {!teacherId ? (
        <p className="text-center text-muted py-5 mb-0">{L.emptyNeedTeacher}</p>
      ) : (
        <DataTable
          columns={columns}
          rows={salaries}
          getRowKey={(row) => row._id}
          isLoading={isLoading}
          loadingText={en ? 'Loading…' : 'لوڈ ہو رہا ہے…'}
          emptyText={!teacherId ? L.emptyNeedTeacher : L.emptyNoRows}
        />
      )}
    </>
  )

  return (
    <div className={panelWrapClass}>
      {embedded ? (
        <>
          <div className="page-toolbar page-toolbar--strip page-toolbar--embedded page-toolbar--list-page">
            <div className="page-toolbar__head min-w-0">
              <h2 className="content-panel-head__title" lang={en ? 'en' : 'ur'}>
                {L.title}
              </h2>
            </div>
            <div className="page-toolbar__filters-wrap min-w-0">{toolbarRow}</div>
          </div>
          {mainBody}
        </>
      ) : (
        <>
          <div className="page-toolbar page-toolbar--strip page-toolbar--panel-top page-toolbar--list-page">
            <div className="page-toolbar__head min-w-0">
              <h2 className="content-panel-head__title" lang={en ? 'en' : 'ur'}>
                {L.title}
              </h2>
            </div>
            <div className="page-toolbar__filters-wrap min-w-0">{toolbarRow}</div>
          </div>
          <div className="content-panel__body p-3 p-md-4">{mainBody}</div>
        </>
      )}

      {modal === 'edit' ? (
        <AppModalShell title={L.modalTitle} onClose={() => setModal(null)} size="lg">
          <form className="modal-app-form" onSubmit={save}>
            <div className="modal-app-body">
              <div className="row g-2">
                <div className="col-md-4">
                  <FormField label={L.basic} htmlFor="sal-basic" required error={fieldErrors.basicSalary}>
                    <AppInput
                      id="sal-basic"
                      type="number"
                      min={0}
                      step={1}
                      value={form.basicSalary}
                      onChange={(e) => {
                        const next = { ...form, basicSalary: e.target.value }
                        setForm(next)
                        revalidateIfError('basicSalary', next)
                      }}
                      onBlur={() => onBlurField('basicSalary', form)}
                    />
                  </FormField>
                </div>
                <div className="col-md-4">
                  <label className="form-label">{L.house}</label>
                  <AppInput
                    type="number"
                    min={0}
                    step={1}
                   
                    value={form.houseAllowance}
                    onChange={(e) => setForm({ ...form, houseAllowance: e.target.value })}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">{L.medical}</label>
                  <AppInput
                    type="number"
                    min={0}
                    step={1}
                   
                    value={form.medicalAllowance}
                    onChange={(e) => setForm({ ...form, medicalAllowance: e.target.value })}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">{L.transport}</label>
                  <AppInput
                    type="number"
                    min={0}
                    step={1}
                   
                    value={form.transportAllowance}
                    onChange={(e) => setForm({ ...form, transportAllowance: e.target.value })}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">{L.otherAllow}</label>
                  <AppInput
                    type="number"
                    min={0}
                    step={1}
                   
                    value={form.otherAllowances}
                    onChange={(e) => setForm({ ...form, otherAllowances: e.target.value })}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">{L.tax}</label>
                  <AppInput
                    type="number"
                    min={0}
                    step={1}
                   
                    value={form.taxDeduction}
                    onChange={(e) => setForm({ ...form, taxDeduction: e.target.value })}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">{L.otherDed}</label>
                  <AppInput
                    type="number"
                    min={0}
                    step={1}
                   
                    value={form.otherDeductions}
                    onChange={(e) => setForm({ ...form, otherDeductions: e.target.value })}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" htmlFor="sal-from">{L.from}</label>
                  <AppInput
                    id="sal-from"
                    type="date"
                    value={form.fromDate}
                    onChange={(e) => {
                      const next = { ...form, fromDate: e.target.value }
                      setForm(next)
                      revalidateIfError('toDate', next)
                    }}
                  />
                </div>
                <div className="col-md-4">
                  <FormField label={L.to} htmlFor="sal-to" error={fieldErrors.toDate}>
                    <AppInput
                      id="sal-to"
                      type="date"
                      value={form.toDate}
                      onChange={(e) => {
                        const next = { ...form, toDate: e.target.value }
                        setForm(next)
                        revalidateIfError('toDate', next)
                      }}
                      onBlur={() => onBlurField('toDate', form)}
                    />
                  </FormField>
                </div>
                <div className="col-md-4">
                  <label className="form-label text-success">{L.totalSal}</label>
                  <AppInput readOnly className="bg-light" value={formatMoney(totalsPreview.totalSalary)} />
                </div>
                <div className="col-md-4">
                  <label className="form-label text-danger">{L.totalDed}</label>
                  <AppInput readOnly className="bg-light" value={formatMoney(totalsPreview.totalDeduction)} />
                </div>
                <div className="col-md-4">
                  <label className="form-label text-primary fw-semibold">{L.net}</label>
                  <AppInput readOnly className="bg-light fw-semibold" value={formatMoney(totalsPreview.netSalary)} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">{L.status}</label>
                  <AppSelect
                   
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="active">{L.active}</option>
                    <option value="inactive">{L.inactive}</option>
                  </AppSelect>
                </div>
                <div className="col-md-4">
                  <label className="form-label">{L.payment}</label>
                  <AppSelect
                   
                    value={form.paymentStatus}
                    onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}
                  >
                    <option value="pending">{L.payPending}</option>
                    <option value="paid">{L.payPaid}</option>
                  </AppSelect>
                </div>
                <div className="col-md-4">
                  <label className="form-label">{L.invoice}</label>
                  <AppInput
                    type="text"
                   
                    readOnly
                    className="bg-light font-monospace"
                    value={form.invoiceNumber || ''}
                    placeholder={en ? 'Assigned on save' : 'محفوظ پر'}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label">{L.notes}</label>
                  <AppTextarea
                   
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="modal-app-footer d-flex flex-wrap gap-2 align-items-center justify-content-between">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => openSalaryInvoicePrint(salaryPrintPayload(), teacherDisplayName, !en)}
              >
                <BtnIconLabel icon={<IconPrint />}>{L.printSlip}</BtnIconLabel>
              </button>
              <div className="d-flex flex-wrap gap-2">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)} disabled={saving}>
                  {L.close}
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? t('validation.formSaving') : L.save}
                </button>
              </div>
            </div>
          </form>
        </AppModalShell>
      ) : null}
      <ConfirmDeleteModal
        open={!!salaryDeleteTarget}
        title={t('common.confirmDeleteTitle')}
        message={salaryDeleteTarget ? t('common.confirmDeleteBody', { name: salaryDeleteTarget.name }) : ''}
        onClose={() => setSalaryDeleteTarget(null)}
        onConfirm={async () => {
          await deleteSalary(salaryDeleteTarget.id).unwrap()
        }}
        dir={en ? 'ltr' : 'rtl'}
      />
    </div>
  )
}
