import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useGetSessionsQuery,
  useGetDarajatQuery,
  useGetTeachersQuery,
  useGetSubjectsQuery,
  useGetSubjectBooksQuery,
  useGetTimeSlotsQuery,
  useCreateTimeSlotMutation,
  useUpdateTimeSlotMutation,
  useDeleteTimeSlotMutation,
  useGetTimetableEntriesQuery,
  useCreateTimetableEntryMutation,
  useUpdateTimetableEntryMutation,
  useDeleteTimetableEntryMutation,
} from '../services/api'
import { loc } from '../shared/localized'
import { AppInput, AppSelect, AppCheckbox, FormField } from '../components/ui'
import PageHeading from '../components/PageHeading'
import AppModalShell from '../components/AppModalShell'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import { useFormValidation, required } from '../shared/validation'

/** Madrassa week: Saturday → Thursday; Friday is optional via toolbar toggle. */
const CORE_DAYS = [
  { id: 'sat', ur: 'ہفتہ', en: 'Sat' },
  { id: 'sun', ur: 'اتوار', en: 'Sun' },
  { id: 'mon', ur: 'پیر', en: 'Mon' },
  { id: 'tue', ur: 'منگل', en: 'Tue' },
  { id: 'wed', ur: 'بدھ', en: 'Wed' },
  { id: 'thu', ur: 'جمعرات', en: 'Thu' },
]
const FRIDAY = { id: 'fri', ur: 'جمعہ', en: 'Fri' }
const DAYS = [...CORE_DAYS, FRIDAY]

function timeLabel(slot) {
  const l = slot.label ? ` — ${slot.label}` : ''
  return `${slot.startTime}–${slot.endTime}${l}`
}

function isBreakSlot(slot) {
  if (!slot) return false
  if (slot.isBreak === true) return true
  const lb = (slot.label || '').trim().toLowerCase()
  return lb.includes('break') || lb.includes('lunch') || lb.includes('راحت') || lb.includes('کھانا') || lb.includes('وقفہ')
}

function timeToMinutes(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim())
  if (!m) return NaN
  return Number(m[1]) * 60 + Number(m[2])
}

const ENTRY_FIELD_IDS = {
  subjectId: 'tt-sub',
  darjahId: 'tt-dj',
  day: 'tt-day',
  slotId: 'tt-slot',
  teacherId: 'tt-teach',
}

const entryFormSchema = {
  subjectId: required('validation.selectRequired'),
  darjahId: required('validation.selectRequired'),
  day: required('validation.selectRequired'),
  slotId: required('validation.selectRequired'),
  teacherId: required('validation.selectRequired'),
}

const SLOT_FIELD_IDS = { startTime: 'tt-slot-start', endTime: 'tt-slot-end' }

const slotFormSchema = {
  startTime: required('validation.required'),
  endTime: (value, values, t) => {
    if (!value) return t('validation.required')
    const a = timeToMinutes(values.startTime)
    const b = timeToMinutes(value)
    if (Number.isNaN(a) || Number.isNaN(b)) return t('validation.dateInvalid')
    return b <= a ? t('validation.dateBefore') : ''
  },
}

export default function TartibatTimetablePage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language

  const { data: sessions = [] } = useGetSessionsQuery()
  const [sessionId, setSessionId] = useState('')
  const [darjahFilter, setDarjahFilter] = useState('')
  const [showFriday, setShowFriday] = useState(false)
  const [search, setSearch] = useState('')

  const { data: darajat = [] } = useGetDarajatQuery(sessionId ? { sessionId } : undefined, { skip: !sessionId })
  const { data: teachers = [] } = useGetTeachersQuery()
  const { data: subjects = [] } = useGetSubjectsQuery(sessionId ? { sessionId } : undefined, { skip: !sessionId })

  const { data: slots = [], refetch: refetchSlots } = useGetTimeSlotsQuery(sessionId ? { sessionId } : undefined, {
    skip: !sessionId,
  })
  const { data: entries = [], refetch: refetchEntries } = useGetTimetableEntriesQuery(
    sessionId ? { sessionId } : undefined,
    { skip: !sessionId }
  )

  const sortedSlots = useMemo(
    () =>
      [...slots].sort((a, b) => {
        const o = (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
        if (o !== 0) return o
        return String(a.startTime || '').localeCompare(String(b.startTime || ''))
      }),
    [slots]
  )

  const [entryModal, setEntryModal] = useState(null)
  const [entryFormError, setEntryFormError] = useState('')
  const [mf, setMf] = useState({
    darjahId: '',
    day: 'sat',
    slotId: '',
    teacherId: '',
    subjectId: '',
    bookId: '',
    room: '',
  })

  const [manageSlotsOpen, setManageSlotsOpen] = useState(false)
  const [slotForm, setSlotForm] = useState(null)
  const [slotDraft, setSlotDraft] = useState({
    startTime: '08:00',
    endTime: '08:45',
    label: '',
    isBreak: false,
    sortOrder: 0,
  })
  const [slotFormError, setSlotFormError] = useState('')
  const [slotPendingDelete, setSlotPendingDelete] = useState(null)
  const [entryPendingDelete, setEntryPendingDelete] = useState(null)
  const [entrySaving, setEntrySaving] = useState(false)
  const [slotSaving, setSlotSaving] = useState(false)

  const {
    errors: entryErrors,
    onBlurField: onBlurEntryField,
    revalidateIfError: revalidateEntryIfError,
    validateAll: validateEntryAll,
    focusInvalid: focusEntryInvalid,
    applyApiError: applyEntryApiError,
    setErrors: setEntryErrors,
  } = useFormValidation({
    schema: entryFormSchema,
    t,
    fieldIds: ENTRY_FIELD_IDS,
    order: ['subjectId', 'darjahId', 'day', 'slotId', 'teacherId'],
  })

  const {
    errors: slotErrors,
    onBlurField: onBlurSlotField,
    revalidateIfError: revalidateSlotIfError,
    validateAll: validateSlotAll,
    focusInvalid: focusSlotInvalid,
    applyApiError: applySlotApiError,
    setErrors: setSlotErrors,
  } = useFormValidation({
    schema: slotFormSchema,
    t,
    fieldIds: SLOT_FIELD_IDS,
    order: ['startTime', 'endTime'],
  })

  const darjahOptions = useMemo(
    () => darajat.filter((d) => String(d.sessionId?._id || d.sessionId || '') === String(sessionId)),
    [darajat, sessionId]
  )

  const subjectsInSession = useMemo(
    () => subjects.filter((s) => String(s.sessionId?._id || s.sessionId || '') === String(sessionId)),
    [subjects, sessionId]
  )

  const subjectPickList = subjectsInSession

  const darjahPickList = useMemo(() => {
    if (!mf.subjectId) return []
    return darjahOptions.filter((d) =>
      (d.subjectIds || []).some((x) => String(x._id || x) === String(mf.subjectId))
    )
  }, [darjahOptions, mf.subjectId])

  const { data: books = [] } = useGetSubjectBooksQuery(
    sessionId && mf.darjahId && mf.subjectId ? { sessionId, darjahId: mf.darjahId, subjectId: mf.subjectId } : undefined,
    { skip: !sessionId || !mf.darjahId || !mf.subjectId }
  )

  const dayCols = useMemo(() => (showFriday ? [...CORE_DAYS, FRIDAY] : CORE_DAYS), [showFriday])

  const byCell = useMemo(() => {
    const q = search.trim().toLowerCase()
    const m = new Map()
    for (const e of entries) {
      if (q) {
        const hay = [
          loc(e.subjectId?.name, lng),
          e.subjectId?.name?.ur,
          e.subjectId?.name?.en,
          loc(e.teacherId?.name, lng),
          e.teacherId?.name?.ur,
          e.teacherId?.name?.en,
          loc(e.darjahId?.name, lng),
          e.darjahId?.name?.ur,
          e.darjahId?.name?.en,
          loc(e.bookId?.title, lng),
          e.bookId?.title?.ur,
          e.bookId?.title?.en,
          e.room,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) continue
      }
      const slotKey = String(e.slotId?._id || e.slotId || '')
      const dj = String(e.darjahId?._id || e.darjahId || '')
      const keyScoped = `${e.day}::${slotKey}::${dj}`
      const keyAll = `${e.day}::${slotKey}`
      if (darjahFilter) {
        if (dj === String(darjahFilter)) m.set(keyScoped, e)
      } else {
        const arr = m.get(keyAll) || []
        arr.push(e)
        m.set(keyAll, arr)
      }
    }
    return m
  }, [entries, darjahFilter, search, lng])

  const [createSlot] = useCreateTimeSlotMutation()
  const [updateSlot] = useUpdateTimeSlotMutation()
  const [deleteSlot] = useDeleteTimeSlotMutation()
  const [createEntry] = useCreateTimetableEntryMutation()
  const [updateEntry] = useUpdateTimetableEntryMutation()
  const [deleteEntry] = useDeleteTimetableEntryMutation()

  function openEntryModal({ day, slotId, entry, prefDarjahId }) {
    const slotObj = sortedSlots.find((s) => String(s._id) === String(slotId))
    if (slotObj && isBreakSlot(slotObj)) return
    setEntryFormError('')
    setEntryErrors({})
    setMf({
      darjahId: prefDarjahId || entry?.darjahId?._id || entry?.darjahId || darjahFilter || '',
      day: entry?.day || day,
      slotId: slotObj?._id || slotId,
      teacherId: entry?.teacherId?._id || entry?.teacherId || '',
      subjectId: entry?.subjectId?._id || entry?.subjectId || '',
      bookId: entry?.bookId?._id || entry?.bookId || '',
      room: entry?.room || '',
    })
    setEntryModal({ entry: entry || null, slot: slotObj })
  }

  function closeEntryModal() {
    setEntryModal(null)
    setEntryFormError('')
  }

  async function saveEntryModal(e) {
    e.preventDefault()
    setEntryFormError('')
    const next = validateEntryAll(mf)
    if (Object.keys(next).length) {
      focusEntryInvalid(next)
      return
    }
    const body = {
      sessionId,
      darjahId: mf.darjahId,
      day: mf.day,
      slotId: mf.slotId,
      teacherId: mf.teacherId,
      subjectId: mf.subjectId || null,
      bookId: mf.bookId || null,
      room: (mf.room || '').trim(),
    }
    setEntrySaving(true)
    try {
      if (entryModal?.entry?._id) {
        await updateEntry({ id: entryModal.entry._id, ...body }).unwrap()
      } else {
        await createEntry(body).unwrap()
      }
      closeEntryModal()
      refetchEntries()
    } catch (err) {
      const apiMsg = applyEntryApiError(err)
      setEntryFormError(apiMsg || err?.data?.message || err?.error || String(err))
    } finally {
      setEntrySaving(false)
    }
  }

  function openSlotCreate() {
    setSlotFormError('')
    setSlotErrors({})
    setSlotDraft({
      startTime: '08:00',
      endTime: '08:45',
      label: '',
      isBreak: false,
      sortOrder: sortedSlots.length,
    })
    setSlotForm({ mode: 'create' })
  }

  function openSlotEdit(slot) {
    setSlotFormError('')
    setSlotErrors({})
    setSlotDraft({
      startTime: slot.startTime || '08:00',
      endTime: slot.endTime || '08:45',
      label: slot.label || '',
      isBreak: !!slot.isBreak || isBreakSlot(slot),
      sortOrder: slot.sortOrder ?? 0,
    })
    setSlotForm({ mode: 'edit', slot })
    setManageSlotsOpen(false)
  }

  function closeSlotForm() {
    setSlotForm(null)
    setSlotFormError('')
  }

  async function saveSlotForm(e) {
    e.preventDefault()
    setSlotFormError('')
    if (!sessionId) return
    const next = validateSlotAll(slotDraft)
    if (Object.keys(next).length) {
      focusSlotInvalid(next)
      return
    }
    const label = slotDraft.isBreak
      ? (slotDraft.label || '').trim() || (lng === 'ur' ? 'وقفہ' : 'Break')
      : (slotDraft.label || '').trim()
    const payload = {
      sessionId,
      startTime: slotDraft.startTime.trim(),
      endTime: slotDraft.endTime.trim(),
      label,
      isBreak: !!slotDraft.isBreak,
      sortOrder: Number(slotDraft.sortOrder) || 0,
      isActive: true,
    }
    setSlotSaving(true)
    try {
      if (slotForm?.mode === 'edit' && slotForm.slot?._id) {
        await updateSlot({ id: slotForm.slot._id, ...payload }).unwrap()
      } else {
        await createSlot(payload).unwrap()
      }
      closeSlotForm()
      refetchSlots()
    } catch (err) {
      const apiMsg = applySlotApiError(err)
      setSlotFormError(apiMsg || err?.data?.message || err?.error || String(err))
    } finally {
      setSlotSaving(false)
    }
  }

  return (
    <div>
      <PageHeading navKey="navTartibatTimetable">
        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            disabled={!sessionId}
            onClick={() => setManageSlotsOpen(true)}
          >
            {lng === 'ur' ? 'اوقات' : 'Periods'}
          </button>
          <button type="button" className="btn btn-sm btn-success" disabled={!sessionId} onClick={openSlotCreate}>
            {lng === 'ur' ? 'نیا وقت' : 'Add slot'}
          </button>
        </div>
      </PageHeading>

      <div className="page-toolbar page-toolbar--strip filter-toolbar tt-toolbar">
        <div className="tt-toolbar__row">
          <div className="tt-toolbar__field tt-toolbar__field--search">
            <label className="tt-toolbar__label" htmlFor="tt-search">
              {t('common.search')}
            </label>
            <AppInput
              id="tt-search"
              type="search"
              className="w-100"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lng === 'ur' ? 'استاد، شعبہ، کتاب، کمرہ…' : 'Teacher, subject, book, room…'}
            />
          </div>
          <div className="tt-toolbar__field">
            <label className="tt-toolbar__label" htmlFor="tt-toolbar-session">
              {lng === 'ur' ? 'سیشن' : 'Session'}
            </label>
            <AppSelect
              id="tt-toolbar-session"
              value={sessionId}
              onChange={(e) => {
                setSessionId(e.target.value)
                setDarjahFilter('')
              }}
            >
              <option value="">—</option>
              {sessions.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.title}
                </option>
              ))}
            </AppSelect>
          </div>
          <div className="tt-toolbar__field">
            <label className="tt-toolbar__label" htmlFor="tt-toolbar-darjah">
              {lng === 'ur' ? 'درجات (کلاس)' : 'Class'}
            </label>
            <AppSelect
              key={`tt-dj-${sessionId || 'none'}`}
              id="tt-toolbar-darjah"
              value={darjahFilter}
              onChange={(e) => setDarjahFilter(e.target.value)}
              disabled={!sessionId}
            >
              <option value="">{lng === 'ur' ? 'تمام کلاسیں' : 'All classes'}</option>
              {darjahOptions.map((d) => (
                <option key={d._id} value={d._id}>
                  {loc(d.name, lng)}
                </option>
              ))}
            </AppSelect>
          </div>
          <div className="tt-toolbar__field tt-toolbar__field--week">
            <span className="tt-toolbar__label" id="tt-week-toggle-label">
              {lng === 'ur' ? 'جمعہ' : 'Friday'}
            </span>
            <div className="tt-week-toggle tt-week-toggle--toolbar" role="group" aria-labelledby="tt-week-toggle-label">
              <button
                type="button"
                className={`tt-week-toggle__btn${!showFriday ? ' is-active' : ''}`}
                aria-pressed={!showFriday}
                onClick={() => setShowFriday(false)}
              >
                {lng === 'ur' ? 'ہفتہ–جمعرات' : 'Sat–Thu'}
              </button>
              <button
                type="button"
                className={`tt-week-toggle__btn${showFriday ? ' is-active' : ''}`}
                aria-pressed={showFriday}
                onClick={() => setShowFriday(true)}
              >
                {lng === 'ur' ? '+ جمعہ' : '+ Fri'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <p className="text-muted small mb-2 tt-hint">
        {lng === 'ur'
          ? 'سیشن منتخب کریں۔ وقفہ کی قطار میں سبق نہیں لگتا۔ خالی خانے پر کلک کر کے اندراج کریں۔'
          : 'Pick a session. Break rows cannot hold lessons. Click a cell to add or edit.'}
      </p>

      {!sessionId ? null : (
        <div className="tt-shell content-panel overflow-hidden mb-3">
          <div className="table-responsive">
            <table className="table table-sm mb-0 align-middle tt-table">
              <thead>
                <tr>
                  <th className="tt-th tt-th--time">{lng === 'ur' ? 'وقت' : 'Time'}</th>
                  {dayCols.map((d) => (
                    <th key={d.id} className="tt-th">
                      {lng === 'ur' ? d.ur : d.en}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedSlots.length === 0 ? (
                  <tr>
                    <td colSpan={1 + dayCols.length} className="text-muted text-center py-4 tt-empty">
                      {lng === 'ur' ? 'کوئی وقت نہیں — «نیا وقت» سے شامل کریں' : 'No periods — use Add slot'}
                    </td>
                  </tr>
                ) : (
                  sortedSlots.map((slot) => {
                    if (isBreakSlot(slot)) {
                      return (
                        <tr key={slot._id} className="tt-break-row">
                          <td className="tt-time-cell small">{timeLabel(slot)}</td>
                          <td colSpan={dayCols.length} className="tt-break-cell">
                            <span className="tt-break-pill">{slot.label || (lng === 'ur' ? 'وقفہ' : 'Break')}</span>
                          </td>
                        </tr>
                      )
                    }
                    return (
                      <tr key={slot._id} className="tt-period-row">
                        <td className="tt-time-cell small fw-semibold">{timeLabel(slot)}</td>
                        {dayCols.map((d) => {
                          const slotKey = String(slot._id)
                          const keyAll = `${d.id}::${slotKey}`
                          const dj = darjahFilter
                          const keyScoped = `${d.id}::${slotKey}::${dj}`
                          const cellEntry = darjahFilter ? byCell.get(keyScoped) : null
                          const cellList = !darjahFilter ? byCell.get(keyAll) : null

                          return (
                            <td key={d.id} className="tt-cell">
                              {darjahFilter ? (
                                cellEntry ? (
                                  <div className="tt-card">
                                    <div className="tt-card__title">
                                      {(cellEntry.subjectId && loc(cellEntry.subjectId.name, lng)) ||
                                        (lng === 'ur' ? 'شعبہ' : 'Subject')}
                                    </div>
                                    <div className="tt-card__meta">{loc(cellEntry.darjahId?.name, lng)}</div>
                                    <div className="tt-card__line">{loc(cellEntry.teacherId?.name, lng) || '—'}</div>
                                    {cellEntry.bookId ? (
                                      <div className="tt-card__line small text-secondary">
                                        {loc(cellEntry.bookId.title, lng)}
                                      </div>
                                    ) : null}
                                    <div className="tt-card__actions">
                                      <button
                                        type="button"
                                        className="btn btn-outline-primary btn-sm"
                                        onClick={() =>
                                          openEntryModal({
                                            day: d.id,
                                            slotId: slot._id,
                                            entry: cellEntry,
                                            prefDarjahId: darjahFilter,
                                          })
                                        }
                                      >
                                        {t('common.edit')}
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-outline-danger btn-sm"
                                        onClick={() => setEntryPendingDelete({ entry: cellEntry })}
                                      >
                                        {t('common.delete')}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    className="tt-slot-add"
                                    onClick={() =>
                                      openEntryModal({ day: d.id, slotId: slot._id, prefDarjahId: darjahFilter })
                                    }
                                  >
                                    <span className="tt-slot-add__plus">+</span>
                                    <span className="small text-muted">{lng === 'ur' ? 'شامل' : 'Add'}</span>
                                  </button>
                                )
                              ) : Array.isArray(cellList) && cellList.length > 0 ? (
                                <div className="d-flex flex-column gap-1">
                                  {cellList.map((ent) => (
                                    <div key={ent._id} className="tt-card tt-card--compact">
                                      <div className="fw-semibold small">
                                        {(ent.subjectId && loc(ent.subjectId.name, lng)) || '—'}
                                      </div>
                                      <div className="text-muted small">{loc(ent.darjahId?.name, lng)}</div>
                                      <div className="small">{loc(ent.teacherId?.name, lng)}</div>
                                      <div className="d-flex gap-1 flex-wrap mt-1">
                                        <button
                                          type="button"
                                          className="btn btn-link btn-sm p-0 small"
                                          onClick={() => openEntryModal({ day: d.id, slotId: slot._id, entry: ent })}
                                        >
                                          {t('common.edit')}
                                        </button>
                                        <button
                                          type="button"
                                          className="btn btn-link btn-sm p-0 small text-danger"
                                          onClick={() => setEntryPendingDelete({ entry: ent })}
                                        >
                                          {t('common.delete')}
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary mt-1"
                                    onClick={() => openEntryModal({ day: d.id, slotId: slot._id })}
                                  >
                                    + {lng === 'ur' ? 'نیا' : 'Add'}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="tt-slot-add"
                                  onClick={() => openEntryModal({ day: d.id, slotId: slot._id })}
                                >
                                  <span className="tt-slot-add__plus">+</span>
                                </button>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {manageSlotsOpen && (
        <AppModalShell
          title={lng === 'ur' ? 'اوقات / پیریڈ' : 'Periods & breaks'}
          onClose={() => setManageSlotsOpen(false)}
          size="lg"
        >
          <div className="modal-app-body">
            <div className="d-flex flex-wrap justify-content-between gap-2 mb-3">
              <p className="small text-muted mb-0">
                {lng === 'ur'
                  ? 'وقفہ کی قطار تمام دنوں پر پھیلی ہوتی ہے۔ حذف کرنے پر اس وقت کے تمام اسباق بھی حذف ہو جاتے ہیں۔'
                  : 'Break rows span all days. Deleting a slot removes all lessons in that period.'}
              </p>
              <button
                type="button"
                className="btn btn-sm btn-success"
                onClick={() => {
                  setManageSlotsOpen(false)
                  openSlotCreate()
                }}
              >
                {lng === 'ur' ? 'نیا وقت' : 'Add slot'}
              </button>
            </div>
            <div className="table-responsive border rounded">
              <table className="table table-sm mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>{lng === 'ur' ? 'وقت' : 'Time'}</th>
                    <th>{lng === 'ur' ? 'لیبل' : 'Label'}</th>
                    <th>{lng === 'ur' ? 'وقفہ' : 'Break'}</th>
                    <th className="text-end">{lng === 'ur' ? 'اعمال' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSlots.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-3">
                        —
                      </td>
                    </tr>
                  ) : (
                    sortedSlots.map((s) => (
                      <tr key={s._id}>
                        <td className="text-muted small">{s.sortOrder ?? 0}</td>
                        <td className="small font-latin-ui">{timeLabel(s)}</td>
                        <td className="small">{s.label || '—'}</td>
                        <td>{isBreakSlot(s) ? '✓' : '—'}</td>
                        <td className="text-end text-nowrap">
                          <button type="button" className="btn btn-sm btn-outline-primary me-1" onClick={() => openSlotEdit(s)}>
                            {t('common.edit')}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => {
                              setManageSlotsOpen(false)
                              setSlotPendingDelete({ slot: s })
                            }}
                          >
                            {t('common.delete')}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="modal-app-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setManageSlotsOpen(false)}>
              {t('common.cancel')}
            </button>
          </div>
        </AppModalShell>
      )}

      {slotForm && (
        <AppModalShell
          title={
            slotForm.mode === 'edit'
              ? lng === 'ur'
                ? 'وقت میں ترمیم'
                : 'Edit period'
              : lng === 'ur'
                ? 'نیا وقت / وقفہ'
                : 'Add period / break'
          }
          onClose={closeSlotForm}
        >
          <form className="modal-app-form" onSubmit={saveSlotForm}>
            <div className="modal-app-body">
              {slotFormError ? <div className="alert alert-danger py-2 small mb-2">{slotFormError}</div> : null}
              <div className="row g-2 mb-2">
                <div className="col-6">
                  <FormField
                    label={lng === 'ur' ? 'شروع' : 'Start'}
                    htmlFor="tt-slot-start"
                    required
                    error={slotErrors.startTime}
                  >
                    <AppInput
                      id="tt-slot-start"
                      type="time"
                      value={slotDraft.startTime}
                      onChange={(e) => {
                        const next = { ...slotDraft, startTime: e.target.value }
                        setSlotDraft(next)
                        revalidateSlotIfError('startTime', next)
                        revalidateSlotIfError('endTime', next)
                      }}
                      onBlur={() => onBlurSlotField('startTime', slotDraft)}
                    />
                  </FormField>
                </div>
                <div className="col-6">
                  <FormField
                    label={lng === 'ur' ? 'اختتام' : 'End'}
                    htmlFor="tt-slot-end"
                    required
                    error={slotErrors.endTime}
                  >
                    <AppInput
                      id="tt-slot-end"
                      type="time"
                      value={slotDraft.endTime}
                      onChange={(e) => {
                        const next = { ...slotDraft, endTime: e.target.value }
                        setSlotDraft(next)
                        revalidateSlotIfError('endTime', next)
                      }}
                      onBlur={() => onBlurSlotField('endTime', slotDraft)}
                    />
                  </FormField>
                </div>
              </div>
              <div className="mb-2">
                <label className="form-label small mb-1" htmlFor="tt-slot-label">
                  {lng === 'ur' ? 'لیبل (اختیاری)' : 'Label (optional)'}
                </label>
                <AppInput
                  id="tt-slot-label"
                 
                  value={slotDraft.label}
                  onChange={(e) => setSlotDraft((p) => ({ ...p, label: e.target.value }))}
                  placeholder={lng === 'ur' ? 'مثلاً پہلا سبق' : 'e.g. Period 1'}
                />
              </div>
              <AppCheckbox
                id="tt-slot-break"
                className="mb-2"
                checked={slotDraft.isBreak}
                onCheckedChange={(checked) =>
                  setSlotDraft((p) => ({
                    ...p,
                    isBreak: checked,
                    label: p.label,
                  }))
                }
                label={lng === 'ur' ? 'وقفہ (تمام دنوں پر ایک قطار)' : 'Break row (spans all days)'}
                size="sm"
              />
              <div className="mb-0">
                <label className="form-label small mb-1" htmlFor="tt-slot-order">
                  {lng === 'ur' ? 'ترتیب' : 'Sort order'}
                </label>
                <AppInput
                  id="tt-slot-order"
                  type="number"
                 
                  min={0}
                  value={slotDraft.sortOrder}
                  latin
                    onChange={(e) => setSlotDraft((p) => ({ ...p, sortOrder: e.target.value }))}
                />
              </div>
            </div>
            <div className="modal-app-footer">
              <button type="button" className="btn btn-secondary" onClick={closeSlotForm} disabled={slotSaving}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn btn-success" disabled={slotSaving}>
                {slotSaving ? t('validation.formSaving') : t('common.save')}
              </button>
            </div>
          </form>
        </AppModalShell>
      )}

      {slotPendingDelete ? (
        <ConfirmDeleteModal
          open
          title={lng === 'ur' ? 'وقت حذف کریں؟' : 'Delete this period?'}
          onClose={() => setSlotPendingDelete(null)}
          onConfirm={async () => {
            if (!slotPendingDelete?.slot?._id) return
            await deleteSlot(slotPendingDelete.slot._id).unwrap()
            refetchSlots()
            refetchEntries()
          }}
        >
          <>
            <p className="mb-2 small">
              <strong>{timeLabel(slotPendingDelete.slot)}</strong>
            </p>
            <p className="text-danger small mb-0">
              {lng === 'ur'
                ? 'اس وقت کے تمام ٹائم ٹیبل اندراجات حذف ہو جائیں گے۔'
                : 'All timetable entries in this slot will be removed.'}
            </p>
          </>
        </ConfirmDeleteModal>
      ) : null}

      {entryPendingDelete ? (
        <ConfirmDeleteModal
          open
          title={lng === 'ur' ? 'اندراج حذف؟' : 'Remove this entry?'}
          onClose={() => setEntryPendingDelete(null)}
          onConfirm={async () => {
            if (!entryPendingDelete?.entry?._id) return
            await deleteEntry(entryPendingDelete.entry._id).unwrap()
            refetchEntries()
          }}
        >
          <>
            <p className="small mb-1">
              {entryPendingDelete.entry?.subjectId
                ? loc(entryPendingDelete.entry.subjectId.name, lng)
                : lng === 'ur'
                  ? 'سبق'
                  : 'Lesson'}
            </p>
            <p className="text-muted small mb-0">
              {loc(entryPendingDelete.entry?.darjahId?.name, lng)} ·{' '}
              {loc(entryPendingDelete.entry?.teacherId?.name, lng)}
            </p>
          </>
        </ConfirmDeleteModal>
      ) : null}

      {entryModal && (
        <AppModalShell
          title={
            entryModal.entry
              ? t('common.edit')
              : lng === 'ur'
                ? 'ٹائم ٹیبل اندراج'
                : 'Add timetable entry'
          }
          onClose={closeEntryModal}
        >
          <form className="modal-app-form" onSubmit={saveEntryModal}>
            <div className="modal-app-body">
              {entryFormError ? <div className="alert alert-danger py-2 small mb-2">{entryFormError}</div> : null}
              <FormField k="subjectName" htmlFor="tt-sub" required className="mb-2" error={entryErrors.subjectId}>
                <AppSelect
                  id="tt-sub"
                  value={mf.subjectId}
                  onChange={(e) => {
                    const v = e.target.value
                    setMf((prev) => {
                      const allowedDj = darjahOptions.filter((d) =>
                        (d.subjectIds || []).some((x) => String(x._id || x) === String(v))
                      )
                      let darjahId = prev.darjahId
                      let bookId = prev.bookId
                      if (darjahId && !allowedDj.some((d) => String(d._id) === String(darjahId))) {
                        darjahId = ''
                        bookId = ''
                      }
                      const next = { ...prev, subjectId: v, darjahId, bookId: v !== prev.subjectId ? '' : bookId }
                      revalidateEntryIfError('subjectId', next)
                      revalidateEntryIfError('darjahId', next)
                      return next
                    })
                  }}
                  onBlur={() => onBlurEntryField('subjectId', mf)}
                >
                  <option value="">—</option>
                  {subjectPickList.map((s) => (
                    <option key={s._id} value={s._id}>
                      {loc(s.name, lng)}
                    </option>
                  ))}
                </AppSelect>
              </FormField>
              <FormField k="darjahName" htmlFor="tt-dj" required className="mb-2" error={entryErrors.darjahId}>
                <AppSelect
                  id="tt-dj"
                  value={mf.darjahId}
                  onChange={(e) => {
                    const next = { ...mf, darjahId: e.target.value, bookId: '' }
                    setMf(next)
                    revalidateEntryIfError('darjahId', next)
                  }}
                  onBlur={() => onBlurEntryField('darjahId', mf)}
                  disabled={!mf.subjectId}
                >
                  <option value="">—</option>
                  {darjahPickList.map((d) => (
                    <option key={d._id} value={d._id}>
                      {loc(d.name, lng)}
                    </option>
                  ))}
                </AppSelect>
              </FormField>
              <FormField
                label={lng === 'ur' ? 'دن' : 'Day'}
                htmlFor="tt-day"
                required
                className="mb-2"
                error={entryErrors.day}
              >
                <AppSelect
                  id="tt-day"
                  value={mf.day}
                  onChange={(e) => {
                    const next = { ...mf, day: e.target.value }
                    setMf(next)
                    revalidateEntryIfError('day', next)
                  }}
                  onBlur={() => onBlurEntryField('day', mf)}
                >
                  {DAYS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {lng === 'ur' ? d.ur : d.en}
                    </option>
                  ))}
                </AppSelect>
              </FormField>
              <FormField
                label={lng === 'ur' ? 'پیریڈ' : 'Period'}
                htmlFor="tt-slot"
                required
                className="mb-2"
                error={entryErrors.slotId}
              >
                <AppSelect
                  id="tt-slot"
                  value={mf.slotId}
                  onChange={(e) => {
                    const next = { ...mf, slotId: e.target.value }
                    setMf(next)
                    revalidateEntryIfError('slotId', next)
                  }}
                  onBlur={() => onBlurEntryField('slotId', mf)}
                >
                  <option value="">—</option>
                  {sortedSlots
                    .filter((s) => !isBreakSlot(s))
                    .map((s) => (
                      <option key={s._id} value={s._id}>
                        {timeLabel(s)}
                      </option>
                    ))}
                </AppSelect>
              </FormField>
              <FormField k="teacher" htmlFor="tt-teach" required className="mb-2" error={entryErrors.teacherId}>
                <AppSelect
                  id="tt-teach"
                  value={mf.teacherId}
                  onChange={(e) => {
                    const next = { ...mf, teacherId: e.target.value }
                    setMf(next)
                    revalidateEntryIfError('teacherId', next)
                  }}
                  onBlur={() => onBlurEntryField('teacherId', mf)}
                >
                  <option value="">—</option>
                  {teachers.map((te) => (
                    <option key={te._id} value={te._id}>
                      {loc(te.name, lng)}
                    </option>
                  ))}
                </AppSelect>
              </FormField>
              <FormField k="bookTitle" htmlFor="tt-book" className="mb-2">
                <AppSelect
                  id="tt-book"
                  value={mf.bookId}
                  onChange={(e) => setMf({ ...mf, bookId: e.target.value })}
                  disabled={!mf.subjectId || !mf.darjahId}
                >
                  <option value="">{lng === 'ur' ? '— (اختیاری)' : '— (optional)'}</option>
                  {books.map((b) => (
                    <option key={b._id} value={b._id}>
                      {loc(b.title, lng)}
                    </option>
                  ))}
                </AppSelect>
              </FormField>
              <FormField
                label={lng === 'ur' ? 'کمرہ (اختیاری)' : 'Room (optional)'}
                htmlFor="tt-room"
                className="mb-0"
              >
                <AppInput
                  id="tt-room"
                  placeholder={lng === 'ur' ? 'مثلاً کمرہ 1' : 'e.g. Room 1'}
                  value={mf.room}
                  latin
                  onChange={(e) => setMf({ ...mf, room: e.target.value })}
                />
              </FormField>
            </div>
            <div className="modal-app-footer">
              <button type="button" className="btn btn-secondary" onClick={closeEntryModal} disabled={entrySaving}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn btn-success" disabled={entrySaving}>
                {entrySaving ? t('validation.formSaving') : t('common.save')}
              </button>
            </div>
          </form>
        </AppModalShell>
      )}
    </div>
  )
}
