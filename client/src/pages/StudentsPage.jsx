import { useMemo, useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import {
  useGetStudentsQuery,
  useGetGradesQuery,
  useGetDarajatQuery,
  useDeleteStudentMutation,
  useImportStudentsExcelMutation,
  useGetFeeBalancesQuery,
} from '../services/api'
import { loc } from '../shared/localized'
import { downloadCsv } from '../shared/exportCsv'
import DataTable from '../components/DataTable'
import PageHeading from '../components/PageHeading'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import {
  IconUpload,
  IconDownload,
  IconFileSpreadsheet,
  IconFilter,
  IconPrint,
  IconPlus,
  IconPencil,
  IconTrash,
  BtnIconLabel,
} from '../components/ListToolbarIcons'
import { AppInput } from '../components/ui'

export default function StudentsPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [q, setQ] = useState(() => searchParams.get('q') ?? '')
  const [deleteStudentTarget, setDeleteStudentTarget] = useState(null)

  useEffect(() => {
    setQ(searchParams.get('q') ?? '')
  }, [searchParams])

  const activeSessionId = useSelector((s) => s.session.activeSessionId)
  const { data: students = [], isLoading, refetch } = useGetStudentsQuery({
    q: q || undefined,
    ...(activeSessionId ? { sessionId: activeSessionId } : {}),
  })
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
            onClick={() => navigate(`/students/${s._id}/print`)}
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
    <div>
      <PageHeading navKey="navStudents">
        <button type="button" className="btn btn-sm btn-success no-print" onClick={() => navigate('/students/new')}>
          <BtnIconLabel icon={<IconPlus />}>{t('common.add')}</BtnIconLabel>
        </button>
      </PageHeading>

      <div className="page-toolbar page-toolbar--strip page-toolbar--list-page">
        <div className="page-toolbar__filters-wrap min-w-0 w-100">
          <div className="d-flex flex-wrap gap-2 align-items-center w-100 list-page-toolbar-row">
            <div className="flex-grow-1 min-w-0" style={{ flexBasis: '12rem' }}>
              <label className="visually-hidden" htmlFor="student-search">
                {lng === 'ur' ? 'تلاش' : t('common.search')}
              </label>
              <AppInput
                id="student-search"
                className="w-100"
                placeholder={t('students.searchPlaceholder')}
                value={q}
                onChange={(e) => {
                  const v = e.target.value
                  setQ(v)
                  if (v) setSearchParams({ q: v })
                  else setSearchParams({})
                }}
                aria-label="Search students"
              />
            </div>
            <label className={`btn btn-sm btn-outline-secondary mb-0 ${importing ? 'disabled' : ''}`}>
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
              className="btn btn-sm btn-outline-secondary"
              href="/import-templates/students-import-sample.xlsx"
              download="students-import-sample.xlsx"
            >
              <BtnIconLabel icon={<IconFileSpreadsheet />}>
                {lng === 'ur' ? 'نمونہ فائل (طلباء)' : 'Sample file (students)'}
              </BtnIconLabel>
            </a>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={exportCsvClick}>
              <BtnIconLabel icon={<IconDownload />}>
                {lng === 'ur' ? 'ایکسپورٹ (CSV)' : 'Export (CSV)'}
              </BtnIconLabel>
            </button>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => refetch()}>
              <BtnIconLabel icon={<IconFilter />}>{t('common.filter')}</BtnIconLabel>
            </button>
            <button type="button" className="btn btn-sm btn-outline-primary no-print" onClick={() => window.print()}>
              <BtnIconLabel icon={<IconPrint />}>{t('common.print')}</BtnIconLabel>
            </button>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={students}
        getRowKey={(row) => row._id}
        isLoading={isLoading}
        loadingText={t('common.loading')}
        emptyText={t('common.noRecords')}
      />
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
