import { useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  useGetSessionsQuery,
  useGetSubjectsQuery,
  useGetDarajatQuery,
  useGetSubjectBooksQuery,
  useCreateSubjectBookMutation,
  useUpdateSubjectBookMutation,
  useDeleteSubjectBookMutation,
} from '../services/api'
import { loc } from '../shared/localized'
import DataTable from '../components/DataTable'
import { AppInput, AppSelect, AppCheckbox, FormField } from '../components/ui'
import PageHeading from '../components/PageHeading'
import AppModalShell from '../components/AppModalShell'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import FilterDrawer, { FilterToolbar } from '../components/FilterDrawer'
import { useFormValidation, numberMin } from '../shared/validation'
import { bookFormSchema } from '../shared/validation/formSchemas'

const emptyLoc = () => ({ ur: '', en: '' })

const FIELD_IDS = {
  sessionId: 'bk-ses',
  subjectId: 'bk-sub',
  darjahId: 'bk-dj',
  'title.ur': 'bk-u',
  totalPages: 'bk-pages',
}

export default function TartibatBooksPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language

  const { data: sessions = [] } = useGetSessionsQuery()

  const [sessionFilter, setSessionFilter] = useState('')
  const [darjahFilter, setDarjahFilter] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [search, setSearch] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [draft, setDraft] = useState({ session: '', subject: '', darjah: '' })

  useEffect(() => {
    if (!filterOpen) return
    setDraft({
      session: sessionFilter,
      subject: subjectFilter,
      darjah: darjahFilter,
    })
  }, [filterOpen, sessionFilter, subjectFilter, darjahFilter])

  const { data: darajatForDraft = [] } = useGetDarajatQuery(
    draft.session ? { sessionId: draft.session } : undefined,
    { skip: !filterOpen || !draft.session }
  )
  const { data: subjectsForDraft = [] } = useGetSubjectsQuery(
    draft.session ? { sessionId: draft.session } : undefined,
    { skip: !filterOpen || !draft.session }
  )

  const darajatForDraftPick = useMemo(() => {
    if (!draft.subject) return darajatForDraft
    return darajatForDraft.filter((d) =>
      (d.subjectIds || []).some((x) => String(x._id || x) === String(draft.subject))
    )
  }, [darajatForDraft, draft.subject])

  const filterActiveCount = useMemo(() => {
    let n = 0
    if (sessionFilter) n += 1
    if (subjectFilter) n += 1
    if (darjahFilter) n += 1
    return n
  }, [sessionFilter, subjectFilter, darjahFilter])

  const listParams = useMemo(() => {
    const o = {}
    if (sessionFilter) o.sessionId = sessionFilter
    if (subjectFilter) o.subjectId = subjectFilter
    if (darjahFilter) o.darjahId = darjahFilter
    return Object.keys(o).length ? o : undefined
  }, [sessionFilter, subjectFilter, darjahFilter])

  const { data: books = [], isLoading, refetch } = useGetSubjectBooksQuery(listParams)

  const filteredBooks = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return books
    return books.filter((b) => {
      const hay = [
        loc(b.title, lng),
        b.title?.ur,
        b.title?.en,
        loc(b.author, lng),
        b.author?.ur,
        b.author?.en,
        loc(b.subjectId?.name, lng),
        loc(b.darjahId?.name, lng),
        b.sessionId?.title,
        b.totalPages,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [books, search, lng])

  const [createOne] = useCreateSubjectBookMutation()
  const [updateOne] = useUpdateSubjectBookMutation()
  const [deleteOne] = useDeleteSubjectBookMutation()

  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteBookTarget, setDeleteBookTarget] = useState(null)
  const [form, setForm] = useState({
    sessionId: '',
    darjahId: '',
    subjectId: '',
    title: emptyLoc(),
    author: emptyLoc(),
    totalPages: '',
    isActive: true,
  })
  const [saving, setSaving] = useState(false)

  const schema = useMemo(() => ({ ...bookFormSchema, totalPages: numberMin(1) }), [])
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
    order: ['sessionId', 'subjectId', 'darjahId', 'title.ur', 'totalPages'],
  })

  const { data: darajatForm = [] } = useGetDarajatQuery(
    form.sessionId ? { sessionId: form.sessionId } : undefined,
    { skip: !form.sessionId }
  )
  const { data: subjectsAll = [] } = useGetSubjectsQuery(
    form.sessionId ? { sessionId: form.sessionId } : undefined,
    { skip: !form.sessionId }
  )

  const darjahOptionsInForm = useMemo(() => {
    if (!form.subjectId) return []
    return darajatForm.filter((d) =>
      (d.subjectIds || []).some((x) => String(x._id || x) === String(form.subjectId))
    )
  }, [darajatForm, form.subjectId])

  function openNew() {
    setEditing(null)
    setForm({
      sessionId: sessionFilter || '',
      darjahId: '',
      subjectId: '',
      title: emptyLoc(),
      author: emptyLoc(),
      totalPages: '',
      isActive: true,
    })
    setErrors({})
    setModal(true)
  }

  function openEdit(x) {
    setEditing(x)
    const ses =
      x.subjectId?.sessionId?._id ||
      x.subjectId?.sessionId ||
      x.darjahId?.sessionId?._id ||
      x.darjahId?.sessionId ||
      ''
    setForm({
      sessionId: ses ? String(ses) : '',
      darjahId: x.darjahId?._id || x.darjahId || '',
      subjectId: x.subjectId?._id || x.subjectId || '',
      title: x.title || emptyLoc(),
      author: x.author || emptyLoc(),
      totalPages: x.totalPages ?? '',
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
    const payload = {
      darjahId: form.darjahId,
      subjectId: form.subjectId,
      title: form.title,
      author: form.author,
      isActive: form.isActive,
    }
    if (form.totalPages !== '') {
      payload.totalPages = Number(form.totalPages)
    }
    setSaving(true)
    try {
      if (editing) await updateOne({ id: editing._id, ...payload }).unwrap()
      else await createOne(payload).unwrap()
      setModal(false)
      refetch()
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    {
      key: 'ses',
      headerKey: 'sessionTitle',
      cell: (x) => x.subjectId?.sessionId?.title || x.darjahId?.sessionId?.title || '—',
    },
    {
      key: 'sub',
      headerKey: 'subjectName',
      cell: (x) => (x.subjectId?.name ? loc(x.subjectId.name, lng) : '—'),
    },
    {
      key: 'dj',
      headerKey: 'darjahName',
      cell: (x) => (x.darjahId?.name ? loc(x.darjahId.name, lng) : '—'),
    },
    { key: 'ttl', headerKey: 'bookTitle', cell: (x) => loc(x.title, lng) },
    { key: 'auth', headerKey: 'bookAuthor', cell: (x) => loc(x.author, lng) || '—' },
    {
      key: 'pages',
      header: t('bookReading.totalPages'),
      cell: (x) => (x.totalPages ? <span dir="ltr">{x.totalPages}</span> : '—'),
    },
    {
      key: 'act',
      headerKey: 'isActive',
      cell: (x) =>
        x.isActive ? (lng === 'ur' ? 'فعال' : 'Active') : lng === 'ur' ? 'غیر فعال' : 'Inactive',
    },
    {
      key: 'actions',
      headerKey: 'actions',
      hidePrint: true,
      cell: (x) => (
        <div className="data-table__actions">
          <Link to={`/book-reading/${x._id}?add=1`} className="btn btn-sm btn-success">
            {t('bookReading.trackReading')}
          </Link>
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openEdit(x)}>
            {t('common.edit')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => setDeleteBookTarget({ id: x._id, name: loc(x.title, lng) || '—' })}
          >
            {t('common.delete')}
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeading navKey="navTartibatBooks">
        <button type="button" className="btn btn-sm btn-success no-print" onClick={openNew}>
          {t('common.add')}
        </button>
      </PageHeading>

      <FilterToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={lng === 'ur' ? 'کتاب، مصنف، شعبہ، درجہ…' : 'Book, author, subject, class…'}
        searchId="books-search"
        onOpenFilters={() => setFilterOpen(true)}
        activeCount={filterActiveCount}
      />

      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onApply={() => {
          setSessionFilter(draft.session)
          setSubjectFilter(draft.subject)
          setDarjahFilter(draft.darjah)
          setFilterOpen(false)
        }}
        onReset={() => {
          setDraft({ session: '', subject: '', darjah: '' })
        }}
      >
        <div className="filter-drawer__field">
          <label className="filter-drawer__label" htmlFor="books-f-session">
            {lng === 'ur' ? 'سیشن' : 'Session'}
          </label>
          <AppSelect
            id="books-f-session"
            className="w-100"
            value={draft.session}
            onChange={(e) => {
              setDraft({ session: e.target.value, subject: '', darjah: '' })
            }}
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
        <div className="filter-drawer__field">
          <label className="filter-drawer__label" htmlFor="books-f-subject">
            {lng === 'ur' ? 'شعبہ جات' : 'Subajat'}
          </label>
          <AppSelect
            key={`draft-sub-${draft.session || 'all'}`}
            id="books-f-subject"
            className="w-100"
            value={draft.subject}
            onChange={(e) => {
              setDraft((prev) => ({ ...prev, subject: e.target.value, darjah: '' }))
            }}
            disabled={!draft.session}
            aria-label="Subajat filter"
          >
            <option value="">{lng === 'ur' ? 'تمام شعبہ جات' : 'All Subajat'}</option>
            {subjectsForDraft.map((s) => (
              <option key={s._id} value={s._id}>
                {loc(s.name, lng)}
              </option>
            ))}
          </AppSelect>
        </div>
        <div className="filter-drawer__field">
          <label className="filter-drawer__label" htmlFor="books-f-darjah">
            {lng === 'ur' ? 'درجہ' : 'Darjah'}
          </label>
          <AppSelect
            key={`draft-dj-${draft.session || 'all'}-${draft.subject || 'all'}`}
            id="books-f-darjah"
            className="w-100"
            value={draft.darjah}
            onChange={(e) => setDraft((prev) => ({ ...prev, darjah: e.target.value }))}
            disabled={!draft.session}
            aria-label="Darjah filter"
          >
            <option value="">{lng === 'ur' ? 'تمام درجات' : 'All darajat'}</option>
            {darajatForDraftPick.map((d) => (
              <option key={d._id} value={d._id}>
                {loc(d.name, lng)}
              </option>
            ))}
          </AppSelect>
        </div>
      </FilterDrawer>

      <DataTable
        columns={columns}
        rows={filteredBooks}
        getRowKey={(row) => row._id}
        isLoading={isLoading}
        loadingText={t('common.loading')}
        emptyText={t('common.noRecords')}
      />

      {modal && (
        <AppModalShell title={editing ? t('common.edit') : t('common.add')} onClose={() => setModal(false)}>
          <form className="modal-app-form" onSubmit={save}>
            <div className="modal-app-body">
              <FormField k="sessionTitle" htmlFor="bk-ses" required className="mb-2" error={fieldErrors.sessionId}>
                <AppSelect
                  id="bk-ses"
                  value={form.sessionId}
                  onChange={(e) => {
                    const next = {
                      ...form,
                      sessionId: e.target.value,
                      darjahId: '',
                      subjectId: '',
                    }
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
              <FormField k="subjectName" htmlFor="bk-sub" required className="mb-2" error={fieldErrors.subjectId}>
                <AppSelect
                  id="bk-sub"
                  value={form.subjectId}
                  onChange={(e) => {
                    const next = { ...form, subjectId: e.target.value, darjahId: '' }
                    setForm(next)
                    revalidateIfError('subjectId', next)
                  }}
                  onBlur={() => onBlurField('subjectId', form)}
                  disabled={!form.sessionId}
                >
                  <option value="">—</option>
                  {subjectsAll.map((s) => (
                    <option key={s._id} value={s._id}>
                      {loc(s.name, lng)}
                    </option>
                  ))}
                </AppSelect>
              </FormField>
              <FormField
                label={lng === 'ur' ? 'درجات (کلاس)' : 'Darjah (class)'}
                htmlFor="bk-dj"
                required
                className="mb-2"
                error={fieldErrors.darjahId}
              >
                <AppSelect
                  id="bk-dj"
                  value={form.darjahId}
                  onChange={(e) => {
                    const next = { ...form, darjahId: e.target.value }
                    setForm(next)
                    revalidateIfError('darjahId', next)
                  }}
                  onBlur={() => onBlurField('darjahId', form)}
                  disabled={!form.subjectId}
                >
                  <option value="">—</option>
                  {darjahOptionsInForm.map((d) => (
                    <option key={d._id} value={d._id}>
                      {loc(d.name, lng)}
                    </option>
                  ))}
                </AppSelect>
              </FormField>
              <FormField
                k="bookTitleUr"
                htmlFor="bk-u"
                className="mb-2"
                langField="ur"
                error={fieldErrors['title.ur']}
              >
                <AppInput
                  id="bk-u"
                  data-lang-field="ur"
                  value={form.title.ur}
                  onChange={(e) => {
                    const next = { ...form, title: { ...form.title, ur: e.target.value } }
                    setForm(next)
                    revalidateIfError('title.ur', next)
                  }}
                  onBlur={() => onBlurField('title.ur', form)}
                  dir="rtl"
                />
              </FormField>
              <FormField k="bookTitleEn" htmlFor="bk-e" className="mb-2" langField="en">
                <AppInput
                  id="bk-e"
                  data-lang-field="en"
                  value={form.title.en}
                  latin
                  onChange={(e) => {
                    const next = { ...form, title: { ...form.title, en: e.target.value } }
                    setForm(next)
                    revalidateIfError('title.ur', next)
                  }}
                  onBlur={() => onBlurField('title.ur', form)}
                />
              </FormField>
              <FormField k="bookAuthorUr" htmlFor="bk-au" className="mb-2" langField="ur">
                <AppInput
                  id="bk-au"
                  data-lang-field="ur"
                  value={form.author.ur}
                  onChange={(e) => setForm({ ...form, author: { ...form.author, ur: e.target.value } })}
                  dir="rtl"
                />
              </FormField>
              <FormField k="bookAuthorEn" htmlFor="bk-ae" className="mb-2" langField="en">
                <AppInput
                  id="bk-ae"
                  data-lang-field="en"
                  value={form.author.en}
                  latin
                  onChange={(e) => setForm({ ...form, author: { ...form.author, en: e.target.value } })}
                />
              </FormField>
              <FormField
                label={t('bookReading.totalPages')}
                htmlFor="bk-pages"
                className="mb-2"
                error={fieldErrors.totalPages}
              >
                <AppInput
                  id="bk-pages"
                  type="number"
                  min={1}
                  value={form.totalPages}
                  latin
                  onChange={(e) => {
                    const next = { ...form, totalPages: e.target.value }
                    setForm(next)
                    revalidateIfError('totalPages', next)
                  }}
                  onBlur={() => onBlurField('totalPages', form)}
                  placeholder={t('bookReading.totalPagesHint')}
                />
              </FormField>
              <AppCheckbox
                id="bk-act"
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
        open={!!deleteBookTarget}
        title={t('common.confirmDeleteTitle')}
        message={deleteBookTarget ? t('common.confirmDeleteBody', { name: deleteBookTarget.name }) : ''}
        onClose={() => setDeleteBookTarget(null)}
        onConfirm={async () => {
          await deleteOne(deleteBookTarget.id).unwrap()
          refetch()
        }}
      />
    </div>
  )
}
