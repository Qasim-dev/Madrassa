import { useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useGetSessionsQuery,
  useGetSubjectsQuery,
  useCreateSubjectMutation,
  useUpdateSubjectMutation,
  useDeleteSubjectMutation,
} from '../services/api'
import { loc } from '../shared/localized'
import DataTable from '../components/DataTable'
import { AppInput, AppSelect, AppCheckbox, FormField } from '../components/ui'
import PageHeading from '../components/PageHeading'
import AppModalShell from '../components/AppModalShell'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import FilterDrawer, { FilterToolbar } from '../components/FilterDrawer'
import { useFormValidation } from '../shared/validation'
import { subjectFormSchema } from '../shared/validation/formSchemas'

const emptyLoc = () => ({ ur: '', en: '' })

const FIELD_IDS = { sessionId: 'subj-ses', 'name.ur': 'subj-u' }

export default function TartibatSubjectsPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const [sessionFilter, setSessionFilter] = useState('')
  const [search, setSearch] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [draft, setDraft] = useState({ session: '' })

  useEffect(() => {
    if (!filterOpen) return
    setDraft({ session: sessionFilter })
  }, [filterOpen, sessionFilter])

  const filterActiveCount = useMemo(() => (sessionFilter ? 1 : 0), [sessionFilter])

  const { data: sessions = [] } = useGetSessionsQuery()
  const { data: subjects = [], isLoading, refetch } = useGetSubjectsQuery(
    sessionFilter ? { sessionId: sessionFilter } : undefined
  )
  const [createOne] = useCreateSubjectMutation()
  const [updateOne] = useUpdateSubjectMutation()
  const [deleteOne] = useDeleteSubjectMutation()

  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteSubjectTarget, setDeleteSubjectTarget] = useState(null)
  const [form, setForm] = useState({ sessionId: '', name: emptyLoc(), systemType: emptyLoc(), isActive: true })
  const [saving, setSaving] = useState(false)

  const {
    errors: fieldErrors,
    onBlurField,
    revalidateIfError,
    validateAll,
    focusInvalid,
    setErrors,
  } = useFormValidation({
    schema: subjectFormSchema,
    t,
    fieldIds: FIELD_IDS,
    order: ['sessionId', 'name.ur'],
  })

  const filteredSubjects = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return subjects
    return subjects.filter((x) => {
      const hay = [
        loc(x.name, lng),
        x.name?.ur,
        x.name?.en,
        loc(x.systemType, lng),
        x.systemType?.ur,
        x.systemType?.en,
        x.sessionId?.title,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [subjects, search, lng])

  function openNew() {
    setEditing(null)
    setForm({ sessionId: sessionFilter || '', name: emptyLoc(), systemType: emptyLoc(), isActive: true })
    setErrors({})
    setModal(true)
  }

  function openEdit(x) {
    setEditing(x)
    setForm({
      sessionId: x.sessionId?._id || x.sessionId || '',
      name: x.name || emptyLoc(),
      systemType: x.systemType || emptyLoc(),
      isActive: x.isActive !== false,
    })
    setErrors({})
    setModal(true)
  }

  async function save(e) {
    e.preventDefault()
    const next = validateAll(form)
    if (Object.keys(next).length) {
      focusInvalid(next)
      return
    }
    setSaving(true)
    try {
      if (editing) await updateOne({ id: editing._id, ...form }).unwrap()
      else await createOne(form).unwrap()
      setModal(false)
      refetch()
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'ses', headerKey: 'sessionTitle', cell: (x) => x.sessionId?.title || '—' },
    { key: 'nm', headerKey: 'subjectName', cell: (x) => loc(x.name, lng) },
    { key: 'sys', headerKey: 'subjectSystemType', cell: (x) => loc(x.systemType, lng) || '—' },
    { key: 'act', headerKey: 'isActive', cell: (x) => (x.isActive ? (lng === 'ur' ? 'فعال' : 'Active') : (lng === 'ur' ? 'غیر فعال' : 'Inactive')) },
    {
      key: 'actions',
      headerKey: 'actions',
      hidePrint: true,
      cell: (x) => (
        <div className="data-table__actions">
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openEdit(x)}>
            {t('common.edit')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => setDeleteSubjectTarget({ id: x._id, name: loc(x.name, lng) || '—' })}
          >
            {t('common.delete')}
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeading navKey="navTartibatSubjects">
        <button type="button" className="btn btn-sm btn-success no-print" onClick={openNew}>
          {t('common.add')}
        </button>
      </PageHeading>

      <FilterToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={lng === 'ur' ? 'شعبہ، نظام / قسم، سیشن…' : 'Subject, type, session…'}
        searchId="subj-search"
        onOpenFilters={() => setFilterOpen(true)}
        activeCount={filterActiveCount}
      />

      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onApply={() => {
          setSessionFilter(draft.session)
          setFilterOpen(false)
        }}
        onReset={() => {
          setDraft({ session: '' })
        }}
      >
        <div className="filter-drawer__field">
          <label className="filter-drawer__label" htmlFor="subj-toolbar-session">
            {lng === 'ur' ? 'سیشن' : 'Session'}
          </label>
          <AppSelect
            id="subj-toolbar-session"
            className="w-100"
            value={draft.session}
            onChange={(e) => setDraft({ session: e.target.value })}
            aria-label="Session filter"
          >
            <option value="">{lng === 'ur' ? 'تمام سیشن' : 'All sessions'}</option>
            {sessions.map((s) => (
              <option key={s._id} value={s._id}>
                {s.title}
              </option>
            ))}
          </AppSelect>
        </div>
      </FilterDrawer>

      <DataTable
        columns={columns}
        rows={filteredSubjects}
        getRowKey={(row) => row._id}
        isLoading={isLoading}
        loadingText={t('common.loading')}
        emptyText={t('common.noRecords')}
      />

      {modal && (
        <AppModalShell title={editing ? t('common.edit') : t('common.add')} onClose={() => setModal(false)}>
          <form className="modal-app-form" onSubmit={save}>
            <div className="modal-app-body">
              <FormField k="sessionTitle" htmlFor="subj-ses" required className="mb-2" error={fieldErrors.sessionId}>
                <AppSelect
                  id="subj-ses"
                  value={form.sessionId}
                  onChange={(e) => {
                    const next = { ...form, sessionId: e.target.value }
                    setForm(next)
                    revalidateIfError('sessionId', next)
                  }}
                  onBlur={() => onBlurField('sessionId', form)}
                >
                  <option value="">—</option>
                  {sessions.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.title}
                    </option>
                  ))}
                </AppSelect>
              </FormField>
              <FormField
                k="subjectNameUr"
                htmlFor="subj-u"
                className="mb-2"
                langField="ur"
                error={fieldErrors['name.ur']}
              >
                <AppInput
                  id="subj-u"
                  data-lang-field="ur"
                  value={form.name.ur}
                  onChange={(e) => {
                    const next = { ...form, name: { ...form.name, ur: e.target.value } }
                    setForm(next)
                    revalidateIfError('name.ur', next)
                  }}
                  onBlur={() => onBlurField('name.ur', form)}
                  dir="rtl"
                />
              </FormField>
              <FormField k="subjectNameEn" htmlFor="subj-e" className="mb-2" langField="en">
                <AppInput
                  id="subj-e"
                  data-lang-field="en"
                  value={form.name.en}
                  latin
                  onChange={(e) => {
                    const next = { ...form, name: { ...form.name, en: e.target.value } }
                    setForm(next)
                    revalidateIfError('name.ur', next)
                  }}
                  onBlur={() => onBlurField('name.ur', form)}
                />
              </FormField>
              <FormField k="subjectSystemTypeUr" htmlFor="subj-sys-u" className="mb-2" langField="ur">
                <AppInput
                  id="subj-sys-u"
                  data-lang-field="ur"
                  value={form.systemType.ur}
                  onChange={(e) => setForm({ ...form, systemType: { ...form.systemType, ur: e.target.value } })}
                  dir="rtl"
                />
              </FormField>
              <FormField k="subjectSystemTypeEn" htmlFor="subj-sys-e" className="mb-2" langField="en">
                <AppInput
                  id="subj-sys-e"
                  data-lang-field="en"
                  value={form.systemType.en}
                  latin
                  onChange={(e) => setForm({ ...form, systemType: { ...form.systemType, en: e.target.value } })}
                />
              </FormField>
              <AppCheckbox
                id="subj-act"
                checked={!!form.isActive}
                onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
                label={lng === 'ur' ? 'فعال' : 'Active'}
                size="sm"
              />
            </div>
            <div className="modal-app-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setModal(false)} disabled={saving}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn btn-success" disabled={saving}>
                {saving ? t('validation.formSaving') : t('common.save')}
              </button>
            </div>
          </form>
        </AppModalShell>
      )}
      <ConfirmDeleteModal
        open={!!deleteSubjectTarget}
        title={t('common.confirmDeleteTitle')}
        message={deleteSubjectTarget ? t('common.confirmDeleteBody', { name: deleteSubjectTarget.name }) : ''}
        onClose={() => setDeleteSubjectTarget(null)}
        onConfirm={async () => {
          await deleteOne(deleteSubjectTarget.id).unwrap()
          refetch()
        }}
      />
    </div>
  )
}

