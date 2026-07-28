import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  useGetTeachersQuery,
  useDeleteTeacherMutation,
  useImportTeachersExcelMutation,
} from '../services/api'
import { loc } from '../shared/localized'
import { downloadCsv } from '../shared/exportCsv'
import DataTable from '../components/DataTable'
import PageHeading from '../components/PageHeading'
import TeacherSalaryPanel from '../components/TeacherSalaryPanel'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import { useFlash } from '../app/flash.jsx'
import {
  IconUpload,
  IconDownload,
  IconFileSpreadsheet,
  IconSearch,
  IconPlus,
  IconPencil,
  IconTrash,
  BtnIconLabel,
} from '../components/ListToolbarIcons'
import { AppInput } from '../components/ui'

export default function TeachersPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const navigate = useNavigate()
  const { showFlash } = useFlash()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'salary' ? 'salary' : 'list'

  const [q, setQ] = useState(() => searchParams.get('q') ?? '')
  const [deleteTeacherTarget, setDeleteTeacherTarget] = useState(null)

  useEffect(() => {
    setQ(searchParams.get('q') ?? '')
  }, [searchParams])

  const { data: teachers = [], isLoading, refetch } = useGetTeachersQuery({
    q: q || undefined,
  })

  const [deleteT] = useDeleteTeacherMutation()
  const [importExcel, { isLoading: importing }] = useImportTeachersExcelMutation()

  function setTab(next) {
    const nextTab = next === 'salary' ? 'salary' : 'list'
    const p = new URLSearchParams()
    if (nextTab === 'salary') p.set('tab', 'salary')
    if (q) p.set('q', q)
    setSearchParams(p)
  }

  function syncQToUrl(nextQ) {
    const p = new URLSearchParams()
    if (tab === 'salary') p.set('tab', 'salary')
    if (nextQ) p.set('q', nextQ)
    setSearchParams(p)
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
      showFlash(msg, 'success')
      refetch()
    } catch (err) {
      showFlash(err?.data?.message || err?.error || 'Import failed')
    }
  }

  function exportCsvClick() {
    const headers = ['name.ur', 'name.en', 'parentage.ur', 'parentage.en', 'idCard', 'phone', 'status']
    const rows = teachers.map((x) => [
      x.name?.ur || '',
      x.name?.en || '',
      x.parentage?.ur || '',
      x.parentage?.en || '',
      x.idCard || '',
      x.phone || '',
      x.status || '',
    ])
    downloadCsv({
      filename: `teachers-${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows,
    })
  }

  const columns = [
    { key: 'name', headerKey: 'fullName', cell: (x) => loc(x.name, lng) },
    { key: 'par', headerKey: 'teacherParentage', cell: (x) => loc(x.parentage, lng) },
    { key: 'id', headerKey: 'idCard', numeric: true, cell: (x) => x.idCard },
    { key: 'ph', headerKey: 'phone', numeric: true, cell: (x) => x.phone },
    {
      key: 'district',
      headerKey: 'districtCurrentLabel',
      cell: (x) => loc(x.districtCurrent, lng) || loc(x.cityLoc, lng) || '—',
    },
    { key: 'st', headerKey: 'status', cell: (x) => x.status },
    {
      key: 'actions',
      headerKey: 'actions',
      hidePrint: true,
      cell: (x) => (
        <div className="data-table__actions">
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => navigate(`/teachers/${x._id}/edit`)}>
            <BtnIconLabel icon={<IconPencil />}>{t('common.edit')}</BtnIconLabel>
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => setDeleteTeacherTarget({ id: x._id, name: loc(x.name, lng) || '—' })}
          >
            <BtnIconLabel icon={<IconTrash />}>{t('common.delete')}</BtnIconLabel>
          </button>
        </div>
      ),
    },
  ]

  const en = lng?.toLowerCase().startsWith('en')

  return (
    <div className="teachers-hub">
      {tab === 'list' ? (
        <>
          <PageHeading
            navKey="navTeachers"
            subtitle={
              en
                ? `Total teachers: ${teachers.length}`
                : `کل اساتذہ: ${teachers.length}`
            }
          >
            <button type="button" className="btn btn-sm btn-success" onClick={() => navigate('/teachers/new')}>
              <BtnIconLabel icon={<IconPlus />}>{t('common.add')}</BtnIconLabel>
            </button>
          </PageHeading>

          <div className="page-toolbar page-toolbar--strip page-toolbar--list-page mb-3">
            <div className="page-toolbar__filters-wrap min-w-0 w-100">
              <div className="d-flex flex-wrap gap-2 align-items-center w-100 list-page-toolbar-row">
                <div className="flex-grow-1 min-w-0" style={{ flexBasis: '12rem' }}>
                  <label className="visually-hidden" htmlFor="teachers-q">
                    {en ? 'Detailed search' : 'تفصیلی تلاش'}
                  </label>
                  <div className="input-group input-group-sm">
                    <AppInput
                      id="teachers-q"
                      placeholder={t('teachers.searchPlaceholder')}
                      value={q}
                      onChange={(e) => {
                        const v = e.target.value
                        setQ(v)
                        syncQToUrl(v)
                      }}
                      aria-label="Search teachers"
                    />
                  </div>
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
                  href="/import-templates/teachers-import-sample.xlsx"
                  download="teachers-import-sample.xlsx"
                >
                  <BtnIconLabel icon={<IconFileSpreadsheet />}>
                    {lng === 'ur' ? 'نمونہ فائل (اساتذہ)' : 'Sample file (teachers)'}
                  </BtnIconLabel>
                </a>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={exportCsvClick}>
                  <BtnIconLabel icon={<IconDownload />}>
                    {lng === 'ur' ? 'ایکسپورٹ (CSV)' : 'Export (CSV)'}
                  </BtnIconLabel>
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="mb-3">
          <PageHeading navKey="navTeachers" />
        </div>
      )}

      <div className="teachers-hub__tabs no-print d-flex flex-wrap gap-2 mb-3 align-items-center">
        <button
          type="button"
          className={`btn btn-sm ${tab === 'list' ? 'btn-success' : 'btn-outline-secondary'}`}
          onClick={() => setTab('list')}
        >
          {en ? 'All teachers' : 'تمام اساتذہ'}
        </button>
        <button
          type="button"
          className={`btn btn-sm ${tab === 'salary' ? 'btn-success' : 'btn-outline-secondary'}`}
          onClick={() => setTab('salary')}
        >
          {en ? 'Teacher salary system' : 'اساتذہ کی تنخواہ کا نظام'}
        </button>
        {tab === 'salary' ? (
          <button
            type="button"
            className="btn btn-sm btn-outline-primary ms-auto"
            onClick={() => navigate('/teachers/new')}
          >
            <BtnIconLabel icon={<IconPlus />}>{en ? 'New teacher' : 'نیا استاد'}</BtnIconLabel>
          </button>
        ) : null}
      </div>

      {tab === 'salary' ? (
        <TeacherSalaryPanel teachers={teachers} lng={lng} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={teachers}
            getRowKey={(row) => row._id}
            isLoading={isLoading}
            loadingText={t('common.loading')}
            emptyText={t('common.noRecords')}
          />
        </>
      )}
      <ConfirmDeleteModal
        open={!!deleteTeacherTarget}
        title={t('common.confirmDeleteTitle')}
        message={deleteTeacherTarget ? t('common.confirmDeleteBody', { name: deleteTeacherTarget.name }) : ''}
        onClose={() => setDeleteTeacherTarget(null)}
        onConfirm={async () => {
          await deleteT(deleteTeacherTarget.id).unwrap()
          refetch()
        }}
      />
    </div>
  )
}
