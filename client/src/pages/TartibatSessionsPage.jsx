import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import { setActiveSessionId } from '../features/session/sessionSlice'
import {
  useGetSessionsQuery,
  useGetSessionSummaryQuery,
  useCreateSessionMutation,
  useUpdateSessionMutation,
  useDeleteSessionMutation,
} from '../services/api'
import DataTable from '../components/DataTable'
import PageHeading from '../components/PageHeading'
import AppModalShell from '../components/AppModalShell'
import AppDateInput from '../components/AppDateInput'
import { formatDisplayDate, toInputDate } from '../shared/formatDisplayDate'
import { useCalendarMode } from '../app/calendarMode'
import {
  AppButton,
  AppCheckbox,
  AppInput,
  FormField,
  FormRow,
  ModalForm,
} from '../components/ui'
import { useFlash } from '../app/flash.jsx'
import { useFormValidation } from '../shared/validation'
import { sessionFormSchema } from '../shared/validation/formSchemas'

const FIELD_IDS = { title: 'ses-title', startDate: 'ses-start', endDate: 'ses-end' }

// ─── Session delete confirmation modal ──────────────────────────────────────

function SessionDeleteModal({ session, onClose, onConfirm, lng }) {
  const { t } = useTranslation()
  const { showFlash } = useFlash()

  // Always fetch fresh counts when the modal opens (never use stale cache)
  const { data: summary, isLoading: summaryLoading } = useGetSessionSummaryQuery(
    session?._id,
    { skip: !session?._id, refetchOnMountOrArgChange: true }
  )

  const [busy, setBusy] = useState(false)

  if (!session) return null

  async function handleConfirm() {
    setBusy(true)
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      showFlash(err?.data?.message || err?.error || t('common.deleteFailed'))
    } finally {
      setBusy(false)
    }
  }

  const isLoading = summaryLoading || !summary

  // Build the list of what will be deleted
  function countRows() {
    if (!summary?.counts) return []
    const { counts } = summary
    const rows = [
      { key: 'students',         label: lng === 'ur' ? 'طلباء'           : 'Students',           count: counts.students },
      { key: 'darajat',          label: lng === 'ur' ? 'درجات / کلاسز'   : 'Classes (Darajat)',   count: counts.darajat },
      { key: 'subjects',         label: lng === 'ur' ? 'مضامین'           : 'Subjects',            count: counts.subjects },
      { key: 'grades',           label: lng === 'ur' ? 'درجات'            : 'Grades',              count: counts.grades },
      { key: 'studentAtt',       label: lng === 'ur' ? 'طلباء حاضری'      : 'Student Attendance',  count: counts.studentAttendance },
      { key: 'teacherAtt',       label: lng === 'ur' ? 'اساتذہ حاضری'     : 'Teacher Attendance',  count: counts.teacherAttendance },
      { key: 'exams',            label: lng === 'ur' ? 'امتحانات'          : 'Exams',               count: counts.exams },
      { key: 'timetable',        label: lng === 'ur' ? 'ٹائم ٹیبل'         : 'Timetable Entries',  count: counts.timetableEntries },
      { key: 'fees',             label: lng === 'ur' ? 'فیس آئٹمز'         : 'Fee Items',           count: counts.feeItems },
    ]
    return rows.filter((r) => r.count > 0)
  }

  const linkedRows = countRows()
  const hasLinkedData = summary?.hasData

  return (
    <AppModalShell
      title={lng === 'ur' ? 'سیشن حذف کریں' : 'Delete Session'}
      onClose={onClose}
      dialogClassName="modal-dialog-centered"
    >
      <div className="modal-app-body">
        {/* Session name */}
        <p className="mb-3">
          <strong>{lng === 'ur' ? 'سیشن:' : 'Session:'}</strong>{' '}
          <span className="text-danger fw-semibold">{session.title}</span>
        </p>

        {isLoading ? (
          <div className="text-center py-3 text-secondary">
            <div className="spinner-border spinner-border-sm me-2" role="status" />
            {lng === 'ur' ? 'جانچ ہو رہی ہے…' : 'Checking linked data…'}
          </div>
        ) : hasLinkedData ? (
          <>
            {/* Warning box */}
            <div
              className="rounded-3 p-3 mb-3 d-flex gap-2"
              style={{ background: '#fef3c7', border: '1px solid #f59e0b' }}
            >
              <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>⚠️</span>
              <div>
                <p className="fw-semibold mb-1" style={{ color: '#92400e' }}>
                  {lng === 'ur'
                    ? 'اس سیشن سے متعلق تمام ڈیٹا بھی مستقل طور پر حذف ہو جائے گا:'
                    : 'All data linked to this session will be permanently deleted:'}
                </p>
                <ul className="mb-0 ps-3" style={{ color: '#78350f' }}>
                  {linkedRows.map((r) => (
                    <li key={r.key}>
                      <strong>{r.count}</strong> {r.label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="text-danger fw-semibold mb-0" style={{ fontSize: '0.875rem' }}>
              {lng === 'ur'
                ? 'یہ عمل واپس نہیں کیا جا سکتا۔'
                : 'This action cannot be undone.'}
            </p>
          </>
        ) : (
          /* No linked data */
          <div
            className="rounded-3 p-3 mb-1 d-flex gap-2 align-items-start"
            style={{ background: '#f0fdf4', border: '1px solid #86efac' }}
          >
            <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>✓</span>
            <p className="mb-0" style={{ color: '#166534' }}>
              {lng === 'ur'
                ? 'اس سیشن سے کوئی ڈیٹا منسلک نہیں ہے۔'
                : 'No data is linked to this session.'}
            </p>
          </div>
        )}
      </div>

      <div className="modal-app-footer d-flex flex-wrap gap-2 justify-content-end">
        <button
          type="button"
          className="btn btn-outline-secondary"
          disabled={busy}
          onClick={onClose}
        >
          {lng === 'ur' ? 'منسوخ' : 'Cancel'}
        </button>
        <button
          type="button"
          className="btn btn-danger"
          disabled={busy || isLoading}
          onClick={handleConfirm}
        >
          {busy ? (
            <>
              <span className="spinner-border spinner-border-sm me-1" role="status" />
              {lng === 'ur' ? 'حذف ہو رہا ہے…' : 'Deleting…'}
            </>
          ) : hasLinkedData ? (
            lng === 'ur' ? 'سب کچھ حذف کریں' : 'Delete Everything'
          ) : (
            lng === 'ur' ? 'حذف کریں' : 'Delete'
          )}
        </button>
      </div>
    </AppModalShell>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function TartibatSessionsPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const { mode } = useCalendarMode()
  const dispatch = useDispatch()
  const { data: sessions = [], isLoading, refetch } = useGetSessionsQuery()
  const [createOne] = useCreateSessionMutation()
  const [updateOne] = useUpdateSessionMutation()
  const [deleteOne] = useDeleteSessionMutation()

  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null) // full session object
  const [form, setForm] = useState({ title: '', startDate: '', endDate: '', isActive: false })
  const [saving, setSaving] = useState(false)

  const schema = useMemo(() => sessionFormSchema, [])
  const {
    errors: fieldErrors,
    onBlurField,
    revalidateIfError,
    validateAll,
    focusInvalid,
    setErrors,
  } = useFormValidation({
    schema,
    t,
    fieldIds: FIELD_IDS,
    order: ['title', 'startDate', 'endDate'],
  })

  function openNew() {
    setEditing(null)
    setForm({ title: '', startDate: '', endDate: '', isActive: sessions.length === 0 })
    setErrors({})
    setModal(true)
  }

  function openEdit(x) {
    setEditing(x)
    setForm({
      title: x.title || '',
      startDate: toInputDate(x.startDate),
      endDate: toInputDate(x.endDate),
      isActive: !!x.isActive,
    })
    setErrors({})
    setModal(true)
  }

  async function save() {
    const next = validateAll(form)
    if (Object.keys(next).length) {
      focusInvalid(next)
      return
    }
    const payload = {
      title: form.title.trim(),
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      isActive: !!form.isActive,
    }
    setSaving(true)
    try {
      if (editing) {
        const updated = await updateOne({ id: editing._id, ...payload }).unwrap()
        if (updated.isActive) dispatch(setActiveSessionId(String(updated._id)))
      } else {
        const created = await createOne(payload).unwrap()
        if (created.isActive) dispatch(setActiveSessionId(String(created._id)))
      }
      setModal(false)
      refetch()
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'title', headerKey: 'sessionTitle', cell: (x) => x.title },
    { key: 'sd', headerKey: 'sessionStart', cell: (x) => formatDisplayDate(x.startDate, lng, mode) },
    { key: 'ed', headerKey: 'sessionEnd', cell: (x) => formatDisplayDate(x.endDate, lng, mode) },
    {
      key: 'act',
      headerKey: 'isActive',
      cell: (x) =>
        x.isActive
          ? (lng === 'ur' ? 'فعال' : 'Active')
          : (lng === 'ur' ? 'غیر فعال' : 'Inactive'),
    },
    {
      key: 'actions',
      headerKey: 'actions',
      hidePrint: true,
      cell: (x) => (
        <div className="data-table__actions">
          <AppButton type="button" variant="outline-primary" size="sm" onClick={() => openEdit(x)}>
            {t('common.edit')}
          </AppButton>
          <AppButton
            type="button"
            variant="outline-danger"
            size="sm"
            onClick={() => setDeleteTarget(x)}
          >
            {t('common.delete')}
          </AppButton>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeading navKey="navTartibatSessions">
        <AppButton type="button" variant="success" size="sm" className="no-print" onClick={openNew}>
          {t('common.add')}
        </AppButton>
      </PageHeading>

      <DataTable
        columns={columns}
        rows={sessions}
        getRowKey={(row) => row._id}
        isLoading={isLoading}
        loadingText={t('common.loading')}
        emptyText={t('common.noRecords')}
      />

      {/* Add / Edit session modal */}
      <ModalForm
        open={modal}
        title={editing ? t('common.edit') : t('common.add')}
        onClose={() => setModal(false)}
        onSubmit={save}
        saving={saving}
      >
        <FormField k="sessionTitle" htmlFor="ses-title" required className="mb-2" error={fieldErrors.title}>
          <AppInput
            id="ses-title"
            latin
            value={form.title}
            onChange={(e) => {
              const next = { ...form, title: e.target.value }
              setForm(next)
              revalidateIfError('title', next)
            }}
            onBlur={() => onBlurField('title', form)}
            placeholder={lng === 'ur' ? 'مثال: 2025–2026' : 'Example: 2025–2026'}
          />
        </FormField>

        <FormRow className="app-form-row--2">
          <FormField k="sessionStart" htmlFor="ses-start" col={6} error={fieldErrors.startDate}>
            <AppDateInput
              id="ses-start"
              lng={lng}
              value={form.startDate}
              onChange={(v) => {
                const next = { ...form, startDate: v }
                setForm(next)
                revalidateIfError('endDate', next)
              }}
              onBlur={() => onBlurField('startDate', form)}
            />
          </FormField>
          <FormField k="sessionEnd" htmlFor="ses-end" col={6} error={fieldErrors.endDate}>
            <AppDateInput
              id="ses-end"
              lng={lng}
              value={form.endDate}
              onChange={(v) => {
                const next = { ...form, endDate: v }
                setForm(next)
                revalidateIfError('endDate', next)
              }}
              onBlur={() => onBlurField('endDate', form)}
            />
          </FormField>
        </FormRow>
        <div className="mb-2">
          <AppCheckbox
            id="ses-active"
            checked={form.isActive}
            onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
            label={lng === 'ur' ? 'فعال سیشن' : 'Active session'}
            size="sm"
            className="mb-0"
          />
        </div>

        <p className="small text-secondary mb-0 mt-1">
          {lng === 'ur'
            ? 'ایک وقت میں صرف ایک سیشن فعال ہو سکتا ہے'
            : 'Only one session can be active at a time'}
        </p>
      </ModalForm>

      {/* Enhanced delete confirmation with linked-data summary */}
      {deleteTarget && (
        <SessionDeleteModal
          session={deleteTarget}
          lng={lng}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            await deleteOne(deleteTarget._id).unwrap()
            refetch()
          }}
        />
      )}
    </div>
  )
}
