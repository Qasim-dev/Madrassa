import { useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useGetMyBooksWithProgressQuery } from '../services/api'
import { loc } from '../shared/localized'
import { statusLabel } from '../shared/readingEnums'
import PageHeading from '../components/PageHeading'
import { AppSelect } from '../components/ui'
import FilterDrawer, { FilterToolbar } from '../components/FilterDrawer'
import './bookReading.css'

export default function BookReadingPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const activeSessionId = useSelector((s) => s.session.activeSessionId)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [draft, setDraft] = useState({ status: '' })

  useEffect(() => {
    if (!filterOpen) return
    setDraft({ status: statusFilter })
  }, [filterOpen, statusFilter])

  const filterActiveCount = useMemo(() => (statusFilter ? 1 : 0), [statusFilter])

  const { data: books = [], isLoading } = useGetMyBooksWithProgressQuery(
    activeSessionId ? { sessionId: activeSessionId } : undefined
  )

  const filtered = useMemo(() => {
    let list = books
    if (statusFilter) {
      list = list.filter((b) => (b.progress?.status || 'NOT_STARTED') === statusFilter)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((b) => {
        const title = `${b.title?.ur || ''} ${b.title?.en || ''}`.toLowerCase()
        return title.includes(q)
      })
    }
    return list
  }, [books, search, statusFilter])

  return (
    <div className="book-reading-module">
      <PageHeading navKey="navBookReading" />

      <p className="text-secondary mb-3">{t('bookReading.libraryLead')}</p>

      <FilterToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('bookReading.searchBookPlaceholder')}
        searchId="br-search-book"
        onOpenFilters={() => setFilterOpen(true)}
        activeCount={filterActiveCount}
      />

      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onApply={() => {
          setStatusFilter(draft.status)
          setFilterOpen(false)
        }}
        onReset={() => {
          setDraft({ status: '' })
        }}
      >
        <div className="filter-drawer__field">
          <label className="filter-drawer__label" htmlFor="br-filter-status">
            {t('bookReading.filterStatus')}
          </label>
          <AppSelect
            id="br-filter-status"
            className="w-100"
            value={draft.status}
            onChange={(e) => setDraft({ status: e.target.value })}
          >
            <option value="">{t('bookReading.allStatuses')}</option>
            <option value="NOT_STARTED">{statusLabel('NOT_STARTED', lng)}</option>
            <option value="IN_PROGRESS">{statusLabel('IN_PROGRESS', lng)}</option>
            <option value="COMPLETED">{statusLabel('COMPLETED', lng)}</option>
          </AppSelect>
        </div>
      </FilterDrawer>

      {isLoading ? (
        <p className="text-secondary">{t('common.loading')}</p>
      ) : filtered.length === 0 ? (
        <div className="alert alert-info">{t('bookReading.noBooks')}</div>
      ) : (
        <div className="book-reading-card-grid">
          {filtered.map((b) => {
            const pct = b.progress?.readingPercentage ?? 0
            const st = b.progress?.status || 'NOT_STARTED'
            return (
              <Link key={b._id} to={`/book-reading/${b._id}`} className="book-reading-card">
                <div className="book-reading-detail__title book-reading-card__title">{loc(b.title, lng)}</div>
                <div className="book-reading-card__meta">
                  {loc(b.darjahId?.name, lng)} · {statusLabel(st, lng)}
                </div>
                <div className="book-reading-card__mini-bar">
                  <div className="book-reading-card__mini-fill" style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
                <div className="book-reading-card__pct" dir="ltr">
                  {b.progress?.currentPage ?? 0} / {b.totalPages ?? '—'} · {pct}%
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
