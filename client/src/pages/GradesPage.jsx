import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import {
  useGetGradesQuery,
  useGetSessionsQuery,
  useGetTeachersQuery,
  useCreateGradeMutation,
  useUpdateGradeMutation,
  useDeleteGradeMutation,
} from '../services/api'
import { loc, flText } from '../shared/localized'
import BilingualLabel from '../components/BilingualLabel'
import AppModalShell from '../components/AppModalShell'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import DataTable from '../components/DataTable'
import { AppInput, AppSelect } from '../components/ui'
import PageHeading from '../components/PageHeading'
import { FL } from '../shared/fieldLabels'

const emptyLoc = () => ({ ur: '', en: '' })

export default function GradesPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const activeSessionId = useSelector((s) => s.session.activeSessionId)
  const { data: grades = [], isLoading, refetch } = useGetGradesQuery(
    activeSessionId ? { sessionId: activeSessionId } : undefined
  )
  const { data: sessions = [] } = useGetSessionsQuery()
  const { data: teachers = [] } = useGetTeachersQuery()
  const [createG] = useCreateGradeMutation()
  const [updateG] = useUpdateGradeMutation()
  const [deleteG] = useDeleteGradeMutation()
  const [modal, setModal] = useState(false)
  const [deleteGradeTarget, setDeleteGradeTarget] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    sessionId: '',
    year: new Date().getFullYear(),
    name: emptyLoc(),
    section: '',
    code: '',
    responsibleTeacherId: '',
  })

  function openNew() {
    setEditing(null)
    setForm({
      sessionId: activeSessionId || '',
      year: new Date().getFullYear(),
      name: emptyLoc(),
      section: '',
      code: '',
      responsibleTeacherId: '',
    })
    setModal(true)
  }

  function openEdit(g) {
    setEditing(g)
    setForm({
      sessionId: g.sessionId?._id || g.sessionId || '',
      year: g.year,
      name: g.name || emptyLoc(),
      section: g.section || '',
      code: g.code,
      responsibleTeacherId: g.responsibleTeacherId?._id || g.responsibleTeacherId || '',
    })
    setModal(true)
  }

  async function save(e) {
    e.preventDefault()
    const payload = {
      ...form,
      sessionId: form.sessionId || null,
      responsibleTeacherId: form.responsibleTeacherId || null,
    }
    if (editing) await updateG({ id: editing._id, ...payload }).unwrap()
    else await createG(payload).unwrap()
    setModal(false)
    refetch()
  }

  const columns = [
    { key: 'ses', headerKey: 'sessionTitle', cell: (g) => g.sessionId?.title || '—' },
    { key: 'year', headerKey: 'year', numeric: true, cell: (g) => g.year },
    { key: 'nm', headerKey: 'gradeRowName', cell: (g) => loc(g.name, lng) },
    { key: 'sec', headerKey: 'section', cell: (g) => g.section },
    { key: 'code', headerKey: 'code', numeric: true, cell: (g) => g.code },
    {
      key: 'resp',
      headerKey: 'responsibleTeacher',
      cell: (g) => (g.responsibleTeacherId ? loc(g.responsibleTeacherId.name, lng) : '—'),
    },
    {
      key: 'actions',
      headerKey: 'actions',
      hidePrint: true,
      cell: (g) => (
        <div className="data-table__actions">
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openEdit(g)}>
            {t('common.edit')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => setDeleteGradeTarget({ id: g._id, name: loc(g.name, lng) || String(g.code ?? '') })}
          >
            {t('common.delete')}
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeading
        navKey="navGrades"
        subtitle={`${flText(FL.totalGradesHint, lng)}: ${grades.length}`}
      >
        <button type="button" className="btn btn-sm btn-success no-print" onClick={openNew}>
          {t('common.add')}
        </button>
      </PageHeading>
      <DataTable
        columns={columns}
        rows={grades}
        getRowKey={(g) => g._id}
        isLoading={isLoading}
        loadingText={t('common.loading')}
        emptyText={t('common.noRecords')}
      />

      {modal && (
        <AppModalShell title={editing ? t('common.edit') : t('common.add')} onClose={() => setModal(false)}>
          <form className="modal-app-form" onSubmit={save}>
            <div className="modal-app-body">
                <div className="mb-2">
                  <BilingualLabel k="sessionTitle" htmlFor="g-ses" />
                  <AppSelect
                    id="g-ses"
                   
                    value={form.sessionId}
                    onChange={(e) => setForm({ ...form, sessionId: e.target.value })}
                  >
                    <option value="">—</option>
                    {sessions.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.title}
                      </option>
                    ))}
                  </AppSelect>
                </div>
                <div className="mb-2">
                  <BilingualLabel k="year" htmlFor="g-year" />
                  <AppInput
                    id="g-year"
                    type="number"
                   
                    value={form.year}
                    latin
                    onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                  />
                </div>
                <div className="mb-2">
                  <BilingualLabel k="gradeNameUr" htmlFor="g-nu" data-lang-field="ur" />
                  <AppInput
                    id="g-nu"
                   
                    data-lang-field="ur"
                    value={form.name.ur}
                    onChange={(e) => setForm({ ...form, name: { ...form.name, ur: e.target.value } })}
                  />
                </div>
                <div className="mb-2">
                  <BilingualLabel k="gradeNameEn" htmlFor="g-ne" data-lang-field="en" />
                  <AppInput
                    id="g-ne"
                   
                    data-lang-field="en"
                    value={form.name.en}
                    onChange={(e) => setForm({ ...form, name: { ...form.name, en: e.target.value } })}
                  />
                </div>
                <div className="mb-2">
                  <BilingualLabel k="section" htmlFor="g-sec" />
                  <AppInput
                    id="g-sec"
                   
                    value={form.section}
                    onChange={(e) => setForm({ ...form, section: e.target.value })}
                  />
                </div>
                <div className="mb-2">
                  <BilingualLabel k="code" htmlFor="g-code" required />
                  <AppInput
                    id="g-code"
                   
                    required
                    value={form.code}
                    latin
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                  />
                </div>
                <div className="mb-0">
                  <BilingualLabel k="responsibleTeacher" htmlFor="g-teach" />
                  <AppSelect
                    id="g-teach"
                   
                    value={form.responsibleTeacherId}
                    onChange={(e) => setForm({ ...form, responsibleTeacherId: e.target.value })}
                  >
                    <option value="">—</option>
                    {teachers.map((te) => (
                      <option key={te._id} value={te._id}>
                        {loc(te.name, lng)}
                      </option>
                    ))}
                  </AppSelect>
                </div>
            </div>
            <div className="modal-app-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn btn-success">
                {t('common.save')}
              </button>
            </div>
          </form>
        </AppModalShell>
      )}
      <ConfirmDeleteModal
        open={!!deleteGradeTarget}
        title={t('common.confirmDeleteTitle')}
        message={deleteGradeTarget ? t('common.confirmDeleteBody', { name: deleteGradeTarget.name }) : ''}
        onClose={() => setDeleteGradeTarget(null)}
        onConfirm={async () => {
          await deleteG(deleteGradeTarget.id).unwrap()
          refetch()
        }}
      />
    </div>
  )
}
