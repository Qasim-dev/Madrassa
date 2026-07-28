import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import {
  useGetActivityCategoriesQuery,
  useCreateActivityCategoryMutation,
  usePatchActivityCategoryMutation,
  useDeleteActivityCategoryMutation,
  useReorderActivityCategoriesMutation,
  useGetDailyActivitiesQuery,
  useBulkSaveDailyActivitiesMutation,
  useCopyDailyActivitiesMutation,
  useGetActivityAnalyticsSummaryQuery,
  useGetDarajatQuery,
  useGetSubjectsQuery,
  useGetStudentsQuery,
  useGetStudentActivityHistoryQuery,
} from '../services/api'
import { loc } from '../shared/localized'
import { absoluteAssetUrl, isStoredAssetUrl } from '../shared/assetUrl'
import { formatDisplayDate } from '../shared/formatDisplayDate'
import { useCalendarMode } from '../app/calendarMode'
import PageHeading from '../components/PageHeading'
import AppTabs from '../components/AppTabs'
import AppDateInput from '../components/AppDateInput'
import AppModalShell from '../components/AppModalShell'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import { AppInput, AppSelect, FormField } from '../components/ui'
import { useFormValidation, categoryFormSchema } from '../shared/validation'
import './studentActivitiesPage.css'

const RATING_TYPES = ['stars', 'score', 'grade', 'boolean', 'emoji']

const DEFAULT_GRADES = [
  { value: 'excellent', label: { ur: 'ممتاز', en: 'Excellent' } },
  { value: 'very_good', label: { ur: 'بہت اچھا', en: 'Very Good' } },
  { value: 'good', label: { ur: 'اچھا', en: 'Good' } },
  { value: 'average', label: { ur: 'اوسط', en: 'Average' } },
  { value: 'poor', label: { ur: 'کمزور', en: 'Poor' } },
]

const GRADE_LABELS = Object.fromEntries(DEFAULT_GRADES.map((g) => [g.value, g.label]))

const BOOLEAN_LABELS = {
  yes: { ur: 'ہاں', en: 'Yes' },
  no: { ur: 'نہیں', en: 'No' },
  true: { ur: 'ہاں', en: 'Yes' },
  false: { ur: 'نہیں', en: 'No' },
}

const RATING_TYPE_LABELS = {
  stars: { ur: 'ستارے', en: 'Stars' },
  score: { ur: 'اسکور', en: 'Score' },
  grade: { ur: 'گریڈ', en: 'Grade' },
  boolean: { ur: 'ہاں / نہیں', en: 'Yes / No' },
  emoji: { ur: 'ایموجی', en: 'Emoji' },
}

function photoOf(student) {
  const raw = student?.photoUrl ? String(student.photoUrl).trim() : ''
  if (!raw) return ''
  return isStoredAssetUrl(raw) ? absoluteAssetUrl(raw) : raw
}

/** Display stored activity value in UI language (never dump raw English codes). */
function formatActivityDisplayValue(item, lng) {
  const en = String(lng || '').toLowerCase().startsWith('en')
  const raw = item?.value || item?.grade || ''
  const cat = item?.categoryId
  const type = cat?.ratingType || (item?.grade ? 'grade' : 'score')
  const opts = cat?.gradeOptions?.length ? cat.gradeOptions : DEFAULT_GRADES

  if (type === 'boolean') {
    const key = String(raw).toLowerCase()
    const hit = BOOLEAN_LABELS[key]
    return hit ? loc(hit, lng) : raw || '—'
  }
  if (type === 'grade') {
    const hit = opts.find((o) => o.value === raw) || (GRADE_LABELS[raw] ? { label: GRADE_LABELS[raw] } : null)
    if (hit?.label) return loc(hit.label, lng) || raw
    // Fallback map for bare English tokens
    if (GRADE_LABELS[raw]) return loc(GRADE_LABELS[raw], lng)
    return raw || (item?.score != null ? String(item.score) : '—')
  }
  if (type === 'stars') {
    const n = Number(raw || item?.score || 0)
    if (!n) return '—'
    return '★'.repeat(Math.min(5, Math.max(0, n))) + (en ? ` (${n})` : ` (${n})`)
  }
  if (type === 'emoji') return raw || '—'
  if (item?.score != null && item.score !== '') return String(item.score)
  return raw || '—'
}

function classLabelOf(student, lng) {
  if (student?.darjahId?.name) {
    const n = loc(student.darjahId.name, lng)
    const code = student.darjahId.code ? ` (${student.darjahId.code})` : ''
    return n + code
  }
  return '—'
}

function sectionLabelOf(student, lng) {
  if (student?.subjectId?.name) return loc(student.subjectId.name, lng)
  return '—'
}

function emptyCategoryForm() {
  return {
    nameUr: '',
    nameEn: '',
    descriptionUr: '',
    descriptionEn: '',
    icon: 'star',
    color: '#0f8f5f',
    ratingType: 'stars',
    maxScore: 5,
    isRequired: false,
    isActive: true,
  }
}

function CellEditor({ category, value, onChange, en }) {
  const type = category.ratingType || 'stars'
  const max = Number(category.maxScore) || 5

  if (type === 'boolean') {
    return (
      <AppSelect value={value || ''} onChange={(e) => onChange(e.target.value)} className="sa-cell-control">
        <option value="">—</option>
        <option value="yes">{en ? 'Yes' : 'ہاں'}</option>
        <option value="no">{en ? 'No' : 'نہیں'}</option>
      </AppSelect>
    )
  }
  if (type === 'emoji') {
    return (
      <AppSelect value={value || ''} onChange={(e) => onChange(e.target.value)} className="sa-cell-control">
        <option value="">—</option>
        <option value="😊">😊</option>
        <option value="😐">😐</option>
        <option value="☹️">☹️</option>
      </AppSelect>
    )
  }
  if (type === 'grade') {
    const opts = category.gradeOptions?.length ? category.gradeOptions : DEFAULT_GRADES
    return (
      <AppSelect value={value || ''} onChange={(e) => onChange(e.target.value)} className="sa-cell-control">
        <option value="">—</option>
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {loc(o.label, en ? 'en' : 'ur') || o.value}
          </option>
        ))}
      </AppSelect>
    )
  }
  if (type === 'stars') {
    return (
      <div className="sa-stars" role="group" aria-label={loc(category.name, en ? 'en' : 'ur')}>
        {Array.from({ length: max }, (_, i) => {
          const n = i + 1
          const on = Number(value) >= n
          return (
            <button
              key={n}
              type="button"
              className={`sa-star${on ? ' is-on' : ''}`}
              onClick={() => onChange(String(n))}
              aria-pressed={on}
            >
              ★
            </button>
          )
        })}
      </div>
    )
  }
  return (
    <AppInput
      className="sa-cell-control"
      type="number"
      min={0}
      max={max}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      latin
    />
  )
}

export default function StudentCharacterPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const en = lng?.toLowerCase().startsWith('en')
  const { mode } = useCalendarMode()
  const {
    errors: catErrors,
    onBlurField: onBlurCat,
    revalidateIfError: revalidateCat,
    validateAll: validateCatAll,
    focusInvalid: focusInvalidCat,
    setErrors: setCatErrors,
  } = useFormValidation({
    schema: categoryFormSchema,
    t,
    fieldIds: { 'name.ur': 'sa-cat-name-ur' },
    order: ['name.ur'],
  })
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab =
    tabParam === 'categories'
      ? 'categories'
      : tabParam === 'dashboard'
        ? 'dashboard'
        : tabParam === 'history'
          ? 'history'
          : 'daily'

  const activeSessionId = useSelector((s) => s.session.activeSessionId)

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [darjahId, setDarjahId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [q, setQ] = useState('')
  const [draftCells, setDraftCells] = useState({}) // `${studentId}:${categoryId}` -> value
  const [draftRemarks, setDraftRemarks] = useState({}) // studentId -> remark
  const [flash, setFlash] = useState(null)
  const [dirty, setDirty] = useState(false)

  const [catModalOpen, setCatModalOpen] = useState(false)
  const [editingCat, setEditingCat] = useState(null)
  const [catForm, setCatForm] = useState(emptyCategoryForm)
  const [archiveCatTarget, setArchiveCatTarget] = useState(null)

  const [historyStudentId, setHistoryStudentId] = useState('')
  const [analyticsFrom, setAnalyticsFrom] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().slice(0, 10)
  })
  const [analyticsTo, setAnalyticsTo] = useState(() => new Date().toISOString().slice(0, 10))

  const setTab = (next) => {
    const p = new URLSearchParams(searchParams)
    if (next === 'daily') p.delete('tab')
    else p.set('tab', next)
    setSearchParams(p)
  }

  const { data: darajat = [] } = useGetDarajatQuery(
    activeSessionId ? { sessionId: activeSessionId } : undefined,
    { skip: !activeSessionId }
  )
  const { data: subjects = [] } = useGetSubjectsQuery(
    activeSessionId ? { sessionId: activeSessionId } : undefined,
    { skip: !activeSessionId }
  )
  const { data: allStudents = [] } = useGetStudentsQuery(
    activeSessionId ? { sessionId: activeSessionId } : undefined
  )
  const studentPickList = useMemo(() => {
    if (Array.isArray(allStudents)) return allStudents
    return allStudents?.items ?? []
  }, [allStudents])

  const dailyParams = useMemo(
    () => ({
      date,
      ...(activeSessionId ? { sessionId: activeSessionId } : {}),
      ...(darjahId ? { darjahId } : {}),
      ...(subjectId ? { subjectId } : {}),
    }),
    [date, activeSessionId, darjahId, subjectId]
  )

  const {
    data: daily,
    isLoading: dailyLoading,
    isFetching: dailyFetching,
    refetch: refetchDaily,
  } = useGetDailyActivitiesQuery(dailyParams, { skip: tab !== 'daily' || !darjahId })

  const { data: categories = [], isLoading: catsLoading } = useGetActivityCategoriesQuery()
  const [createCat, { isLoading: creatingCat }] = useCreateActivityCategoryMutation()
  const [patchCat, { isLoading: patchingCat }] = usePatchActivityCategoryMutation()
  const [deleteCat] = useDeleteActivityCategoryMutation()
  const [reorderCats] = useReorderActivityCategoriesMutation()
  const [bulkSave, { isLoading: saving }] = useBulkSaveDailyActivitiesMutation()
  const [copyDay, { isLoading: copying }] = useCopyDailyActivitiesMutation()

  const { data: analytics, isLoading: analyticsLoading } = useGetActivityAnalyticsSummaryQuery(
    {
      from: analyticsFrom,
      to: analyticsTo,
      ...(activeSessionId ? { sessionId: activeSessionId } : {}),
      ...(darjahId ? { darjahId } : {}),
    },
    { skip: tab !== 'dashboard' }
  )

  const { data: historyData, isLoading: historyLoading } = useGetStudentActivityHistoryQuery(
    {
      studentId: historyStudentId,
      from: analyticsFrom,
      to: analyticsTo,
    },
    { skip: tab !== 'history' || !historyStudentId }
  )

  // Hydrate draft from server when daily sheet loads
  useEffect(() => {
    if (!daily?.students) return
    const cells = {}
    const remarks = {}
    for (const row of daily.students) {
      const sid = String(row.student._id)
      remarks[sid] = row.remarks || ''
      for (const [cid, cell] of Object.entries(row.cells || {})) {
        cells[`${sid}:${cid}`] = cell.value ?? ''
      }
    }
    setDraftCells(cells)
    setDraftRemarks(remarks)
    setDirty(false)
  }, [daily])

  const showFlash = (text, tone = 'success') => {
    setFlash({ text, tone })
    window.setTimeout(() => setFlash(null), 4000)
  }

  const setCell = useCallback((studentId, categoryId, value) => {
    setDraftCells((prev) => ({ ...prev, [`${studentId}:${categoryId}`]: value }))
    setDirty(true)
  }, [])

  const filteredRows = useMemo(() => {
    const rows = daily?.students || []
    const qq = q.trim().toLowerCase()
    if (!qq) return rows
    return rows.filter((r) => {
      const name = `${loc(r.student.name, 'ur')} ${loc(r.student.name, 'en')}`.toLowerCase()
      const id = String(r.student.studentId || '').toLowerCase()
      const roll = String(r.student.rollNumber || '').toLowerCase()
      return name.includes(qq) || id.includes(qq) || roll.includes(qq)
    })
  }, [daily, q])

  const activeCategories = daily?.categories || categories.filter((c) => c.isActive)

  async function handleSave() {
    if (!darjahId) {
      showFlash(en ? 'Select class / darjah first' : 'پہلے درجہ منتخب کریں', 'danger')
      return
    }
    const entries = []
    for (const [key, value] of Object.entries(draftCells)) {
      if (value === '' || value == null) continue
      const [studentId, categoryId] = key.split(':')
      entries.push({ studentId, categoryId, value })
    }
    const studentRemarks = Object.entries(draftRemarks)
      .filter(([, remarks]) => String(remarks || '').trim())
      .map(([studentId, remarks]) => ({ studentId, remarks }))

    try {
      const res = await bulkSave({
        date,
        sessionId: activeSessionId || undefined,
        darjahId,
        subjectId: subjectId || undefined,
        entries,
        studentRemarks,
      }).unwrap()
      setDirty(false)
      showFlash(
        en
          ? `Saved ${res.saved} ratings` + (res.remarksSaved ? ` · ${res.remarksSaved} remarks` : '')
          : `${res.saved} ریٹنگ محفوظ` + (res.remarksSaved ? ` · ${res.remarksSaved} ریمارکس` : '')
      )
      refetchDaily()
    } catch (err) {
      showFlash(err?.data?.message || err?.error || 'Save failed', 'danger')
    }
  }

  function applyBulkValue(categoryId, value) {
    if (!categoryId) return
    setDraftCells((prev) => {
      const next = { ...prev }
      for (const row of filteredRows) {
        next[`${row.student._id}:${categoryId}`] = value
      }
      return next
    })
    setDirty(true)
  }

  async function handleCopyYesterday() {
    const d = new Date(`${date}T12:00:00`)
    d.setDate(d.getDate() - 1)
    const fromDate = d.toISOString().slice(0, 10)
    try {
      const res = await copyDay({
        fromDate,
        toDate: date,
        darjahId: darjahId || undefined,
      }).unwrap()
      showFlash(en ? `Copied ${res.copied} cells from ${fromDate}` : `${fromDate} سے ${res.copied} کاپیاں`)
      refetchDaily()
    } catch (err) {
      showFlash(err?.data?.message || 'Copy failed', 'danger')
    }
  }

  function openNewCategory() {
    setEditingCat(null)
    setCatForm(emptyCategoryForm())
    setCatErrors({})
    setCatModalOpen(true)
  }

  function openEditCategory(cat) {
    setEditingCat(cat)
    setCatForm({
      nameUr: cat.name?.ur || '',
      nameEn: cat.name?.en || '',
      descriptionUr: cat.description?.ur || '',
      descriptionEn: cat.description?.en || '',
      icon: cat.icon || 'star',
      color: cat.color || '#0f8f5f',
      ratingType: cat.ratingType || 'stars',
      maxScore: cat.maxScore ?? 5,
      isRequired: Boolean(cat.isRequired),
      isActive: cat.isActive !== false,
    })
    setCatErrors({})
    setCatModalOpen(true)
  }

  async function saveCategory() {
    const nextErrors = validateCatAll({ name: { ur: catForm.nameUr, en: catForm.nameEn } })
    if (Object.keys(nextErrors).length) {
      focusInvalidCat(nextErrors)
      return
    }
    const payload = {
      name: { ur: catForm.nameUr, en: catForm.nameEn },
      description: { ur: catForm.descriptionUr, en: catForm.descriptionEn },
      icon: catForm.icon,
      color: catForm.color,
      ratingType: catForm.ratingType,
      maxScore: Number(catForm.maxScore) || 5,
      isRequired: catForm.isRequired,
      isActive: catForm.isActive,
      gradeOptions: catForm.ratingType === 'grade' ? DEFAULT_GRADES : undefined,
    }
    try {
      if (editingCat) {
        await patchCat({ id: editingCat._id, ...payload }).unwrap()
      } else {
        await createCat(payload).unwrap()
      }
      setCatModalOpen(false)
      showFlash(en ? 'Category saved' : 'کیٹیگری محفوظ ہو گئی')
    } catch (err) {
      showFlash(err?.data?.message || 'Failed', 'danger')
    }
  }

  async function moveCategory(cat, dir) {
    const list = [...categories].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
    const i = list.findIndex((c) => String(c._id) === String(cat._id))
    if (i < 0) return
    const j = dir === 'up' ? i - 1 : i + 1
    if (j < 0 || j >= list.length) return
    const next = [...list]
    ;[next[i], next[j]] = [next[j], next[i]]
    await reorderCats({ orderedIds: next.map((c) => c._id) })
  }

  const tabs = [
    { id: 'daily', label: en ? 'Daily entry' : 'روزانہ اندراج' },
    { id: 'categories', label: en ? 'Categories' : 'کیٹیگریز' },
    { id: 'dashboard', label: en ? 'Dashboard' : 'ڈیش بورڈ' },
    { id: 'history', label: en ? 'Student history' : 'طالب علم ہسٹری' },
  ]

  return (
    <div className="sa-page">
      <PageHeading navKey="navStudentCharacter">
        {tab === 'daily' ? (
          <>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              disabled={copying || !darjahId}
              onClick={handleCopyYesterday}
            >
              {en ? 'Copy yesterday' : 'کل کاپی کریں'}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-success"
              disabled={saving || !dirty || !darjahId}
              onClick={handleSave}
            >
              {saving ? t('common.loading') : en ? 'Bulk save' : 'بلک محفوظ'}
            </button>
          </>
        ) : tab === 'categories' ? (
          <button type="button" className="btn btn-sm btn-success" onClick={openNewCategory}>
            {en ? 'Add category' : 'کیٹیگری شامل کریں'}
          </button>
        ) : null}
      </PageHeading>

      {flash ? (
        <div className={`alert alert-${flash.tone} sa-flash`} role="alert">
          {flash.text}
        </div>
      ) : null}

      <AppTabs
        variant="pills"
        value={tab}
        onChange={setTab}
        lang={lng}
        ariaLabel={en ? 'Student daily activities' : 'روزانہ سرگرمیاں'}
        items={tabs}
      />

      {tab === 'daily' ? (
        <div className="sa-panel">
          <div className="sa-toolbar">
            <label className="sa-field">
              <span>{en ? 'Date' : 'تاریخ'}</span>
              <AppDateInput value={date} onChange={(v) => setDate(v)} />
            </label>
            <label className="sa-field">
              <span>{en ? 'Section / Subject' : 'شعبہ'}</span>
              <AppSelect value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                <option value="">{en ? 'All' : 'تمام'}</option>
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>
                    {loc(s.name, lng)}
                  </option>
                ))}
              </AppSelect>
            </label>
            <label className="sa-field">
              <span>{en ? 'Class / Darjah' : 'درجہ'}</span>
              <AppSelect value={darjahId} onChange={(e) => setDarjahId(e.target.value)}>
                <option value="">{en ? 'Select…' : 'منتخب…'}</option>
                {darajat.map((d) => (
                  <option key={d._id} value={d._id}>
                    {loc(d.name, lng)}
                    {d.code ? ` (${d.code})` : ''}
                  </option>
                ))}
              </AppSelect>
            </label>
            <label className="sa-field sa-field--grow">
              <span>{en ? 'Search' : 'تلاش'}</span>
              <AppInput
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={en ? 'Name or ID…' : 'نام یا نمبر…'}
              />
            </label>
          </div>

          {darjahId && activeCategories.length ? (
            <div className="sa-bulk-bar">
              <span className="sa-bulk-bar__label">{en ? 'Mark all visible:' : 'سب مرئی کو:'}</span>
              {activeCategories.slice(0, 4).map((cat) => (
                <div key={cat._id} className="sa-bulk-chip">
                  <span style={{ color: cat.color }}>{loc(cat.name, lng)}</span>
                  {cat.ratingType === 'stars' ? (
                    <button type="button" className="btn btn-xs btn-outline-secondary" onClick={() => applyBulkValue(cat._id, String(cat.maxScore || 5))}>
                      {en ? 'Max' : 'مکمل'}
                    </button>
                  ) : cat.ratingType === 'boolean' ? (
                    <>
                      <button type="button" className="btn btn-xs btn-outline-success" onClick={() => applyBulkValue(cat._id, 'yes')}>
                        {en ? 'Yes' : 'ہاں'}
                      </button>
                      <button type="button" className="btn btn-xs btn-outline-secondary" onClick={() => applyBulkValue(cat._id, 'no')}>
                        {en ? 'No' : 'نہیں'}
                      </button>
                    </>
                  ) : cat.ratingType === 'grade' ? (
                    <button type="button" className="btn btn-xs btn-outline-secondary" onClick={() => applyBulkValue(cat._id, 'good')}>
                      {en ? 'Good' : 'اچھا'}
                    </button>
                  ) : null}
                </div>
              ))}
              {dirty ? <span className="sa-dirty">{en ? 'Unsaved changes' : 'غیر محفوظ تبدیلیاں'}</span> : null}
            </div>
          ) : null}

          {!darjahId ? (
            <div className="sa-empty">
              <p className="mb-0">{en ? 'Select a class to load the daily assessment grid.' : 'روزانہ اندراج کے لیے درجہ منتخب کریں۔'}</p>
            </div>
          ) : dailyLoading || dailyFetching ? (
            <p className="p-3 text-secondary">{t('common.loading')}</p>
          ) : filteredRows.length === 0 ? (
            <div className="sa-empty">
              <p className="mb-0">{t('common.noRecords')}</p>
            </div>
          ) : (
            <div className="sa-grid-wrap">
              <table className="sa-grid">
                <thead>
                  <tr>
                    <th className="sa-grid__sticky sa-grid__photo">{en ? 'Photo' : 'تصویر'}</th>
                    <th className="sa-grid__sticky sa-grid__roll">{en ? 'Roll' : 'رول'}</th>
                    <th className="sa-grid__sticky sa-grid__name">{en ? 'Student' : 'طالب علم'}</th>
                    {activeCategories.map((cat) => (
                      <th key={cat._id} style={{ borderTopColor: cat.color }}>
                        <span className="sa-cat-head" title={loc(cat.description, lng)}>
                          <i style={{ background: cat.color }} />
                          {loc(cat.name, lng)}
                        </span>
                      </th>
                    ))}
                    <th className="sa-grid__remarks">{en ? 'Remarks' : 'ریمارکس'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const sid = String(row.student._id)
                    const photo = photoOf(row.student)
                    return (
                      <tr key={sid}>
                        <td className="sa-grid__sticky sa-grid__photo">
                          {photo ? (
                            <img src={photo} alt="" className="sa-avatar" />
                          ) : (
                            <span className="sa-avatar sa-avatar--empty" />
                          )}
                        </td>
                        <td className="sa-grid__sticky sa-grid__roll">
                          <span className="sa-ltr">{row.student.rollNumber || row.student.studentId || '—'}</span>
                        </td>
                        <td className="sa-grid__sticky sa-grid__name">{loc(row.student.name, lng) || '—'}</td>
                        {activeCategories.map((cat) => (
                          <td key={cat._id}>
                            <CellEditor
                              category={cat}
                              value={draftCells[`${sid}:${cat._id}`] ?? ''}
                              onChange={(v) => setCell(sid, cat._id, v)}
                              en={en}
                            />
                          </td>
                        ))}
                        <td className="sa-grid__remarks">
                          <AppInput
                            value={draftRemarks[sid] || ''}
                            onChange={(e) => {
                              setDraftRemarks((p) => ({ ...p, [sid]: e.target.value }))
                              setDirty(true)
                            }}
                            placeholder={en ? 'Note…' : 'نوٹ…'}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {tab === 'categories' ? (
        <div className="sa-panel">
          {catsLoading ? (
            <p className="p-3 text-secondary">{t('common.loading')}</p>
          ) : (
            <div className="sa-cat-list">
              {[...categories]
                .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                .map((cat) => (
                  <div key={cat._id} className={`sa-cat-card${!cat.isActive ? ' is-inactive' : ''}`}>
                    <div className="sa-cat-card__swatch" style={{ background: cat.color }} />
                    <div className="sa-cat-card__body">
                      <h3 className="sa-cat-card__title">{loc(cat.name, lng)}</h3>
                      <p className="sa-cat-card__meta mb-0">
                        {loc(RATING_TYPE_LABELS[cat.ratingType] || { ur: cat.ratingType, en: cat.ratingType }, lng)}
                        {' · '}
                        {en ? `max ${cat.maxScore}` : `زیادہ سے زیادہ ${cat.maxScore}`}
                        {cat.isRequired ? ` · ${en ? 'required' : 'لازمی'}` : ''}
                        {!cat.isActive ? ` · ${en ? 'inactive' : 'غیر فعال'}` : ''}
                      </p>
                    </div>
                    <div className="sa-cat-card__actions">
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => moveCategory(cat, 'up')}>
                        ↑
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => moveCategory(cat, 'down')}>
                        ↓
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openEditCategory(cat)}>
                        {t('common.edit')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={async () => {
                          await patchCat({ id: cat._id, isActive: !cat.isActive })
                        }}
                      >
                        {cat.isActive ? (en ? 'Deactivate' : 'غیر فعال') : en ? 'Activate' : 'فعال'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => setArchiveCatTarget(cat)}
                      >
                        {en ? 'Archive' : 'آرکائیو'}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      ) : null}

      {tab === 'dashboard' ? (
        <div className="sa-panel">
          <div className="sa-toolbar">
            <label className="sa-field">
              <span>{en ? 'From' : 'سے'}</span>
              <AppDateInput value={analyticsFrom} onChange={setAnalyticsFrom} />
            </label>
            <label className="sa-field">
              <span>{en ? 'To' : 'تک'}</span>
              <AppDateInput value={analyticsTo} onChange={setAnalyticsTo} />
            </label>
            <label className="sa-field">
              <span>{en ? 'Class filter' : 'درجہ فلٹر'}</span>
              <AppSelect value={darjahId} onChange={(e) => setDarjahId(e.target.value)}>
                <option value="">{en ? 'All' : 'تمام'}</option>
                {darajat.map((d) => (
                  <option key={d._id} value={d._id}>
                    {loc(d.name, lng)}
                  </option>
                ))}
              </AppSelect>
            </label>
          </div>
          {analyticsLoading ? (
            <p className="p-3 text-secondary">{t('common.loading')}</p>
          ) : (
            <div className="sa-dash">
              <section className="sa-dash__card">
                <h3>{en ? 'By category' : 'کیٹیگری کے لحاظ سے'}</h3>
                <ul className="sa-dash__list">
                  {(analytics?.byCategory || []).map((row) => (
                    <li key={String(row.categoryId)}>
                      <span>{loc(row.category?.name, lng) || '—'}</span>
                      <strong dir="ltr">{row.avgScore != null ? Number(row.avgScore).toFixed(2) : '—'}</strong>
                    </li>
                  ))}
                  {!analytics?.byCategory?.length ? <li className="text-secondary">{t('common.noRecords')}</li> : null}
                </ul>
              </section>
              <section className="sa-dash__card">
                <h3>{en ? 'Top students' : 'نمایاں طلباء'}</h3>
                <ul className="sa-dash__list">
                  {(analytics?.topStudents || []).map((row) => (
                    <li key={String(row._id)}>
                      <span>{loc(row.student?.name, lng) || row.student?.studentId || '—'}</span>
                      <strong dir="ltr">{row.avgScore != null ? Number(row.avgScore).toFixed(2) : '—'}</strong>
                    </li>
                  ))}
                  {!analytics?.topStudents?.length ? <li className="text-secondary">{t('common.noRecords')}</li> : null}
                </ul>
              </section>
              <section className="sa-dash__card sa-dash__card--warn">
                <h3>{en ? 'Needs attention' : 'توجہ درکار'}</h3>
                <ul className="sa-dash__list">
                  {(analytics?.lowStudents || []).map((row) => (
                    <li key={String(row._id)}>
                      <span>{loc(row.student?.name, lng) || row.student?.studentId || '—'}</span>
                      <strong dir="ltr">{row.avgScore != null ? Number(row.avgScore).toFixed(2) : '—'}</strong>
                    </li>
                  ))}
                  {!analytics?.lowStudents?.length ? (
                    <li className="text-secondary">{en ? 'No low averages in range' : 'اس مدت میں کم اوسط نہیں'}</li>
                  ) : null}
                </ul>
              </section>
            </div>
          )}
        </div>
      ) : null}

      {tab === 'history' ? (
        <div className="sa-panel">
          <div className="sa-toolbar sa-toolbar--compact">
            <label className="sa-field sa-field--grow">
              <span>{en ? 'Student' : 'طالب علم'}</span>
              <AppSelect value={historyStudentId} onChange={(e) => setHistoryStudentId(e.target.value)}>
                <option value="">{en ? 'Select…' : 'منتخب…'}</option>
                {studentPickList.map((s) => (
                  <option key={s._id} value={s._id}>
                    {loc(s.name, lng)} ({s.studentId})
                  </option>
                ))}
              </AppSelect>
            </label>
            <label className="sa-field">
              <span>{en ? 'From' : 'سے'}</span>
              <AppDateInput value={analyticsFrom} onChange={setAnalyticsFrom} />
            </label>
            <label className="sa-field">
              <span>{en ? 'To' : 'تک'}</span>
              <AppDateInput value={analyticsTo} onChange={setAnalyticsTo} />
            </label>
          </div>

          {!historyStudentId ? (
            <div className="sa-empty">
              <p className="mb-0">{en ? 'Pick a student to view their assessment details.' : 'تفصیلات دیکھنے کے لیے طالب علم منتخب کریں۔'}</p>
            </div>
          ) : historyLoading ? (
            <p className="p-3 text-secondary mb-0">{t('common.loading')}</p>
          ) : (
            <>
              {historyData?.student ? (
                <div className="sa-detail-hero">
                  <div className="sa-detail-hero__identity">
                    {photoOf(historyData.student) ? (
                      <img src={photoOf(historyData.student)} alt="" className="sa-detail-hero__photo" />
                    ) : (
                      <span className="sa-detail-hero__photo sa-detail-hero__photo--empty" />
                    )}
                    <div className="sa-detail-hero__text">
                      <h2 className="sa-detail-hero__name">{loc(historyData.student.name, lng) || '—'}</h2>
                      <p className="sa-detail-hero__id sa-ltr mb-0">
                        {historyData.student.studentId || '—'}
                        {historyData.student.rollNumber ? ` · ${historyData.student.rollNumber}` : ''}
                      </p>
                    </div>
                  </div>
                  <dl className="sa-detail-meta">
                    <div>
                      <dt>{en ? 'Section' : 'شعبہ'}</dt>
                      <dd>{sectionLabelOf(historyData.student, lng)}</dd>
                    </div>
                    <div>
                      <dt>{en ? 'Class' : 'درجہ'}</dt>
                      <dd>{classLabelOf(historyData.student, lng)}</dd>
                    </div>
                    <div>
                      <dt>{en ? 'Session' : 'سیشن'}</dt>
                      <dd>{historyData.student.sessionId?.title || '—'}</dd>
                    </div>
                    <div>
                      <dt>{en ? 'Records' : 'ریکارڈز'}</dt>
                      <dd dir="ltr">{historyData.items?.length || 0}</dd>
                    </div>
                  </dl>
                  {(historyData.categoryAverages || []).length ? (
                    <div className="sa-detail-avgs">
                      {(historyData.categoryAverages || []).slice(0, 6).map((row) => (
                        <span key={String(row.category?._id || row.category)} className="sa-detail-avg-chip">
                          <i style={{ background: row.category?.color || '#0f8f5f' }} />
                          {loc(row.category?.name, lng) || '—'}
                          <strong dir="ltr">{row.avgScore != null ? Number(row.avgScore).toFixed(1) : '—'}</strong>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="sa-history-table-wrap">
                {!historyData?.items?.length ? (
                  <p className="p-3 text-secondary mb-0">{t('common.noRecords')}</p>
                ) : (
                  <table className="sa-history-table">
                    <thead>
                      <tr>
                        <th>{en ? 'Date' : 'تاریخ'}</th>
                        <th>{en ? 'Category' : 'کیٹیگری'}</th>
                        <th>{en ? 'Type' : 'قسم'}</th>
                        <th>{en ? 'Assessment' : 'جائزہ'}</th>
                        <th>{en ? 'Score' : 'اسکور'}</th>
                        <th>{en ? 'Remarks' : 'ریمارکس'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(historyData.items || []).map((item) => {
                        const dayRemark = (historyData.remarks || []).find(
                          (r) => r.activityDateKey === item.activityDateKey
                        )
                        const typeKey = item.categoryId?.ratingType || ''
                        return (
                          <tr key={item._id}>
                            <td className="sa-history-table__date">
                              {formatDisplayDate(item.activityDateKey, lng, mode) || item.activityDateKey}
                            </td>
                            <td>
                              <span className="sa-cat-head">
                                <i style={{ background: item.categoryId?.color || '#94a3b8' }} />
                                {loc(item.categoryId?.name, lng) || '—'}
                              </span>
                            </td>
                            <td className="text-secondary">
                              {typeKey && RATING_TYPE_LABELS[typeKey]
                                ? loc(RATING_TYPE_LABELS[typeKey], lng)
                                : typeKey || '—'}
                            </td>
                            <td>
                              <span className={`sa-value-pill sa-value-pill--${typeKey || 'score'}`}>
                                {formatActivityDisplayValue(item, lng)}
                              </span>
                            </td>
                            <td dir="ltr" className="sa-history-table__score">
                              {item.score != null && item.score !== '' ? item.score : '—'}
                            </td>
                            <td className="sa-history-table__remarks">
                              {item.remarks || dayRemark?.remarks || '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      ) : null}

      <AppModalShell
        open={catModalOpen}
        title={editingCat ? (en ? 'Edit category' : 'کیٹیگری ترمیم') : en ? 'Add category' : 'نئی کیٹیگری'}
        onClose={() => setCatModalOpen(false)}
        dialogClassName="id-cards-modal"
      >
        <div className="modal-app-body">
          <div className="sa-modal-grid">
            <div>
              <FormField
                label={en ? 'Name (Urdu)' : 'نام (اردو)'}
                htmlFor="sa-cat-name-ur"
                required
                error={catErrors['name.ur']}
              >
                <AppInput
                  id="sa-cat-name-ur"
                  value={catForm.nameUr}
                  onChange={(e) => {
                    const nameUr = e.target.value
                    setCatForm((p) => ({ ...p, nameUr }))
                    revalidateCat('name.ur', { name: { ur: nameUr, en: catForm.nameEn } })
                  }}
                  onBlur={() => onBlurCat('name.ur', { name: { ur: catForm.nameUr, en: catForm.nameEn } })}
                />
              </FormField>
            </div>
            <div>
              <FormField label={en ? 'Name (English)' : 'نام (انگریزی)'} htmlFor="sa-cat-name-en">
                <AppInput
                  id="sa-cat-name-en"
                  value={catForm.nameEn}
                  onChange={(e) => {
                    const nameEn = e.target.value
                    setCatForm((p) => ({ ...p, nameEn }))
                    revalidateCat('name.ur', { name: { ur: catForm.nameUr, en: nameEn } })
                  }}
                  latin
                />
              </FormField>
            </div>
            <div>
              <label className="form-label small">{en ? 'Rating type' : 'ریٹنگ قسم'}</label>
              <AppSelect
                value={catForm.ratingType}
                onChange={(e) => setCatForm((p) => ({ ...p, ratingType: e.target.value }))}
              >
                {RATING_TYPES.map((rt) => (
                  <option key={rt} value={rt}>
                    {loc(RATING_TYPE_LABELS[rt], lng) || rt}
                  </option>
                ))}
              </AppSelect>
            </div>
            <div>
              <label className="form-label small">{en ? 'Max score' : 'زیادہ سے زیادہ اسکور'}</label>
              <AppInput
                type="number"
                min={1}
                max={100}
                value={catForm.maxScore}
                onChange={(e) => setCatForm((p) => ({ ...p, maxScore: e.target.value }))}
                latin
              />
            </div>
            <div>
              <label className="form-label small">{en ? 'Color' : 'رنگ'}</label>
              <AppInput
                type="color"
                value={catForm.color}
                onChange={(e) => setCatForm((p) => ({ ...p, color: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label small">{en ? 'Icon key' : 'آئیکن'}</label>
              <AppInput value={catForm.icon} onChange={(e) => setCatForm((p) => ({ ...p, icon: e.target.value }))} latin />
            </div>
            <label className="sa-check">
              <input
                type="checkbox"
                checked={catForm.isRequired}
                onChange={(e) => setCatForm((p) => ({ ...p, isRequired: e.target.checked }))}
              />
              {en ? 'Required' : 'لازمی'}
            </label>
            <label className="sa-check">
              <input
                type="checkbox"
                checked={catForm.isActive}
                onChange={(e) => setCatForm((p) => ({ ...p, isActive: e.target.checked }))}
              />
              {en ? 'Active' : 'فعال'}
            </label>
          </div>
        </div>
        <div className="modal-app-footer d-flex flex-wrap gap-2 justify-content-end">
          <button type="button" className="btn btn-outline-secondary" onClick={() => setCatModalOpen(false)}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="btn btn-success"
            disabled={creatingCat || patchingCat}
            onClick={saveCategory}
          >
            {creatingCat || patchingCat ? t('common.loading') : t('common.save')}
          </button>
        </div>
      </AppModalShell>

      <ConfirmDeleteModal
        open={Boolean(archiveCatTarget)}
        title={en ? 'Archive category' : 'کیٹیگری آرکائیو'}
        message={en ? 'Archive this category?' : 'کیٹیگری آرکائیو کریں؟'}
        confirmLabel={en ? 'Archive' : 'آرکائیو'}
        onClose={() => setArchiveCatTarget(null)}
        onConfirm={async () => {
          await deleteCat({ id: archiveCatTarget._id }).unwrap()
        }}
      />
    </div>
  )
}
