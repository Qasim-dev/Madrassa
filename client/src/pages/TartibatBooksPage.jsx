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
import { AppInput, AppSelect, AppCheckbox } from '../components/ui'
import PageHeading from '../components/PageHeading'
import AppModalShell from '../components/AppModalShell'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import BilingualLabel from '../components/BilingualLabel'
import FilterDrawer, { FilterToolbar } from '../components/FilterDrawer'

const emptyLoc = () => ({ ur: '', en: '' })

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
    setModal(true)
  }

  async function save(e) {
    e.preventDefault()
    if (!form.sessionId || !form.darjahId || !form.subjectId) return
    if (!form.title.ur.trim() && !form.title.en.trim()) return
    const payload = {
      darjahId: form.darjahId,
      subjectId: form.subjectId,
      title: form.title,
      author: form.author,
      isActive: form.isActive,
    }
    if (form.totalPages !== '') {
      const tp = Number(form.totalPages)
      if (!Number.isFinite(tp) || tp < 1) return
      payload.totalPages = tp
    }
    if (editing) await updateOne({ id: editing._id, ...payload }).unwrap()
    else await createOne(payload).unwrap()
    setModal(false)
    refetch()
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
              <div className="mb-2">
                <BilingualLabel k="sessionTitle" htmlFor="bk-ses" required />
                <AppSelect
                  id="bk-ses"
                 
                  value={form.sessionId}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      sessionId: e.target.value,
                      darjahId: '',
                      subjectId: '',
                    })
                  }
                  required
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
                <BilingualLabel k="subjectName" htmlFor="bk-sub" required />
                <AppSelect
                  id="bk-sub"
                 
                  value={form.subjectId}
                  onChange={(e) => setForm({ ...form, subjectId: e.target.value, darjahId: '' })}
                  disabled={!form.sessionId}
                  required
                >
                  <option value="">—</option>
                  {subjectsAll.map((s) => (
                    <option key={s._id} value={s._id}>
                      {loc(s.name, lng)}
                    </option>
                  ))}
                </AppSelect>
              </div>
              <div className="mb-2">
                <span className="form-label small d-block mb-1">
                  {lng === 'ur' ? 'درجات (کلاس)' : 'Darjah (class)'}
                </span>
                <AppSelect
                  id="bk-dj"
                 
                  value={form.darjahId}
                  onChange={(e) => setForm({ ...form, darjahId: e.target.value })}
                  disabled={!form.subjectId}
                  required
                >
                  <option value="">—</option>
                  {darjahOptionsInForm.map((d) => (
                    <option key={d._id} value={d._id}>
                      {loc(d.name, lng)}
                    </option>
                  ))}
                </AppSelect>
              </div>
              <div className="mb-2">
                <BilingualLabel k="bookTitleUr" htmlFor="bk-u" data-lang-field="ur" />
                <AppInput
                  id="bk-u"
                 
                  data-lang-field="ur"
                  value={form.title.ur}
                  onChange={(e) => setForm({ ...form, title: { ...form.title, ur: e.target.value } })}
                  dir="rtl"
                />
              </div>
              <div className="mb-2">
                <BilingualLabel k="bookTitleEn" htmlFor="bk-e" data-lang-field="en" />
                <AppInput
                  id="bk-e"
                 
                  data-lang-field="en"
                  value={form.title.en}
                  latin
                    onChange={(e) => setForm({ ...form, title: { ...form.title, en: e.target.value } })}
                />
              </div>
              <div className="mb-2">
                <BilingualLabel k="bookAuthorUr" htmlFor="bk-au" data-lang-field="ur" />
                <AppInput
                  id="bk-au"
                 
                  data-lang-field="ur"
                  value={form.author.ur}
                  onChange={(e) => setForm({ ...form, author: { ...form.author, ur: e.target.value } })}
                  dir="rtl"
                />
              </div>
              <div className="mb-2">
                <BilingualLabel k="bookAuthorEn" htmlFor="bk-ae" data-lang-field="en" />
                <AppInput
                  id="bk-ae"
                 
                  data-lang-field="en"
                  value={form.author.en}
                  latin
                    onChange={(e) => setForm({ ...form, author: { ...form.author, en: e.target.value } })}
                />
              </div>
              <div className="mb-2">
                <label className="form-label small" htmlFor="bk-pages">{t('bookReading.totalPages')}</label>
                <AppInput
                  id="bk-pages"
                  type="number"
                  min={1}
                 
                  value={form.totalPages}
                  latin
                    onChange={(e) => setForm({ ...form, totalPages: e.target.value })}
                  placeholder={t('bookReading.totalPagesHint')}
                />
              </div>
              <AppCheckbox
                id="bk-act"
                checked={!!form.isActive}
                onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
                label={lng === 'ur' ? 'فعال' : 'Active'}
                size="sm"
              />
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
