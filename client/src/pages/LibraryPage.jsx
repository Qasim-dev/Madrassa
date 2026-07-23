import { useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import {
  useGetLibraryStatsQuery,
  useGetLibraryBooksQuery,
  useCreateLibraryBookMutation,
  useUpdateLibraryBookMutation,
  useDeleteLibraryBookMutation,
  useGetLibraryTransactionsQuery,
  useIssueLibraryBookMutation,
  useReturnLibraryBookMutation,
  useGetStudentsQuery,
  useGetTeachersQuery,
} from '../services/api'
import { loc, uiLang } from '../shared/localized'
import { formatDisplayDate } from '../shared/formatDisplayDate'
import { useCalendarMode } from '../app/calendarMode'
import { LIBRARY_LANGUAGES, LIBRARY_SUBJECTS, LIBRARY_BORROWER_TYPES } from '../shared/libraryEnums'
import AppDateInput from '../components/AppDateInput'
import AppTabs from '../components/AppTabs'
import AppModalShell from '../components/AppModalShell'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import DataTable from '../components/DataTable'
import PageHeading from '../components/PageHeading'
import AppKpiCards from '../components/ui/AppKpiCards'
import { AppInput, AppSelect, AppCreatableSelect, FormField, FormRow, AppTextarea } from '../components/ui'
import FilterDrawer, { FilterToolbar } from '../components/FilterDrawer'

const emptyLoc = () => ({ ur: '', en: '' })

function emptyBookForm() {
  return {
    serialNumber: '',
    title: emptyLoc(),
    author: emptyLoc(),
    volumes: 1,
    shelfNumber: '',
    location: '',
    language: 'ar',
    languageCustom: '',
    editor: emptyLoc(),
    conditionNotes: emptyLoc(),
    subjectCategory: 'hadith',
    subjectCategoryCustom: '',
    totalCopies: 1,
    availableCopies: 1,
    notes: '',
    isActive: true,
  }
}

function emptyIssueForm() {
  return {
    bookId: '',
    borrowerType: 'student',
    studentId: '',
    teacherId: '',
    borrowerName: emptyLoc(),
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    copies: 1,
    remarks: '',
  }
}

export default function LibraryPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const { mode } = useCalendarMode()
  const activeSessionId = useSelector((s) => s.session.activeSessionId)
  const [tab, setTab] = useState('catalog')
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [langFilter, setLangFilter] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [draft, setDraft] = useState({ subject: '', language: '' })
  const [bookModal, setBookModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [bookForm, setBookForm] = useState(emptyBookForm)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [issueForm, setIssueForm] = useState(emptyIssueForm)

  useEffect(() => {
    if (!filterOpen) return
    setDraft({ subject: subjectFilter, language: langFilter })
  }, [filterOpen, subjectFilter, langFilter])

  const filterActiveCount = useMemo(() => {
    let n = 0
    if (subjectFilter) n += 1
    if (langFilter) n += 1
    return n
  }, [subjectFilter, langFilter])

  const queryParams = {
    ...(activeSessionId ? { sessionId: activeSessionId } : {}),
    ...(search.trim() ? { q: search.trim() } : {}),
    ...(subjectFilter ? { subjectCategory: subjectFilter } : {}),
  }

  const { data: stats } = useGetLibraryStatsQuery(
    activeSessionId ? { sessionId: activeSessionId } : undefined
  )
  const { data: books = [], isLoading, refetch } = useGetLibraryBooksQuery(queryParams)
  const filteredBooks = useMemo(() => {
    if (!langFilter) return books
    return books.filter((b) => String(b.language || '') === String(langFilter))
  }, [books, langFilter])
  const { data: issued = [], refetch: refetchTx } = useGetLibraryTransactionsQuery({ status: 'issued' })
  const { data: history = [], isLoading: historyLoading } = useGetLibraryTransactionsQuery(
    tab === 'history' ? {} : undefined,
    { skip: tab !== 'history' }
  )
  const { data: students = [] } = useGetStudentsQuery(
    activeSessionId ? { sessionId: activeSessionId } : undefined
  )
  const { data: teachers = [] } = useGetTeachersQuery()

  const [createBook] = useCreateLibraryBookMutation()
  const [updateBook] = useUpdateLibraryBookMutation()
  const [deleteBook] = useDeleteLibraryBookMutation()
  const [issueBook] = useIssueLibraryBookMutation()
  const [returnBook] = useReturnLibraryBookMutation()

  const langLabel = (book) => {
    if (typeof book === 'object' && book?.language === 'other' && book.languageCustom?.trim()) {
      return book.languageCustom.trim()
    }
    const id = typeof book === 'object' ? book?.language : book
    return t(LIBRARY_LANGUAGES.find((x) => x.id === id)?.labelKey || 'library.lang.other')
  }
  const subjectLabel = (book) => {
    if (typeof book === 'object' && book?.subjectCategory === 'other' && book.subjectCategoryCustom?.trim()) {
      return book.subjectCategoryCustom.trim()
    }
    const id = typeof book === 'object' ? book?.subjectCategory : book
    return t(LIBRARY_SUBJECTS.find((x) => x.id === id)?.labelKey || 'library.subject.other')
  }

  function openNewBook() {
    setEditing(null)
    setBookForm(emptyBookForm())
    setBookModal(true)
  }

  function openEditBook(b) {
    setEditing(b)
    setBookForm({
      serialNumber: b.serialNumber ?? '',
      title: b.title || emptyLoc(),
      author: b.author || emptyLoc(),
      volumes: b.volumes ?? 1,
      shelfNumber: b.shelfNumber || '',
      location: b.location || '',
      language: b.language || 'ar',
      languageCustom: b.languageCustom || '',
      editor: b.editor || emptyLoc(),
      conditionNotes: b.conditionNotes || emptyLoc(),
      subjectCategory: b.subjectCategory || 'other',
      subjectCategoryCustom: b.subjectCategoryCustom || '',
      totalCopies: b.totalCopies ?? 1,
      availableCopies: b.availableCopies ?? 1,
      notes: b.notes || '',
      isActive: b.isActive !== false,
    })
    setBookModal(true)
  }

  async function saveBook(e) {
    e.preventDefault()
    const payload = {
      ...bookForm,
      serialNumber: bookForm.serialNumber ? Number(bookForm.serialNumber) : undefined,
      volumes: Number(bookForm.volumes) || 1,
      totalCopies: Number(bookForm.totalCopies) || 1,
      availableCopies: Number(bookForm.availableCopies) || Number(bookForm.totalCopies) || 1,
      languageCustom: bookForm.language === 'other' ? bookForm.languageCustom.trim() : '',
      subjectCategoryCustom: bookForm.subjectCategory === 'other' ? bookForm.subjectCategoryCustom.trim() : '',
      sessionId: activeSessionId || null,
    }
    if (editing) await updateBook({ id: editing._id, ...payload }).unwrap()
    else await createBook(payload).unwrap()
    setBookModal(false)
    refetch()
  }

  async function submitIssue(e) {
    e.preventDefault()
    await issueBook({
      ...issueForm,
      copies: Number(issueForm.copies) || 1,
      studentId: issueForm.borrowerType === 'student' ? issueForm.studentId || null : null,
      teacherId: issueForm.borrowerType === 'teacher' ? issueForm.teacherId || null : null,
    }).unwrap()
    setIssueForm(emptyIssueForm())
    refetch()
    refetchTx()
  }

  const catalogColumns = useMemo(
    () => [
      { key: 'sn', headerKey: 'librarySerial', numeric: true, cell: (b) => b.serialNumber },
      { key: 'title', headerKey: 'libraryBookTitle', cell: (b) => loc(b.title, lng) },
      { key: 'auth', headerKey: 'libraryAuthor', cell: (b) => loc(b.author, lng) || '—' },
      { key: 'vol', headerKey: 'libraryVolumes', numeric: true, cell: (b) => b.volumes ?? 1 },
      { key: 'shelf', headerKey: 'libraryShelf', cell: (b) => b.shelfNumber || '—' },
      { key: 'loc', headerKey: 'libraryLocation', cell: (b) => b.location || '—' },
      { key: 'lang', headerKey: 'libraryLanguage', cell: (b) => langLabel(b) },
      { key: 'sub', headerKey: 'librarySubject', cell: (b) => subjectLabel(b) },
      { key: 'ed', headerKey: 'libraryEditor', cell: (b) => loc(b.editor, lng) || '—' },
      { key: 'cond', headerKey: 'libraryCondition', cell: (b) => loc(b.conditionNotes, lng) || '—' },
      {
        key: 'copies',
        headerKey: 'libraryCopies',
        numeric: true,
        cell: (b) => `${b.availableCopies ?? 0}/${b.totalCopies ?? 0}`,
      },
      {
        key: 'actions',
        headerKey: 'actions',
        hidePrint: true,
        cell: (b) => (
          <div className="data-table__actions">
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openEditBook(b)}>
              {t('common.edit')}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => setDeleteTarget({ id: b._id, name: loc(b.title, lng) })}
            >
              {t('common.delete')}
            </button>
          </div>
        ),
      },
    ],
    [lng, t, mode]
  )

  const issuedColumns = useMemo(
    () => [
      { key: 'book', headerKey: 'libraryBookTitle', cell: (r) => loc(r.bookId?.title, lng) || '—' },
      { key: 'sn', headerKey: 'librarySerial', numeric: true, cell: (r) => r.bookId?.serialNumber ?? '—' },
      {
        key: 'who',
        headerKey: 'libraryBorrower',
        cell: (r) => {
          if (r.studentId) return loc(r.studentId.name, lng)
          if (r.teacherId) return loc(r.teacherId.name, lng)
          return loc(r.borrowerName, lng) || '—'
        },
      },
      { key: 'idt', headerKey: 'date', cell: (r) => formatDisplayDate(r.issueDate, lng, mode) },
      { key: 'due', headerKey: 'libraryDueDate', cell: (r) => formatDisplayDate(r.dueDate, lng, mode) },
      { key: 'cp', headerKey: 'libraryCopies', numeric: true, cell: (r) => r.copies ?? 1 },
      {
        key: 'act',
        headerKey: 'actions',
        hidePrint: true,
        cell: (r) => (
          <button type="button" className="btn btn-sm btn-success" onClick={() => returnBook({ id: r._id }).unwrap().then(() => { refetch(); refetchTx() })}>
            {t('library.returnBook')}
          </button>
        ),
      },
    ],
    [lng, t, mode, returnBook, refetch, refetchTx]
  )

  const historyColumns = useMemo(
    () => [
      { key: 'book', headerKey: 'libraryBookTitle', cell: (r) => loc(r.bookId?.title, lng) || '—' },
      {
        key: 'who',
        headerKey: 'libraryBorrower',
        cell: (r) => {
          if (r.studentId) return loc(r.studentId.name, lng)
          if (r.teacherId) return loc(r.teacherId.name, lng)
          return loc(r.borrowerName, lng) || '—'
        },
      },
      { key: 'st', headerKey: 'salaryStatusLabel', cell: (r) => t(`library.status.${r.status}`) },
      { key: 'idt', headerKey: 'libraryIssueDate', cell: (r) => formatDisplayDate(r.issueDate, lng, mode) },
      { key: 'ret', headerKey: 'libraryReturnDate', cell: (r) => formatDisplayDate(r.returnDate, lng, mode) },
    ],
    [lng, t, mode]
  )

  return (
    <div className="library-page">
      <PageHeading navKey="navLibrary">
        {tab === 'catalog' ? (
          <button type="button" className="btn btn-sm btn-success no-print" onClick={openNewBook}>
            {t('common.add')}
          </button>
        ) : null}
      </PageHeading>

      {stats && (
        <AppKpiCards
          columns={4}
          items={[
            {
              key: 'titles',
              label: t('library.statTitles'),
              value: stats.totalTitles ?? 0,
              tone: 'teal',
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                </svg>
              ),
            },
            {
              key: 'copies',
              label: t('library.statCopies'),
              value: stats.totalCopies ?? 0,
              tone: 'blue',
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M4 7h16M4 12h16M4 17h10" />
                </svg>
              ),
            },
            {
              key: 'avail',
              label: t('library.statAvailable'),
              value: stats.availableCopies ?? 0,
              tone: 'emerald',
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <path d="M22 4L12 14.01l-3-3" />
                </svg>
              ),
            },
            {
              key: 'issued',
              label: t('library.statIssued'),
              value: stats.issuedCount ?? 0,
              tone: 'amber',
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M16 3h5v5M4 20L21 3" />
                  <path d="M21 16v5h-5" />
                  <path d="M15 15l6 6M4 4l5 5" />
                </svg>
              ),
            },
          ]}
        />
      )}

      <AppTabs
        variant="underline"
        value={tab}
        onChange={setTab}
        lang={lng}
        className="mb-3"
        ariaLabel={t('nav.library')}
        items={[
          { id: 'catalog', label: t('library.tabCatalog') },
          { id: 'issue', label: t('library.tabIssue') },
          { id: 'history', label: t('library.tabHistory') },
        ]}
      />

      {tab === 'catalog' && (
        <>
          <FilterToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={lng === 'ur' ? 'نام، مصنف، رقم…' : 'Title, author, shelf…'}
            searchId="lib-q"
            onOpenFilters={() => setFilterOpen(true)}
            activeCount={filterActiveCount}
          />

          <FilterDrawer
            open={filterOpen}
            onClose={() => setFilterOpen(false)}
            onApply={() => {
              setSubjectFilter(draft.subject)
              setLangFilter(draft.language)
              setFilterOpen(false)
            }}
            onReset={() => {
              setDraft({ subject: '', language: '' })
            }}
          >
            <div className="filter-drawer__field">
              <label className="filter-drawer__label" htmlFor="lib-sub">
                {t('library.filterSubject')}
              </label>
              <AppSelect
                id="lib-sub"
                className="w-100"
                value={draft.subject}
                onChange={(e) => setDraft((prev) => ({ ...prev, subject: e.target.value }))}
              >
                <option value="">{t('library.allSubjects')}</option>
                {LIBRARY_SUBJECTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {t(s.labelKey)}
                  </option>
                ))}
              </AppSelect>
            </div>
            <div className="filter-drawer__field">
              <label className="filter-drawer__label" htmlFor="lib-lang-filter">
                {lng === 'ur' ? 'زبان' : 'Language'}
              </label>
              <AppSelect
                id="lib-lang-filter"
                className="w-100"
                value={draft.language}
                onChange={(e) => setDraft((prev) => ({ ...prev, language: e.target.value }))}
              >
                <option value="">{lng === 'ur' ? 'تمام زبانیں' : 'All languages'}</option>
                {LIBRARY_LANGUAGES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {t(l.labelKey)}
                  </option>
                ))}
              </AppSelect>
            </div>
          </FilterDrawer>

          <DataTable
            columns={catalogColumns}
            rows={filteredBooks}
            getRowKey={(b) => b._id}
            isLoading={isLoading}
            loadingText={t('common.loading')}
            emptyText={t('common.noRecords')}
          />
        </>
      )}

      {tab === 'issue' && (
        <div className="d-flex flex-column gap-3">
          <div className="content-panel p-3">
            <h2 className="h6 mb-3" lang={uiLang(lng)}>
              {t('library.issueBook')}
            </h2>
            <form onSubmit={submitIssue}>
              <FormRow>
                <FormField k="libraryBookTitle" htmlFor="iss-book" required col={4}>
                  <AppSelect
                    id="iss-book"
                    required
                    value={issueForm.bookId}
                    onChange={(e) => setIssueForm({ ...issueForm, bookId: e.target.value })}
                  >
                    <option value="">—</option>
                    {books
                      .filter((b) => (b.availableCopies ?? 0) > 0)
                      .map((b) => (
                        <option key={b._id} value={b._id}>
                          #{b.serialNumber} — {loc(b.title, lng)} ({b.availableCopies}/{b.totalCopies})
                        </option>
                      ))}
                  </AppSelect>
                </FormField>
                <FormField label={t('library.borrowerType')} htmlFor="iss-type" col={4}>
                  <AppSelect
                    id="iss-type"
                    value={issueForm.borrowerType}
                    onChange={(e) =>
                      setIssueForm({
                        ...issueForm,
                        borrowerType: e.target.value,
                        studentId: '',
                        teacherId: '',
                      })
                    }
                  >
                    {LIBRARY_BORROWER_TYPES.map((b) => (
                      <option key={b.id} value={b.id}>
                        {t(b.labelKey)}
                      </option>
                    ))}
                  </AppSelect>
                </FormField>
                {issueForm.borrowerType === 'student' ? (
                  <FormField k="feeStudentCol" htmlFor="iss-stu" col={4}>
                    <AppSelect
                      id="iss-stu"
                      value={issueForm.studentId}
                      onChange={(e) => setIssueForm({ ...issueForm, studentId: e.target.value })}
                    >
                      <option value="">—</option>
                      {students.map((s) => (
                        <option key={s._id} value={s._id}>
                          {loc(s.name, lng)}
                        </option>
                      ))}
                    </AppSelect>
                  </FormField>
                ) : null}
                {issueForm.borrowerType === 'teacher' ? (
                  <FormField k="teacher" htmlFor="iss-tea" col={4}>
                    <AppSelect
                      id="iss-tea"
                      value={issueForm.teacherId}
                      onChange={(e) => setIssueForm({ ...issueForm, teacherId: e.target.value })}
                    >
                      <option value="">—</option>
                      {teachers.map((te) => (
                        <option key={te._id} value={te._id}>
                          {loc(te.name, lng)}
                        </option>
                      ))}
                    </AppSelect>
                  </FormField>
                ) : null}
                {issueForm.borrowerType === 'guest' || issueForm.borrowerType === 'staff' ? (
                  <FormField k="fullName" htmlFor="iss-name-ur" col={4}>
                    <AppInput
                      id="iss-name-ur"
                      value={issueForm.borrowerName.ur}
                      onChange={(e) =>
                        setIssueForm({
                          ...issueForm,
                          borrowerName: { ...issueForm.borrowerName, ur: e.target.value },
                        })
                      }
                    />
                  </FormField>
                ) : null}
                <FormField k="date" htmlFor="iss-dt" col={4}>
                  <AppDateInput
                    id="iss-dt"
                    lng={lng}
                    value={issueForm.issueDate}
                    onChange={(v) => setIssueForm({ ...issueForm, issueDate: v })}
                  />
                </FormField>
                <FormField label={t('library.dueDate')} htmlFor="iss-due" col={4}>
                  <AppDateInput
                    id="iss-due"
                    lng={lng}
                    value={issueForm.dueDate}
                    onChange={(v) => setIssueForm({ ...issueForm, dueDate: v })}
                  />
                </FormField>
                <FormField label={t('library.copiesOut')} htmlFor="iss-cp" col={4}>
                  <AppInput
                    id="iss-cp"
                    type="number"
                    min={1}
                    latin
                    value={issueForm.copies}
                    onChange={(e) => setIssueForm({ ...issueForm, copies: e.target.value })}
                  />
                </FormField>
              </FormRow>
              <div className="d-flex justify-content-end mt-1">
                <button type="submit" className="btn btn-success">
                  {t('library.issueBook')}
                </button>
              </div>
            </form>
          </div>
          <div>
            <h2 className="h6 mb-2" lang={uiLang(lng)}>
              {t('library.currentlyIssued')}
            </h2>
            <DataTable
              columns={issuedColumns}
              rows={issued}
              getRowKey={(r) => r._id}
              loadingText={t('common.loading')}
              emptyText={t('library.noneIssued')}
            />
          </div>
        </div>
      )}

      {tab === 'history' && (
        <DataTable
          columns={historyColumns}
          rows={history}
          getRowKey={(r) => r._id}
          isLoading={historyLoading}
          loadingText={t('common.loading')}
          emptyText={t('common.noRecords')}
        />
      )}

      {bookModal && (
        <AppModalShell
          title={editing ? t('common.edit') : t('common.add')}
          onClose={() => setBookModal(false)}
          size="lg"
          dir={uiLang(lng) === 'ur' ? 'rtl' : 'ltr'}
        >
          <form className="modal-app-form" onSubmit={saveBook}>
            <div className="modal-app-body">
              <div className="row g-3">
                <div className="col-12 col-md-4">
                  <FormField k="librarySerial" htmlFor="bk-sn">
                    <AppInput
                      id="bk-sn"
                      type="number"
                      min={1}
                      value={bookForm.serialNumber}
                      onChange={(e) => setBookForm({ ...bookForm, serialNumber: e.target.value })}
                      placeholder={lng === 'ur' ? 'خودکار' : 'Auto'}
                    />
                  </FormField>
                </div>
                <div className="col-12 col-md-4">
                  <FormField k="libraryVolumes" htmlFor="bk-vol">
                    <AppInput
                      id="bk-vol"
                      type="number"
                      min={1}
                      value={bookForm.volumes}
                      onChange={(e) => setBookForm({ ...bookForm, volumes: e.target.value })}
                    />
                  </FormField>
                </div>
                <div className="col-12 col-md-4">
                  <FormField k="libraryShelf" htmlFor="bk-sh">
                    <AppInput
                      id="bk-sh"
                      value={bookForm.shelfNumber}
                      onChange={(e) => setBookForm({ ...bookForm, shelfNumber: e.target.value })}
                      placeholder="1/1"
                    />
                  </FormField>
                </div>
                <div className="col-12 col-md-4">
                  <FormField k="libraryLanguage" htmlFor="bk-lang">
                    <AppCreatableSelect
                      id="bk-lang"
                      value={
                        bookForm.language === 'other' && bookForm.languageCustom
                          ? bookForm.languageCustom
                          : bookForm.language
                      }
                      options={LIBRARY_LANGUAGES.filter((l) => l.id !== 'other').map((l) => ({
                        value: l.id,
                        label: t(l.labelKey),
                      }))}
                      onValueChange={(v) => {
                        const known = LIBRARY_LANGUAGES.some((l) => l.id === v && l.id !== 'other')
                        if (known) {
                          setBookForm({ ...bookForm, language: v, languageCustom: '' })
                        } else if (v) {
                          setBookForm({ ...bookForm, language: 'other', languageCustom: v })
                        } else {
                          setBookForm({ ...bookForm, language: 'ar', languageCustom: '' })
                        }
                      }}
                      placeholder={lng === 'ur' ? 'منتخب کریں یا نیا لکھیں…' : 'Select or type new…'}
                    />
                  </FormField>
                </div>
                <div className="col-12 col-md-4" data-lang-field="ur">
                  <FormField k="bookTitleUr" htmlFor="bk-title-ur" required langField="ur">
                    <AppInput
                      id="bk-title-ur"
                      data-lang-field="ur"
                      dir="rtl"
                      value={bookForm.title.ur}
                      onChange={(e) => setBookForm({ ...bookForm, title: { ...bookForm.title, ur: e.target.value } })}
                      required
                    />
                  </FormField>
                </div>
                <div className="col-12 col-md-4" data-lang-field="en">
                  <FormField k="bookTitleEn" htmlFor="bk-title-en" langField="en">
                    <AppInput
                      id="bk-title-en"
                      latin
                      data-lang-field="en"
                      value={bookForm.title.en}
                      onChange={(e) => setBookForm({ ...bookForm, title: { ...bookForm.title, en: e.target.value } })}
                    />
                  </FormField>
                </div>
                <div className="col-12 col-md-4" data-lang-field="ur">
                  <FormField k="bookAuthorUr" htmlFor="bk-auth-ur" langField="ur">
                    <AppInput
                      id="bk-auth-ur"
                      data-lang-field="ur"
                      dir="rtl"
                      value={bookForm.author.ur}
                      onChange={(e) => setBookForm({ ...bookForm, author: { ...bookForm.author, ur: e.target.value } })}
                    />
                  </FormField>
                </div>
                <div className="col-12 col-md-4" data-lang-field="en">
                  <FormField k="bookAuthorEn" htmlFor="bk-auth-en" langField="en">
                    <AppInput
                      id="bk-auth-en"
                      latin
                      data-lang-field="en"
                      value={bookForm.author.en}
                      onChange={(e) => setBookForm({ ...bookForm, author: { ...bookForm.author, en: e.target.value } })}
                    />
                  </FormField>
                </div>
                <div className="col-12 col-md-4" data-lang-field="ur">
                  <FormField k="libraryEditorUr" htmlFor="bk-ed-ur" langField="ur">
                    <AppInput
                      id="bk-ed-ur"
                      data-lang-field="ur"
                      dir="rtl"
                      value={bookForm.editor.ur}
                      onChange={(e) => setBookForm({ ...bookForm, editor: { ...bookForm.editor, ur: e.target.value } })}
                    />
                  </FormField>
                </div>
                <div className="col-12 col-md-4" data-lang-field="en">
                  <FormField k="libraryEditorEn" htmlFor="bk-ed-en" langField="en">
                    <AppInput
                      id="bk-ed-en"
                      latin
                      data-lang-field="en"
                      value={bookForm.editor.en}
                      onChange={(e) => setBookForm({ ...bookForm, editor: { ...bookForm.editor, en: e.target.value } })}
                    />
                  </FormField>
                </div>
                <div className="col-12 col-md-4">
                  <FormField k="libraryLocation" htmlFor="bk-loc">
                    <AppInput
                      id="bk-loc"
                      value={bookForm.location}
                      onChange={(e) => setBookForm({ ...bookForm, location: e.target.value })}
                      placeholder={lng === 'ur' ? 'مثلاً الماری 3 / شیلف ب' : 'e.g. Cabinet 3 / Shelf B'}
                    />
                  </FormField>
                </div>
                <div className="col-12 col-md-4">
                  <FormField k="librarySubject" htmlFor="bk-sub">
                    <AppCreatableSelect
                      id="bk-sub"
                      value={
                        bookForm.subjectCategory === 'other' && bookForm.subjectCategoryCustom
                          ? bookForm.subjectCategoryCustom
                          : bookForm.subjectCategory
                      }
                      options={LIBRARY_SUBJECTS.filter((s) => s.id !== 'other').map((s) => ({
                        value: s.id,
                        label: t(s.labelKey),
                      }))}
                      onValueChange={(v) => {
                        const known = LIBRARY_SUBJECTS.some((s) => s.id === v && s.id !== 'other')
                        if (known) {
                          setBookForm({ ...bookForm, subjectCategory: v, subjectCategoryCustom: '' })
                        } else if (v) {
                          setBookForm({ ...bookForm, subjectCategory: 'other', subjectCategoryCustom: v })
                        } else {
                          setBookForm({ ...bookForm, subjectCategory: 'hadith', subjectCategoryCustom: '' })
                        }
                      }}
                      placeholder={lng === 'ur' ? 'منتخب کریں یا نیا لکھیں…' : 'Select or type new…'}
                    />
                  </FormField>
                </div>
                <div className="col-12 col-md-4" data-lang-field="ur">
                  <FormField k="libraryConditionUr" htmlFor="bk-cond-ur" langField="ur">
                    <AppTextarea
                      id="bk-cond-ur"
                      data-lang-field="ur"
                      dir="rtl"
                      rows={2}
                      value={bookForm.conditionNotes.ur}
                      onChange={(e) => setBookForm({ ...bookForm, conditionNotes: { ...bookForm.conditionNotes, ur: e.target.value } })}
                    />
                  </FormField>
                </div>
                <div className="col-12 col-md-4" data-lang-field="en">
                  <FormField k="libraryConditionEn" htmlFor="bk-cond-en" langField="en">
                    <AppTextarea
                      id="bk-cond-en"
                      latin
                      data-lang-field="en"
                      rows={2}
                      value={bookForm.conditionNotes.en}
                      onChange={(e) => setBookForm({ ...bookForm, conditionNotes: { ...bookForm.conditionNotes, en: e.target.value } })}
                    />
                  </FormField>
                </div>
                <div className="col-6 col-md-4">
                  <FormField k="libraryTotalCopies" htmlFor="bk-tc">
                    <AppInput
                      id="bk-tc"
                      type="number"
                      min={1}
                      value={bookForm.totalCopies}
                      onChange={(e) => setBookForm({ ...bookForm, totalCopies: e.target.value })}
                    />
                  </FormField>
                </div>
                <div className="col-6 col-md-4">
                  <FormField k="libraryAvailableCopies" htmlFor="bk-ac">
                    <AppInput
                      id="bk-ac"
                      type="number"
                      min={0}
                      value={bookForm.availableCopies}
                      onChange={(e) => setBookForm({ ...bookForm, availableCopies: e.target.value })}
                    />
                  </FormField>
                </div>
                <div className="col-12">
                  <FormField k="notes" htmlFor="bk-notes">
                    <AppTextarea
                      id="bk-notes"
                      rows={2}
                      value={bookForm.notes}
                      onChange={(e) => setBookForm({ ...bookForm, notes: e.target.value })}
                    />
                  </FormField>
                </div>
              </div>
            </div>
            <div className="modal-app-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setBookModal(false)}>
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
        open={!!deleteTarget}
        title={t('common.confirmDeleteTitle')}
        message={deleteTarget ? t('common.confirmDeleteBody', { name: deleteTarget.name }) : ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          await deleteBook(deleteTarget.id).unwrap()
          refetch()
        }}
      />
    </div>
  )
}
