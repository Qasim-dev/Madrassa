import { useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import {
  useGetSessionsQuery,
  useGetSubjectsQuery,
  useGetDarajatQuery,
  useGetTeachersQuery,
  useGetSubjectBooksQuery,
  useCreateDarjahMutation,
  useUpdateDarjahMutation,
  useDeleteDarjahMutation,
} from '../services/api'
import { loc } from '../shared/localized'
import DataTable from '../components/DataTable'
import { AppInput, AppSelect, AppCheckbox } from '../components/ui'
import PageHeading from '../components/PageHeading'
import AppModalShell from '../components/AppModalShell'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import BilingualLabel from '../components/BilingualLabel'
import FilterDrawer, { FilterToolbar } from '../components/FilterDrawer'

/** Follow the global header session selector (MainLayout). */
const SESSION_FOLLOW_HEADER = '__follow_header__'
const SESSION_ALL = ''

const emptyLoc = () => ({ ur: '', en: '' })

export default function TartibatDarajatPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const activeSessionId = useSelector((s) => s.session.activeSessionId)

  const { data: sessions = [] } = useGetSessionsQuery()
  const { data: subjects = [] } = useGetSubjectsQuery()
  const { data: teachers = [] } = useGetTeachersQuery()

  const [sessionFilter, setSessionFilter] = useState(SESSION_FOLLOW_HEADER)
  /** Linked subject (شعبہ جات column). */
  const [subjectFilter, setSubjectFilter] = useState('')
  const [darjahFilter, setDarjahFilter] = useState('')
  const [search, setSearch] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [draft, setDraft] = useState({
    session: SESSION_FOLLOW_HEADER,
    subject: '',
    darjah: '',
  })

  useEffect(() => {
    if (!filterOpen) return
    setDraft({
      session: sessionFilter,
      subject: subjectFilter,
      darjah: darjahFilter,
    })
  }, [filterOpen, sessionFilter, subjectFilter, darjahFilter])

  const resolvedSessionId = useMemo(() => {
    if (sessionFilter === SESSION_FOLLOW_HEADER) return activeSessionId || ''
    if (sessionFilter === SESSION_ALL) return ''
    return sessionFilter
  }, [sessionFilter, activeSessionId])

  const draftResolvedSessionId = useMemo(() => {
    if (draft.session === SESSION_FOLLOW_HEADER) return activeSessionId || ''
    if (draft.session === SESSION_ALL) return ''
    return draft.session
  }, [draft.session, activeSessionId])

  const { data: darajat = [], isLoading, refetch } = useGetDarajatQuery(
    resolvedSessionId ? { sessionId: resolvedSessionId } : undefined
  )

  const { data: darajatForDraft = [] } = useGetDarajatQuery(
    draftResolvedSessionId ? { sessionId: draftResolvedSessionId } : undefined,
    { skip: !filterOpen }
  )

  const subjectsForDraft = useMemo(() => {
    const list = !draftResolvedSessionId
      ? subjects
      : subjects.filter((s) => String(s.sessionId?._id || s.sessionId || '') === String(draftResolvedSessionId))
    return [...list].sort((a, b) =>
      String(loc(a.name, lng)).localeCompare(String(loc(b.name, lng)), undefined, { sensitivity: 'base' })
    )
  }, [subjects, draftResolvedSessionId, lng])

  const darajatForDraftPick = useMemo(() => {
    if (!draft.subject) return darajatForDraft
    return darajatForDraft.filter(
      (d) =>
        Array.isArray(d.subjectIds) &&
        d.subjectIds.some((sid) => String(sid._id || sid) === String(draft.subject))
    )
  }, [darajatForDraft, draft.subject])

  const filterActiveCount = useMemo(() => {
    let n = 0
    if (sessionFilter !== SESSION_FOLLOW_HEADER) n += 1
    if (subjectFilter) n += 1
    if (darjahFilter) n += 1
    return n
  }, [sessionFilter, subjectFilter, darjahFilter])

  const tableRows = useMemo(() => {
    let rows = darajat
    if (subjectFilter) {
      rows = rows.filter(
        (d) =>
          Array.isArray(d.subjectIds) &&
          d.subjectIds.some((sid) => String(sid._id || sid) === String(subjectFilter))
      )
    }
    if (darjahFilter) {
      rows = rows.filter((d) => String(d._id) === String(darjahFilter))
    }
    const q = search.trim().toLowerCase()
    if (q) {
      rows = rows.filter((d) => {
        const subjectNames = (d.subjectIds || [])
          .map((sid) => {
            const s = typeof sid === 'object' ? sid : subjects.find((x) => String(x._id) === String(sid))
            return s ? `${loc(s.name, lng)} ${s.name?.ur || ''} ${s.name?.en || ''}` : ''
          })
          .join(' ')
        const hay = [
          loc(d.name, lng),
          d.name?.ur,
          d.name?.en,
          d.code,
          d.sessionId?.title,
          subjectNames,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return hay.includes(q)
      })
    }
    return rows
  }, [darajat, subjectFilter, darjahFilter, search, subjects, lng])

  const [createOne] = useCreateDarjahMutation()
  const [updateOne] = useUpdateDarjahMutation()
  const [deleteOne] = useDeleteDarjahMutation()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteDarjahTarget, setDeleteDarjahTarget] = useState(null)
  const [form, setForm] = useState({
    sessionId: '',
    name: emptyLoc(),
    code: '',
    subjectIds: [],
    assignments: [],
    __aDraft: { subjectId: '', teacherId: '', bookId: '' },
    isActive: true,
  })

  function openNew() {
    setEditing(null)
    setForm({
      sessionId: resolvedSessionId || '',
      name: emptyLoc(),
      code: '',
      subjectIds: [],
      assignments: [],
      __aDraft: { subjectId: '', teacherId: '', bookId: '' },
      isActive: true,
    })
    setModal(true)
  }

  function openEdit(x) {
    setEditing(x)
    const sidList = Array.isArray(x.subjectIds) ? x.subjectIds.map((s) => String(s._id || s)) : []
    const assignments = Array.isArray(x.assignments)
      ? x.assignments.map((a) => ({
          subjectId: a?.subjectId?._id || a?.subjectId || '',
          teacherId: a?.teacherId?._id || a?.teacherId || '',
          bookId: a?.bookId?._id || a?.bookId || '',
        }))
      : []
    setForm({
      sessionId: x.sessionId?._id || x.sessionId || '',
      name: x.name || emptyLoc(),
      code: x.code || '',
      subjectIds: sidList,
      assignments,
      __aDraft: { subjectId: '', teacherId: '', bookId: '' },
      isActive: x.isActive !== false,
    })
    setModal(true)
  }

  async function save(e) {
    e.preventDefault()
    if (!form.sessionId) return
    if (!form.name.ur.trim() && !form.name.en.trim()) return
    const { __aDraft, ...rest } = form
    const payload = {
      ...rest,
      code: String(form.code || '').trim(),
      subjectIds: form.subjectIds || [],
      assignments: (form.assignments || []).filter((a) => a && (a.subjectId || a.teacherId || a.bookId)),
    }
    if (editing) await updateOne({ id: editing._id, ...payload }).unwrap()
    else await createOne(payload).unwrap()
    setModal(false)
    refetch()
  }

  const subjectLabel = useMemo(() => {
    const m = new Map()
    subjects.forEach((s) => m.set(s._id, loc(s.name, lng)))
    return m
  }, [subjects, lng])

  const subjectsForSession = useMemo(
    () =>
      subjects.filter((s) => String(s.sessionId?._id || s.sessionId || '') === String(form.sessionId || '')),
    [subjects, form.sessionId]
  )

  const subjectsForAssignments = useMemo(() => {
    const allow = new Set((form.subjectIds || []).map((x) => String(x)))
    return subjectsForSession.filter((s) => allow.has(String(s._id)))
  }, [subjectsForSession, form.subjectIds])

  const aDraft = form.__aDraft || { subjectId: '', teacherId: '', bookId: '' }
  // Load ALL books for this darjah so existing assignment rows can display titles reliably
  const { data: darjahBooks = [] } = useGetSubjectBooksQuery(editing?._id ? { darjahId: editing._id } : undefined, {
    skip: !editing?._id,
  })

  const bookOptionsForDraft = useMemo(() => {
    if (!aDraft.subjectId) return []
    return darjahBooks.filter((b) => String(b.subjectId?._id || b.subjectId || '') === String(aDraft.subjectId))
  }, [darjahBooks, aDraft.subjectId])

  const bookLabel = useMemo(() => {
    const m = new Map()
    darjahBooks.forEach((b) => m.set(String(b._id), loc(b.title, lng)))
    return m
  }, [darjahBooks, lng])

  const columns = [
    { key: 'ses', headerKey: 'sessionTitle', cell: (x) => x.sessionId?.title || '—' },
    { key: 'nm', headerKey: 'darjahName', cell: (x) => loc(x.name, lng) },
    { key: 'code', headerKey: 'code', cell: (x) => x.code || '—' },
    {
      key: 'subs',
      headerKey: 'darjahSubjects',
      cell: (x) =>
        Array.isArray(x.subjectIds) && x.subjectIds.length > 0
          ? x.subjectIds.map((s) => subjectLabel.get(s._id || s) || '—').join(', ')
          : '—',
    },
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
            onClick={() => setDeleteDarjahTarget({ id: x._id, name: loc(x.name, lng) || '—' })}
          >
            {t('common.delete')}
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeading navKey="navTartibatDarajat">
        <button type="button" className="btn btn-sm btn-success no-print" onClick={openNew}>
          {t('common.add')}
        </button>
      </PageHeading>

      <FilterToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={lng === 'ur' ? 'درجہ، کوڈ، شعبہ، سیشن…' : 'Class, code, subject, session…'}
        searchId="dj-search"
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
          setDraft({
            session: SESSION_FOLLOW_HEADER,
            subject: '',
            darjah: '',
          })
        }}
      >
        <div className="filter-drawer__field">
          <label className="filter-drawer__label" htmlFor="dj-toolbar-session">
            {lng === 'ur' ? 'سیشن' : 'Session'}
          </label>
          <AppSelect
            id="dj-toolbar-session"
            className="w-100"
            value={draft.session}
            onChange={(e) => {
              setDraft((prev) => ({
                ...prev,
                session: e.target.value,
                subject: '',
                darjah: '',
              }))
            }}
            aria-label="Session filter"
          >
            <option value={SESSION_FOLLOW_HEADER}>
              {lng === 'ur' ? 'موجودہ سیشن (ہیڈر)' : 'Current session (header)'}
            </option>
            <option value={SESSION_ALL}>{lng === 'ur' ? 'تمام سیشن' : 'All sessions'}</option>
            {sessions.map((s) => (
              <option key={s._id} value={s._id}>
                {s.title}
              </option>
            ))}
          </AppSelect>
        </div>
        <div className="filter-drawer__field">
          <label className="filter-drawer__label" htmlFor="dj-toolbar-subject">
            {lng === 'ur' ? 'شعبہ جات' : 'Subajat'}
          </label>
          <AppSelect
            key={`draft-sub-${draftResolvedSessionId || 'all'}`}
            id="dj-toolbar-subject"
            className="w-100"
            value={draft.subject}
            onChange={(e) => {
              setDraft((prev) => ({ ...prev, subject: e.target.value, darjah: '' }))
            }}
            disabled={isLoading}
            placeholder={lng === 'ur' ? 'شعبہ جات تلاش کریں…' : 'Search subajat…'}
            aria-label={lng === 'ur' ? 'شعبہ جات' : 'Subajat'}
          >
            <option value="">{lng === 'ur' ? 'تمام شعبہ جات' : 'All Subajat'}</option>
            {subjectsForDraft.map((s) => {
              const st = loc(s.systemType, lng)
              const nm = loc(s.name, lng)
              return (
                <option key={s._id} value={s._id}>
                  {[nm, st].filter(Boolean).join(' — ')}
                </option>
              )
            })}
          </AppSelect>
        </div>
        <div className="filter-drawer__field">
          <label className="filter-drawer__label" htmlFor="dj-toolbar-darjah">
            {lng === 'ur' ? 'درجہ' : 'Darjah'}
          </label>
          <AppSelect
            key={`draft-dj-${draftResolvedSessionId || 'all'}-${draft.subject || 'all'}`}
            id="dj-toolbar-darjah"
            className="w-100"
            value={draft.darjah}
            onChange={(e) => setDraft((prev) => ({ ...prev, darjah: e.target.value }))}
            disabled={isLoading}
            placeholder={lng === 'ur' ? 'درجہ تلاش کریں…' : 'Search darjah…'}
            aria-label={lng === 'ur' ? 'درجہ' : 'Darjah'}
          >
            <option value="">{lng === 'ur' ? 'تمام درجات' : 'All darajat'}</option>
            {darajatForDraftPick.map((d) => (
              <option key={d._id} value={d._id}>
                {[loc(d.name, lng), d.code ? String(d.code).trim() : ''].filter(Boolean).join(' — ')}
              </option>
            ))}
          </AppSelect>
        </div>
      </FilterDrawer>

      <DataTable
        columns={columns}
        rows={tableRows}
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
                <BilingualLabel k="sessionTitle" htmlFor="dj-ses" required />
                <AppSelect
                  id="dj-ses"
                 
                  value={form.sessionId}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      sessionId: e.target.value,
                      subjectIds: [],
                      assignments: [],
                      __aDraft: { subjectId: '', teacherId: '', bookId: '' },
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
                <BilingualLabel k="darjahNameUr" htmlFor="dj-u" data-lang-field="ur" />
                <AppInput
                  id="dj-u"
                 
                  data-lang-field="ur"
                  value={form.name.ur}
                  onChange={(e) => setForm({ ...form, name: { ...form.name, ur: e.target.value } })}
                  dir="rtl"
                />
              </div>
              <div className="mb-2">
                <BilingualLabel k="darjahNameEn" htmlFor="dj-e" data-lang-field="en" />
                <AppInput
                  id="dj-e"
                 
                  data-lang-field="en"
                  value={form.name.en}
                  latin
                    onChange={(e) => setForm({ ...form, name: { ...form.name, en: e.target.value } })}
                />
              </div>
              <div className="mb-2">
                <BilingualLabel k="code" htmlFor="dj-code" />
                <AppInput
                  id="dj-code"
                 
                  value={form.code}
                  latin
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder={lng === 'ur' ? 'اختیاری' : 'Optional'}
                />
              </div>
              <div className="mb-2">
                <span className="form-label small d-block mb-1">
                  {lng === 'ur' ? 'شعبہ جات (اس سیشن میں)' : 'Subajat (for this session)'}
                </span>
                {!form.sessionId ? (
                  <p className="small text-muted mb-0">{lng === 'ur' ? 'پہلے سیشن منتخب کریں' : 'Choose a session first'}</p>
                ) : (
                  <div className="border rounded p-2 bg-light" style={{ maxHeight: '11rem', overflowY: 'auto' }}>
                    {subjectsForSession.length === 0 ? (
                      <span className="small text-muted">{lng === 'ur' ? 'اس سیشن میں کوئی شعبہ جات نہیں' : 'No Subajat for this session'}</span>
                    ) : (
                      subjectsForSession.map((s) => {
                        const id = String(s._id)
                        const checked = (form.subjectIds || []).includes(id)
                        return (
                          <AppCheckbox
                            key={id}
                            id={`dj-subj-${id}`}
                            checked={checked}
                            onCheckedChange={() =>
                              setForm((prev) => {
                                const cur = prev.subjectIds || []
                                const next = checked ? cur.filter((x) => x !== id) : [...cur, id]
                                return { ...prev, subjectIds: next }
                              })
                            }
                            label={loc(s.name, lng)}
                            size="sm"
                            className="mb-1"
                          />
                        )
                      })
                    )}
                  </div>
                )}
              </div>

              <div className="mb-2">
                <span className="form-label small d-block mb-1">
                  {lng === 'ur' ? 'استاد/کتاب اسائنمنٹ (اس درجہ کیلئے)' : 'Teacher/Book assignments (for this Darjah)'}
                </span>
                {!editing?._id ? (
                  <p className="small text-muted mb-0">
                    {lng === 'ur'
                      ? 'پہلے درجہ محفوظ کریں، پھر استاد اور کتاب اسائن کریں۔'
                      : 'Save the Darjah first, then assign teacher and book.'}
                  </p>
                ) : (
                  <>
                    <div className="row g-2 align-items-end">
                      <div className="col-md-4">
                        <label className="form-label small mb-1">{lng === 'ur' ? 'سبق/سباجہ' : 'Subject'}</label>
                        <AppSelect
                         
                          value={aDraft.subjectId || ''}
                          onChange={(e) =>
                            setForm({ ...form, __aDraft: { ...aDraft, subjectId: e.target.value, bookId: '' } })
                          }
                        >
                          <option value="">—</option>
                          {subjectsForAssignments.map((s) => (
                            <option key={s._id} value={s._id}>
                              {loc(s.name, lng)}
                            </option>
                          ))}
                        </AppSelect>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small mb-1">{lng === 'ur' ? 'استاد' : 'Teacher'}</label>
                        <AppSelect
                         
                          value={aDraft.teacherId || ''}
                          onChange={(e) => setForm({ ...form, __aDraft: { ...aDraft, teacherId: e.target.value } })}
                        >
                          <option value="">—</option>
                          {teachers.map((tch) => (
                            <option key={tch._id} value={tch._id}>
                              {loc(tch.name, lng)}
                            </option>
                          ))}
                        </AppSelect>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small mb-1">{lng === 'ur' ? 'کتاب' : 'Book'}</label>
                        <AppSelect
                         
                          value={aDraft.bookId || ''}
                          onChange={(e) => setForm({ ...form, __aDraft: { ...aDraft, bookId: e.target.value } })}
                          disabled={!aDraft.subjectId}
                        >
                          <option value="">—</option>
                          {bookOptionsForDraft.map((b) => (
                            <option key={b._id} value={b._id}>
                              {loc(b.title, lng)}
                            </option>
                          ))}
                        </AppSelect>
                      </div>
                      <div className="col-12">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          disabled={!aDraft.subjectId && !aDraft.teacherId && !aDraft.bookId}
                          onClick={() => {
                            const row = { subjectId: aDraft.subjectId || '', teacherId: aDraft.teacherId || '', bookId: aDraft.bookId || '' }
                            const next = [...(form.assignments || []), row]
                            setForm({ ...form, assignments: next, __aDraft: { subjectId: '', teacherId: '', bookId: '' } })
                          }}
                        >
                          {lng === 'ur' ? 'اسائنمنٹ شامل کریں' : 'Add assignment'}
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 border rounded">
                      <table className="table table-sm mb-0">
                        <thead>
                          <tr>
                            <th>{lng === 'ur' ? 'سبق' : 'Subject'}</th>
                            <th>{lng === 'ur' ? 'استاد' : 'Teacher'}</th>
                            <th>{lng === 'ur' ? 'کتاب' : 'Book'}</th>
                            <th className="text-end">{lng === 'ur' ? 'حذف' : 'Remove'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(form.assignments || []).length === 0 ? (
                            <tr>
                              <td colSpan={4} className="text-muted text-center">
                                —
                              </td>
                            </tr>
                          ) : (
                            (form.assignments || []).map((a, idx) => {
                              const subj = subjects.find((s) => String(s._id) === String(a.subjectId))
                              const tch = teachers.find((x) => String(x._id) === String(a.teacherId))
                              return (
                                <tr key={idx}>
                                  <td>{subj ? loc(subj.name, lng) : '—'}</td>
                                  <td>{tch ? loc(tch.name, lng) : '—'}</td>
                                  <td>{a.bookId ? bookLabel.get(String(a.bookId)) || '—' : '—'}</td>
                                  <td className="text-end">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={() =>
                                        setForm({
                                          ...form,
                                          assignments: (form.assignments || []).filter((_, j) => j !== idx),
                                        })
                                      }
                                    >
                                      {lng === 'ur' ? 'حذف' : 'Remove'}
                                    </button>
                                  </td>
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>

              <AppCheckbox
                id="dj-act"
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
        open={!!deleteDarjahTarget}
        title={t('common.confirmDeleteTitle')}
        message={deleteDarjahTarget ? t('common.confirmDeleteBody', { name: deleteDarjahTarget.name }) : ''}
        onClose={() => setDeleteDarjahTarget(null)}
        onConfirm={async () => {
          await deleteOne(deleteDarjahTarget.id).unwrap()
          refetch()
        }}
      />
    </div>
  )
}

