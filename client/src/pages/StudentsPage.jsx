import { useMemo, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import {
  useGetStudentsQuery,
  useGetGradesQuery,
  useGetDarajatQuery,
  useGetSubjectsQuery,
  useDeleteStudentMutation,
  useImportStudentsExcelMutation,
  useGetFeeBalancesQuery,
} from '../services/api'
import { loc } from '../shared/localized'
import { downloadCsv } from '../shared/exportCsv'
import DataTable from '../components/DataTable'
import PageHeading from '../components/PageHeading'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import FilterDrawer, { FilterToolbar } from '../components/FilterDrawer'
import {
  IconUpload,
  IconDownload,
  IconFileSpreadsheet,
  IconPrint,
  IconPlus,
  IconPencil,
  IconTrash,
  BtnIconLabel,
} from '../components/ListToolbarIcons'
import { AppSelect } from '../components/ui'
import './studentsPage.css'

const PAGE_SIZE = 10

function buildPageList(current, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const pages = new Set([1, totalPages, current, current - 1, current + 1])
  if (current <= 3) [2, 3, 4].forEach((p) => pages.add(p))
  if (current >= totalPages - 2) [totalPages - 1, totalPages - 2, totalPages - 3].forEach((p) => pages.add(p))
  return [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)
}

export default function StudentsPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const en = lng?.toLowerCase().startsWith('en')
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filterOpen, setFilterOpen] = useState(false)
  const [deleteStudentTarget, setDeleteStudentTarget] = useState(null)

  const activeSessionId = useSelector((s) => s.session.activeSessionId)

  const q = searchParams.get('q') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const filters = useMemo(
    () => ({
      darjahId: searchParams.get('darjahId') || '',
      subjectId: searchParams.get('subjectId') || '',
      gradeId: searchParams.get('gradeId') || '',
    }),
    [searchParams]
  )
  const [draft, setDraft] = useState(filters)

  const syncParams = useCallback(
    (next) => {
      const params = {}
      if (next.q) params.q = next.q
      if (next.page && next.page > 1) params.page = String(next.page)
      if (next.darjahId) params.darjahId = next.darjahId
      if (next.subjectId) params.subjectId = next.subjectId
      if (next.gradeId) params.gradeId = next.gradeId
      setSearchParams(params)
    },
    [setSearchParams]
  )

  const listParams = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      q: q || undefined,
      ...(activeSessionId ? { sessionId: activeSessionId } : {}),
      ...(filters.darjahId ? { darjahId: filters.darjahId } : {}),
      ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
      ...(filters.gradeId ? { gradeId: filters.gradeId } : {}),
    }),
    [page, q, activeSessionId, filters]
  )

  const { data, isLoading, isFetching, refetch } = useGetStudentsQuery(listParams)
  const students = useMemo(() => (Array.isArray(data) ? data : data?.items ?? []), [data])
  const pagination = useMemo(() => {
    if (Array.isArray(data)) {
      return { page: 1, limit: students.length, total: students.length, totalPages: 1 }
    }
    return data?.pagination || { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 }
  }, [data, students.length])

  const { data: feeBalances = [] } = useGetFeeBalancesQuery(
    activeSessionId ? { sessionId: activeSessionId } : undefined
  )
  const dueByStudent = useMemo(() => {
    const map = {}
    for (const b of feeBalances) {
      const sid = String(b.studentId?._id || b.studentId || '')
      if (sid) map[sid] = Number(b.due) || 0
    }
    return map
  }, [feeBalances])

  const { data: grades = [] } = useGetGradesQuery(
    activeSessionId ? { sessionId: activeSessionId } : undefined
  )
  const { data: darajat = [] } = useGetDarajatQuery(
    activeSessionId ? { sessionId: activeSessionId } : undefined,
    { skip: !activeSessionId }
  )
  const { data: subjects = [] } = useGetSubjectsQuery(
    activeSessionId ? { sessionId: activeSessionId } : undefined,
    { skip: !activeSessionId }
  )
  const [deleteStudent] = useDeleteStudentMutation()
  const [importExcel, { isLoading: importing }] = useImportStudentsExcelMutation()

  const gradeName = useMemo(() => {
    const map = {}
    grades.forEach((g) => {
      map[g._id] = loc(g.name, lng)
    })
    return map
  }, [grades, lng])

  const darjahName = useMemo(() => {
    const map = {}
    darajat.forEach((d) => {
      map[d._id] = loc(d.name, lng) + (d.code ? ` (${d.code})` : '')
    })
    return map
  }, [darajat, lng])

  function studentClassLabel(s) {
    if (s.darjahId?.name) {
      const code = s.darjahId.code ? ` (${s.darjahId.code})` : ''
      return loc(s.darjahId.name, lng) + code
    }
    const id = s.darjahId?._id || s.darjahId
    if (id && darjahName[id]) return darjahName[id]
    return (
      gradeName[s.currentGradeId?._id || s.currentGradeId] ||
      gradeName[s.gradeId?._id || s.gradeId] ||
      '—'
    )
  }

  const filterActiveCount = [filters.darjahId, filters.subjectId, filters.gradeId].filter(Boolean).length

  async function onImportFileChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await importExcel(fd).unwrap()
      const msg =
        (lng === 'ur' ? 'امپورٹ مکمل' : 'Import complete') +
        `\n${lng === 'ur' ? 'کل' : 'Total'}: ${res.total}\n${lng === 'ur' ? 'ہو گیا' : 'Created'}: ${res.created}\n${lng === 'ur' ? 'فیل' : 'Failed'}: ${res.failed}`
      alert(msg)
      refetch()
    } catch (err) {
      alert(err?.data?.message || err?.error || 'Import failed')
    }
  }

  function exportCsvClick() {
    const headers = [
      'studentId',
      'name.ur',
      'name.en',
      'fatherName.ur',
      'fatherName.en',
      'gender',
      'idCard',
      'phone',
      'city',
    ]
    const rows = students.map((s) => [
      s.studentId || '',
      s.name?.ur || '',
      s.name?.en || '',
      s.fatherName?.ur || '',
      s.fatherName?.en || '',
      s.gender || '',
      s.idCard || '',
      s.phone || '',
      s.city || '',
    ])
    downloadCsv({
      filename: `students-${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows,
    })
  }

  function openPrintAllCards() {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (activeSessionId) params.set('sessionId', activeSessionId)
    if (filters.darjahId) params.set('darjahId', filters.darjahId)
    if (filters.subjectId) params.set('subjectId', filters.subjectId)
    if (filters.gradeId) params.set('gradeId', filters.gradeId)
    params.set('templateKey', 'pvc-prestige')
    const qs = params.toString()
    navigate(`/id-cards/print${qs ? `?${qs}` : ''}`)
  }

  const pageList = buildPageList(pagination.page, pagination.totalPages)
  const from = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1
  const to = Math.min(pagination.page * pagination.limit, pagination.total)

  const columns = [
    { key: 'studentId', headerKey: 'studentId', numeric: true, cell: (s) => s.studentId },
    { key: 'name', headerKey: 'fullName', cell: (s) => loc(s.name, lng) },
    {
      key: 'class',
      headerKey: 'classGrade',
      cell: (s) => studentClassLabel(s),
    },
    { key: 'father', headerKey: 'fatherName', cell: (s) => loc(s.fatherName, lng) },
    { key: 'idCard', headerKey: 'idCard', numeric: true, cell: (s) => s.idCard || '—' },
    { key: 'phone', headerKey: 'phone', numeric: true, cell: (s) => s.phone },
    { key: 'city', headerKey: 'city', cell: (s) => s.city },
    {
      key: 'due',
      header: lng === 'ur' ? 'واجب الادا فیس' : 'Fee due',
      numeric: true,
      cell: (s) => {
        const due = dueByStudent[String(s._id)] || 0
        if (!due) return <span className="text-secondary" dir="ltr">0</span>
        return (
          <span className="fee-due-amount" dir="ltr" title={lng === 'ur' ? 'واجب الادا فیس' : 'Fee due'}>
            {due}
          </span>
        )
      },
    },
    {
      key: 'actions',
      headerKey: 'actions',
      hidePrint: true,
      cell: (s) => (
        <div className="data-table__actions">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => navigate(`/id-cards/print?ids=${s._id}&templateKey=pvc-prestige`)}
          >
            <BtnIconLabel icon={<IconPrint />}>{lng === 'ur' ? 'پرنٹ' : 'Print'}</BtnIconLabel>
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={() => navigate(`/students/${s._id}/edit`)}
          >
            <BtnIconLabel icon={<IconPencil />}>{t('common.edit')}</BtnIconLabel>
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => setDeleteStudentTarget({ id: s._id, name: loc(s.name, lng) || '—' })}
          >
            <BtnIconLabel icon={<IconTrash />}>{t('common.delete')}</BtnIconLabel>
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="students-page">
      <PageHeading navKey="navStudents">
        <button type="button" className="btn btn-sm btn-success no-print" onClick={() => navigate('/students/new')}>
          <BtnIconLabel icon={<IconPlus />}>{t('common.add')}</BtnIconLabel>
        </button>
      </PageHeading>

      <FilterToolbar
        search={q}
        onSearchChange={(v) => {
          syncParams({ q: v, page: 1, ...filters })
        }}
        searchPlaceholder={t('students.searchPlaceholder')}
        searchId="student-search"
        onOpenFilters={() => {
          setDraft(filters)
          setFilterOpen(true)
        }}
        activeCount={filterActiveCount}
      >
        <label className={`btn btn-sm btn-outline-secondary mb-0 students-page__tool ${importing ? 'disabled' : ''}`}>
          <BtnIconLabel icon={<IconUpload />}>
            {lng === 'ur' ? (importing ? 'امپورٹ…' : 'ایکسل امپورٹ') : importing ? 'Importing…' : 'Excel Import'}
          </BtnIconLabel>
          <input
            type="file"
            accept=".xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            hidden
            disabled={importing}
            onChange={onImportFileChange}
          />
        </label>
        <a
          className="btn btn-sm btn-outline-secondary students-page__tool"
          href="/import-templates/students-import-sample.xlsx"
          download="students-import-sample.xlsx"
        >
          <BtnIconLabel icon={<IconFileSpreadsheet />}>
            {lng === 'ur' ? 'نمونہ فائل (طلباء)' : 'Sample file (students)'}
          </BtnIconLabel>
        </a>
        <button type="button" className="btn btn-sm btn-outline-secondary students-page__tool" onClick={exportCsvClick}>
          <BtnIconLabel icon={<IconDownload />}>
            {lng === 'ur' ? 'ایکسپورٹ (CSV)' : 'Export (CSV)'}
          </BtnIconLabel>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-primary no-print students-page__tool students-page__tool--print"
          onClick={openPrintAllCards}
          title={en ? 'Print student ID cards (CR80)' : 'شناختی کارڈز پرنٹ کریں (CR80)'}
        >
          <BtnIconLabel icon={<IconPrint />}>{t('common.print')}</BtnIconLabel>
        </button>
      </FilterToolbar>

      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title={en ? 'Filter students' : 'طلباء فلٹر کریں'}
        onApply={() => {
          syncParams({ q, page: 1, ...draft })
          setFilterOpen(false)
        }}
        onReset={() => {
          setDraft({ darjahId: '', subjectId: '', gradeId: '' })
        }}
      >
        <div className="filter-drawer__field">
          <label className="filter-drawer__label" htmlFor="st-filter-darjah">
            {lng === 'ur' ? 'درجہ' : 'Class / Darjah'}
          </label>
          <AppSelect
            id="st-filter-darjah"
            className="w-100"
            value={draft.darjahId}
            onChange={(e) => setDraft((prev) => ({ ...prev, darjahId: e.target.value }))}
          >
            <option value="">{lng === 'ur' ? 'تمام درجات' : 'All classes'}</option>
            {darajat.map((d) => (
              <option key={d._id} value={d._id}>
                {loc(d.name, lng)}
                {d.code ? ` (${d.code})` : ''}
              </option>
            ))}
          </AppSelect>
        </div>
        <div className="filter-drawer__field">
          <label className="filter-drawer__label" htmlFor="st-filter-subject">
            {lng === 'ur' ? 'شعبہ جات' : 'Subject'}
          </label>
          <AppSelect
            id="st-filter-subject"
            className="w-100"
            value={draft.subjectId}
            onChange={(e) => setDraft((prev) => ({ ...prev, subjectId: e.target.value }))}
          >
            <option value="">{lng === 'ur' ? 'تمام شعبہ جات' : 'All subjects'}</option>
            {subjects.map((s) => (
              <option key={s._id} value={s._id}>
                {loc(s.name, lng)}
              </option>
            ))}
          </AppSelect>
        </div>
        <div className="filter-drawer__field">
          <label className="filter-drawer__label" htmlFor="st-filter-grade">
            {lng === 'ur' ? 'میراثی کلاس (گریڈ)' : 'Legacy grade'}
          </label>
          <AppSelect
            id="st-filter-grade"
            className="w-100"
            value={draft.gradeId}
            onChange={(e) => setDraft((prev) => ({ ...prev, gradeId: e.target.value }))}
          >
            <option value="">{lng === 'ur' ? 'تمام' : 'All'}</option>
            {grades.map((g) => (
              <option key={g._id} value={g._id}>
                {loc(g.name, lng)}
                {g.section ? ` — ${g.section}` : ''}
              </option>
            ))}
          </AppSelect>
        </div>
      </FilterDrawer>

      <DataTable
        columns={columns}
        rows={students}
        getRowKey={(row) => row._id}
        isLoading={isLoading || isFetching}
        loadingText={t('common.loading')}
        emptyText={t('common.noRecords')}
      />

      {pagination.total > 0 ? (
        <nav className="students-pagination no-print" aria-label={en ? 'Students pagination' : 'طلباء صفحات'}>
          <div className="students-pagination__meta">
            <span className="students-pagination__count">
              {en ? (
                <>
                  Showing <strong>{from}</strong>–<strong>{to}</strong> of <strong>{pagination.total}</strong>
                </>
              ) : (
                <>
                  <strong>{from}</strong>–<strong>{to}</strong> از <strong>{pagination.total}</strong>
                </>
              )}
            </span>
          </div>
          <div className="students-pagination__controls">
            <button
              type="button"
              className="students-pagination__nav"
              disabled={pagination.page <= 1}
              onClick={() => {
                syncParams({ q, page: pagination.page - 1, ...filters })
              }}
            >
              {en ? 'Prev' : 'پچھلا'}
            </button>
            <div className="students-pagination__pages">
              {pageList.map((p, idx) => {
                const prev = pageList[idx - 1]
                const showEllipsis = prev != null && p - prev > 1
                return (
                  <span key={p} className="students-pagination__page-wrap">
                    {showEllipsis ? <span className="students-pagination__ellipsis">…</span> : null}
                    <button
                      type="button"
                      className={`students-pagination__page${p === pagination.page ? ' is-active' : ''}`}
                      aria-current={p === pagination.page ? 'page' : undefined}
                      onClick={() => {
                        syncParams({ q, page: p, ...filters })
                      }}
                    >
                      {p}
                    </button>
                  </span>
                )
              })}
            </div>
            <button
              type="button"
              className="students-pagination__nav"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => {
                syncParams({ q, page: pagination.page + 1, ...filters })
              }}
            >
              {en ? 'Next' : 'اگلا'}
            </button>
          </div>
        </nav>
      ) : null}

      <ConfirmDeleteModal
        open={!!deleteStudentTarget}
        title={t('common.confirmDeleteTitle')}
        message={deleteStudentTarget ? t('common.confirmDeleteBody', { name: deleteStudentTarget.name }) : ''}
        onClose={() => setDeleteStudentTarget(null)}
        onConfirm={async () => {
          await deleteStudent(deleteStudentTarget.id).unwrap()
          refetch()
        }}
      />
    </div>
  )
}
