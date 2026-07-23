import { useMemo, useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  useGetBookWithReadingProgressQuery,
  useGetBookReadingRecordsQuery,
  useCreateBookReadingRecordMutation,
  useUpdateBookReadingRecordMutation,
  useDeleteBookReadingRecordMutation,
} from '../services/api'
import { loc } from '../shared/localized'
import { toInputDate } from '../shared/formatDisplayDate'
import PageHeading from '../components/PageHeading'
import AppModalShell from '../components/AppModalShell'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import BookReadingProgress from '../components/bookReading/BookReadingProgress'
import ReadingTimeline from '../components/bookReading/ReadingTimeline'
import ReadingRecordForm from '../components/bookReading/ReadingRecordForm'
import { AppSelect } from '../components/ui'
import FilterDrawer, { FilterToolbar } from '../components/FilterDrawer'
import './bookReading.css'

const emptyForm = () => ({
  readingDate: new Date().toISOString().slice(0, 10),
  startPage: '',
  endPage: '',
  durationMinutes: '',
  notes: '',
})

export default function BookReadingDetailPage() {
  const { bookId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { t, i18n } = useTranslation()
  const lng = i18n.language

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [sortBy, setSortBy] = useState('readingDate')
  const [sortOrder, setSortOrder] = useState('desc')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [draft, setDraft] = useState({ sortBy: 'readingDate', sortOrder: 'desc' })

  useEffect(() => {
    if (!filterOpen) return
    setDraft({ sortBy, sortOrder })
  }, [filterOpen, sortBy, sortOrder])

  const filterActiveCount = useMemo(() => {
    let n = 0
    if (sortBy !== 'readingDate') n += 1
    if (sortOrder !== 'desc') n += 1
    return n
  }, [sortBy, sortOrder])

  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [msg, setMsg] = useState('')

  const { data: book, isLoading: bookLoading, refetch: refetchBook } = useGetBookWithReadingProgressQuery(bookId, {
    skip: !bookId,
  })

  const listParams = useMemo(
    () => ({
      bookId,
      page,
      limit: 10,
      search: searchDebounced.trim() || undefined,
      sortBy,
      sortOrder,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    }),
    [bookId, page, searchDebounced, sortBy, sortOrder, fromDate, toDate]
  )

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchDebounced(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  const { data: recordsData, isLoading: recordsLoading, refetch: refetchRecords } = useGetBookReadingRecordsQuery(
    listParams,
    { skip: !bookId }
  )

  const [createRecord] = useCreateBookReadingRecordMutation()
  const [updateRecord] = useUpdateBookReadingRecordMutation()
  const [deleteRecord] = useDeleteBookReadingRecordMutation()

  const records = recordsData?.items || []
  const pagination = recordsData?.pagination || { page: 1, totalPages: 1, total: 0 }
  const hasActiveFilters = Boolean(searchDebounced.trim())
  const isFilteredEmpty = !recordsLoading && records.length === 0 && hasActiveFilters
  const isHistoryEmpty = !recordsLoading && records.length === 0 && !hasActiveFilters

  function flash(text) {
    setMsg(text)
    setTimeout(() => setMsg(''), 3500)
  }

  function openNew() {
    if (!book?.totalPages) {
      flash(t('bookReading.setTotalPagesFirst'))
      return
    }
    setEditing(null)
    const suggested = book.progress?.currentPage ? String(book.progress.currentPage + 1) : '1'
    setForm({ ...emptyForm(), startPage: suggested, endPage: suggested })
    setModal(true)
  }

  const tryOpenAddFromUrl = useCallback(() => {
    if (searchParams.get('add') !== '1' || !book) return
    if (!book.totalPages) {
      flash(t('bookReading.setTotalPagesFirst'))
      setSearchParams({}, { replace: true })
      return
    }
    setEditing(null)
    const suggested = book.progress?.currentPage ? String(book.progress.currentPage + 1) : '1'
    setForm({ ...emptyForm(), startPage: suggested, endPage: suggested })
    setModal(true)
    setSearchParams({}, { replace: true })
  }, [book, searchParams, setSearchParams, t])

  useEffect(() => {
    tryOpenAddFromUrl()
  }, [tryOpenAddFromUrl])

  function openEdit(row) {
    setEditing(row)
    setForm({
      readingDate: toInputDate(row.readingDate),
      startPage: row.startPage ?? '',
      endPage: row.endPage ?? '',
      durationMinutes: row.durationMinutes ?? '',
      notes: row.notes || '',
    })
    setModal(true)
  }

  async function handleSave() {
    if (!bookId || !form.readingDate || form.startPage === '') {
      flash(t('bookReading.requiredFields'))
      return
    }
    const payload = {
      bookId,
      readingDate: form.readingDate,
      startPage: Number(form.startPage),
      endPage: form.endPage !== '' ? Number(form.endPage) : Number(form.startPage),
      durationMinutes: form.durationMinutes !== '' ? Number(form.durationMinutes) : undefined,
      notes: form.notes.trim(),
    }
    try {
      if (editing) {
        await updateRecord({ id: editing._id, ...payload }).unwrap()
        flash(t('bookReading.updated'))
      } else {
        await createRecord(payload).unwrap()
        flash(t('bookReading.saved'))
      }
      setModal(false)
      refetchRecords()
      refetchBook()
    } catch (e) {
      flash(e?.data?.message || e.message)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteRecord(deleteTarget).unwrap()
      flash(t('bookReading.deleted'))
      setDeleteTarget(null)
      refetchRecords()
      refetchBook()
    } catch (e) {
      flash(e?.data?.message || e.message)
    }
  }

  if (bookLoading) {
    return (
      <div className="book-reading-module">
        <PageHeading navKey="navBookReading" />
        <p className="text-secondary">{t('common.loading')}</p>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="book-reading-module">
        <PageHeading navKey="navBookReading" />
        <div className="alert alert-warning">{t('bookReading.bookNotFound')}</div>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => navigate('/book-reading')}>
          {t('bookReading.backToLibrary')}
        </button>
      </div>
    )
  }

  const progress = book.progress || {
    currentPage: 0,
    totalPages: book.totalPages,
    readingPercentage: 0,
    status: 'NOT_STARTED',
    lastReadDate: null,
  }

  return (
    <div className="book-reading-module">
      <PageHeading navKey="navBookReading">
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => navigate('/book-reading')}>
          ← {t('bookReading.backToLibrary')}
        </button>
      </PageHeading>

      {msg && <div className="alert alert-success py-2 mb-3">{msg}</div>}

      <div className="exam-step-box mb-3">
        <div className="book-reading-detail__header">
          <div>
            <h1 className="book-reading-detail__title">{loc(book.title, lng)}</h1>
            <p className="text-secondary small mb-0">
              {loc(book.subjectId?.name, lng)} · {loc(book.darjahId?.name, lng)}
              {book.author?.ur || book.author?.en ? ` · ${loc(book.author, lng)}` : ''}
            </p>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <Link to={`/tartibat/books`} className="btn btn-outline-secondary btn-sm">
              {t('bookReading.editBook')}
            </Link>
            <button type="button" className="btn btn-primary btn-sm" onClick={openNew}>
              + {t('bookReading.addRecord')}
            </button>
          </div>
        </div>

        {!book.totalPages && (
          <div className="alert alert-warning mb-3">{t('bookReading.setTotalPagesFirst')}</div>
        )}

        <BookReadingProgress progress={{ ...progress, totalPages: book.totalPages }} lng={lng} />
      </div>

      <div className="exam-step-box">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <h2 className="h6 mb-0">{t('bookReading.historyTitle')}</h2>
        </div>

        <FilterToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={t('bookReading.searchPlaceholder')}
          searchId="br-search-notes"
          onOpenFilters={() => setFilterOpen(true)}
          activeCount={filterActiveCount}
        />

        <FilterDrawer
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          onApply={() => {
            setSortBy(draft.sortBy)
            setSortOrder(draft.sortOrder)
            setPage(1)
            setFilterOpen(false)
          }}
          onReset={() => {
            setDraft({ sortBy: 'readingDate', sortOrder: 'desc' })
          }}
        >
          <div className="filter-drawer__field">
            <label className="filter-drawer__label" htmlFor="br-sort-by">
              {t('bookReading.sortBy')}
            </label>
            <AppSelect
              id="br-sort-by"
              className="w-100"
              value={draft.sortBy}
              onChange={(e) => setDraft((prev) => ({ ...prev, sortBy: e.target.value }))}
            >
              <option value="readingDate">{t('bookReading.col.date')}</option>
              <option value="startPage">{t('bookReading.startPage')}</option>
              <option value="endPage">{t('bookReading.endPage')}</option>
              <option value="pagesRead">{t('bookReading.pagesRead')}</option>
            </AppSelect>
          </div>
          <div className="filter-drawer__field">
            <label className="filter-drawer__label" htmlFor="br-sort-order">
              {t('bookReading.sortOrder')}
            </label>
            <AppSelect
              id="br-sort-order"
              className="w-100"
              value={draft.sortOrder}
              onChange={(e) => setDraft((prev) => ({ ...prev, sortOrder: e.target.value }))}
            >
              <option value="desc">{t('bookReading.newestFirst')}</option>
              <option value="asc">{t('bookReading.oldestFirst')}</option>
            </AppSelect>
          </div>
        </FilterDrawer>

        {!recordsLoading && pagination.total > 0 && (
          <p className="small text-secondary mb-2">
            {t('bookReading.resultCount', { count: pagination.total })}
          </p>
        )}

        {recordsLoading ? (
          <p className="text-secondary">{t('common.loading')}</p>
        ) : isFilteredEmpty ? (
          <div className="reading-empty-cta">
            <p className="reading-empty-cta__text">{t('bookReading.noFilterResults')}</p>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setSearch('')}>
              {t('bookReading.clearFilters')}
            </button>
          </div>
        ) : isHistoryEmpty ? (
          <div className="reading-empty-cta">
            <p className="reading-empty-cta__text">{t('bookReading.emptyHistoryHint')}</p>
            <button type="button" className="btn btn-primary" onClick={openNew} disabled={!book.totalPages}>
              + {t('bookReading.addFirstRecord')}
            </button>
          </div>
        ) : (
          <>
            <ReadingTimeline records={records} lng={lng} onEdit={openEdit} onDelete={setDeleteTarget} />
            {pagination.totalPages > 1 && (
              <div className="book-reading-pagination">
                <span>{t('bookReading.pageInfo', { page: pagination.page, total: pagination.totalPages, count: pagination.total })}</span>
                <div className="d-flex gap-1">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    {t('bookReading.prev')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    {t('bookReading.next')}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <AppModalShell
        open={modal}
        title={editing ? t('bookReading.editRecord') : t('bookReading.addRecord')}
        onClose={() => setModal(false)}
        footer={
          <>
            <button type="button" className="btn btn-outline-secondary" onClick={() => setModal(false)}>
              {t('common.cancel')}
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave}>
              {t('common.save')}
            </button>
          </>
        }
      >
        <div className="modal-app-body modal-app-body--reading">
          <ReadingRecordForm form={form} setForm={setForm} totalPages={book.totalPages} />
        </div>
      </AppModalShell>

      <ConfirmDeleteModal
        open={!!deleteTarget}
        title={t('common.confirmDeleteTitle')}
        message={t('bookReading.confirmDelete')}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
