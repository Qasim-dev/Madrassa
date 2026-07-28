import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import PageHeading from '../components/PageHeading'
import FilterDrawer, { FilterToolbar } from '../components/FilterDrawer'
import AppModalShell from '../components/AppModalShell'
import AppDateInput from '../components/AppDateInput'
import { AppInput, AppSelect } from '../components/ui'
import { BtnIconLabel, IconDownload } from '../components/ListToolbarIcons'
import { useFlash } from '../app/flash.jsx'
import { useCalendarMode } from '../app/calendarMode'
import { formatDisplayDate } from '../shared/formatDisplayDate'
import { loc } from '../shared/localized'
import { downloadCsv } from '../shared/exportCsv'
import { can } from '../shared/permissions'
import {
  useGetRecycleBinQuery,
  useGetRecycleBinItemQuery,
  useGetUsersQuery,
  useRestoreRecycleItemMutation,
  useBulkRestoreRecycleMutation,
  usePermanentDeleteRecycleMutation,
  useBulkPermanentDeleteRecycleMutation,
} from '../services/api'
import './recycleBinPage.css'

const PAGE_SIZE = 20

function buildPageList(current, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const pages = new Set([1, totalPages, current, current - 1, current + 1])
  if (current <= 3) [2, 3, 4].forEach((p) => pages.add(p))
  if (current >= totalPages - 2) [totalPages - 1, totalPages - 2, totalPages - 3].forEach((p) => pages.add(p))
  return [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)
}

function userLabel(u) {
  if (!u) return '—'
  return u.email || u.username || loc(u.name, 'en') || '—'
}

function moduleBadgeClass(module) {
  if (module === 'student') return 'recycle-bin__badge--student'
  if (module === 'teacher') return 'recycle-bin__badge--teacher'
  if (module === 'fee_item') return 'recycle-bin__badge--fee'
  return 'recycle-bin__badge--default'
}

function PurgeConfirmModal({ open, title, message, count = 1, onClose, onConfirm }) {
  const { t } = useTranslation()
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setConfirmText('')
      setError('')
      setBusy(false)
    }
  }, [open])

  if (!open) return null

  const canConfirm = confirmText.trim() === 'DELETE'

  async function handleConfirm() {
    setBusy(true)
    setError('')
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      setError(err?.data?.message || err?.error || err?.message || t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppModalShell title={title} onClose={onClose} dialogClassName="recycle-bin__purge-modal">
      <div className="modal-app-body">
        <div className="recycle-bin__purge-warning" role="alert">
          <p className="mb-2">{message}</p>
          {count > 1 ? (
            <p className="mb-0 small text-secondary">{t('recycle.bulkPurgeCount', { count })}</p>
          ) : null}
        </div>
        <label className="form-label small mt-3" htmlFor="recycle-purge-confirm">
          {t('recycle.typeDeletePrompt')}
        </label>
        <AppInput
          id="recycle-purge-confirm"
          className="w-100"
          latin
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="DELETE"
          autoComplete="off"
        />
        {error ? (
          <div className="alert alert-danger py-2 small mt-3 mb-0" role="alert">
            {error}
          </div>
        ) : null}
      </div>
      <div className="modal-app-footer d-flex flex-wrap gap-2 justify-content-end">
        <button type="button" className="btn btn-outline-secondary" disabled={busy} onClick={onClose}>
          {t('common.cancel')}
        </button>
        <button type="button" className="btn btn-danger" disabled={busy || !canConfirm} onClick={handleConfirm}>
          {t('recycle.confirmPurge')}
        </button>
      </div>
    </AppModalShell>
  )
}

function RecycleDetailModal({ itemId, initialTab = 'details', onClose }) {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const { mode } = useCalendarMode()
  const [tab, setTab] = useState(initialTab)
  const { data, isLoading, isError } = useGetRecycleBinItemQuery(itemId, { skip: !itemId })

  useEffect(() => {
    setTab(initialTab)
  }, [initialTab, itemId])

  if (!itemId) return null

  const item = data?.item
  const audits = data?.audits ?? []

  return (
    <AppModalShell
      title={t('recycle.detailsTitle')}
      onClose={onClose}
      size="lg"
      dialogClassName="recycle-bin__detail-modal"
    >
      <div className="modal-app-body">
        <div className="recycle-bin__detail-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'details'}
            className={`recycle-bin__detail-tab${tab === 'details' ? ' is-active' : ''}`}
            onClick={() => setTab('details')}
          >
            {t('recycle.tabDetails')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'audit'}
            className={`recycle-bin__detail-tab${tab === 'audit' ? ' is-active' : ''}`}
            onClick={() => setTab('audit')}
          >
            {t('recycle.tabAudit')}
          </button>
        </div>

        {isLoading ? (
          <p className="text-secondary mb-0 mt-3">{t('common.loading')}</p>
        ) : isError || !item ? (
          <p className="text-danger mb-0 mt-3">{t('common.error')}</p>
        ) : tab === 'details' ? (
          <dl className="recycle-bin__detail-grid mt-3">
            <div>
              <dt>{t('recycle.colModule')}</dt>
              <dd>
                <span className={`recycle-bin__badge ${moduleBadgeClass(item.module)}`}>{item.module}</span>
              </dd>
            </div>
            <div>
              <dt>{t('recycle.colRecordName')}</dt>
              <dd>{loc(item.recordName, lng) || '—'}</dd>
            </div>
            <div>
              <dt>{t('recycle.colRecordId')}</dt>
              <dd dir="ltr">{item.recordCode || '—'}</dd>
            </div>
            <div>
              <dt>{t('recycle.colParent')}</dt>
              <dd>{item.parentInfo || '—'}</dd>
            </div>
            <div>
              <dt>{t('recycle.colDeletedBy')}</dt>
              <dd>{userLabel(item.deletedBy)}</dd>
            </div>
            <div>
              <dt>{t('recycle.colDeletedDate')}</dt>
              <dd>{item.deletedAt ? formatDisplayDate(item.deletedAt, lng, mode) : '—'}</dd>
            </div>
            <div className="recycle-bin__detail-span">
              <dt>{t('recycle.colReason')}</dt>
              <dd>{item.deleteReason || '—'}</dd>
            </div>
            <div>
              <dt>{t('recycle.colSession')}</dt>
              <dd>{item.sessionId?.title || '—'}</dd>
            </div>
            <div>
              <dt>{t('recycle.colStatus')}</dt>
              <dd>
                <span className={`recycle-bin__status recycle-bin__status--${item.status || 'deleted'}`}>
                  {t(`recycle.status.${item.status || 'deleted'}`, { defaultValue: item.status })}
                </span>
              </dd>
            </div>
          </dl>
        ) : (
          <div className="recycle-bin__audit-list mt-3">
            {audits.length === 0 ? (
              <p className="text-secondary mb-0">{t('recycle.noAudit')}</p>
            ) : (
              audits.map((a) => (
                <article key={a._id} className="recycle-bin__audit-item">
                  <div className="recycle-bin__audit-head">
                    <span className={`recycle-bin__audit-action recycle-bin__audit-action--${a.action}`}>
                      {t(`recycle.audit.${a.action}`, { defaultValue: a.action })}
                    </span>
                    <time dateTime={a.createdAt}>{formatDisplayDate(a.createdAt, lng, mode)}</time>
                  </div>
                  <p className="recycle-bin__audit-meta mb-1">
                    {userLabel(a.userId)}
                    {a.reason ? ` · ${a.reason}` : ''}
                  </p>
                  {a.ip ? (
                    <p className="recycle-bin__audit-ip mb-0" dir="ltr">
                      {a.ip}
                    </p>
                  ) : null}
                </article>
              ))
            )}
          </div>
        )}
      </div>
      <div className="modal-app-footer d-flex justify-content-end">
        <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
          {t('common.cancel')}
        </button>
      </div>
    </AppModalShell>
  )
}

export default function RecycleBinPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const en = lng?.toLowerCase().startsWith('en')
  const { mode } = useCalendarMode()
  const { showFlash } = useFlash()
  const user = useSelector((s) => s.auth.user)
  const canRestore = can(user, 'recycle:restore')
  const canPurge = can(user, 'recycle:purge')

  const [searchParams, setSearchParams] = useSearchParams()
  const [filterOpen, setFilterOpen] = useState(false)
  const [selected, setSelected] = useState(() => new Set())
  const [purgeTarget, setPurgeTarget] = useState(null)
  const [bulkPurgeOpen, setBulkPurgeOpen] = useState(false)
  const [detailTarget, setDetailTarget] = useState(null)

  const q = searchParams.get('q') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const sortOrder = searchParams.get('order') === 'asc' ? 'asc' : 'desc'

  const filters = useMemo(
    () => ({
      module: searchParams.get('module') || '',
      from: searchParams.get('from') || '',
      to: searchParams.get('to') || '',
      deletedBy: searchParams.get('deletedBy') || '',
    }),
    [searchParams]
  )

  const [draft, setDraft] = useState(filters)

  const syncParams = useCallback(
    (next) => {
      const params = {}
      if (next.q) params.q = next.q
      if (next.page && next.page > 1) params.page = String(next.page)
      if (next.module) params.module = next.module
      if (next.from) params.from = next.from
      if (next.to) params.to = next.to
      if (next.deletedBy) params.deletedBy = next.deletedBy
      if (next.order === 'asc') params.order = 'asc'
      setSearchParams(params)
    },
    [setSearchParams]
  )

  const listParams = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      sort: 'deletedAt',
      order: sortOrder,
      ...(q.trim() ? { q: q.trim() } : {}),
      ...(filters.module ? { module: filters.module } : {}),
      ...(filters.from ? { from: filters.from } : {}),
      ...(filters.to ? { to: filters.to } : {}),
      ...(filters.deletedBy ? { deletedBy: filters.deletedBy } : {}),
    }),
    [page, q, sortOrder, filters]
  )

  const { data, isLoading, isFetching, refetch } = useGetRecycleBinQuery(listParams)
  const { data: users = [] } = useGetUsersQuery(undefined, { skip: !filterOpen })

  const items = data?.items ?? []
  const pagination = data?.pagination ?? { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 }
  const modules = data?.modules ?? []

  const [restoreItem] = useRestoreRecycleItemMutation()
  const [bulkRestore] = useBulkRestoreRecycleMutation()
  const [permanentDelete] = usePermanentDeleteRecycleMutation()
  const [bulkPermanentDelete] = useBulkPermanentDeleteRecycleMutation()

  useEffect(() => {
    setSelected(new Set())
  }, [listParams])

  const filterActiveCount = [filters.module, filters.from, filters.to, filters.deletedBy].filter(Boolean).length

  const moduleLabel = useMemo(() => {
    const map = {}
    for (const m of modules) {
      map[m.key] = loc(m, lng) || m.key
    }
    return map
  }, [modules, lng])

  const pageIds = useMemo(() => items.map((r) => r._id), [items])
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
  const someSelected = selected.size > 0

  function toggleRow(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function togglePageAll() {
    if (allPageSelected) {
      setSelected((prev) => {
        const next = new Set(prev)
        pageIds.forEach((id) => next.delete(id))
        return next
      })
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        pageIds.forEach((id) => next.add(id))
        return next
      })
    }
  }

  async function handleRestore(row) {
    try {
      await restoreItem({ id: row._id }).unwrap()
      showFlash(t('recycle.restoreSuccess'), 'success')
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(row._id)
        return next
      })
    } catch (err) {
      showFlash(err?.data?.message || err?.error || t('recycle.restoreFailed'))
    }
  }

  async function handleBulkRestore() {
    const ids = [...selected]
    if (!ids.length) return
    try {
      const res = await bulkRestore({ ids }).unwrap()
      const failed = (res?.results ?? []).filter((r) => !r.ok)
      const ok = (res?.results ?? []).filter((r) => r.ok).length
      if (failed.length) {
        showFlash(
          t('recycle.bulkRestorePartial', { ok, failed: failed.length, message: failed[0]?.message || '' })
        )
      } else {
        showFlash(t('recycle.bulkRestoreSuccess', { count: ok }), 'success')
      }
      setSelected(new Set())
      refetch()
    } catch (err) {
      showFlash(err?.data?.message || err?.error || t('recycle.restoreFailed'))
    }
  }

  function exportCsvClick() {
    const headers = [
      t('recycle.colModule'),
      t('recycle.colRecordName'),
      t('recycle.colRecordId'),
      t('recycle.colParent'),
      t('recycle.colDeletedBy'),
      t('recycle.colDeletedDate'),
      t('recycle.colReason'),
      t('recycle.colSession'),
      t('recycle.colStatus'),
    ]
    const rows = items.map((row) => [
      moduleLabel[row.module] || row.module,
      loc(row.recordName, lng) || '',
      row.recordCode || '',
      row.parentInfo || '',
      userLabel(row.deletedBy),
      row.deletedAt ? formatDisplayDate(row.deletedAt, lng, mode) : '',
      row.deleteReason || '',
      row.sessionId?.title || '',
      row.status || '',
    ])
    downloadCsv({
      filename: `recycle-bin-${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows,
    })
  }

  function toggleSort() {
    syncParams({ q, page: 1, ...filters, order: sortOrder === 'desc' ? 'asc' : 'desc' })
  }

  const pageList = buildPageList(pagination.page, pagination.totalPages)
  const from = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1
  const to = Math.min(pagination.page * pagination.limit, pagination.total)

  return (
    <div className="recycle-bin-page">
      <PageHeading navKey="navRecycleBin" subtitle={t('recycle.subtitle')} />

      <FilterToolbar
        search={q}
        onSearchChange={(v) => syncParams({ q: v, page: 1, ...filters, order: sortOrder })}
        searchPlaceholder={t('recycle.searchPlaceholder')}
        searchId="recycle-search"
        onOpenFilters={() => {
          setDraft(filters)
          setFilterOpen(true)
        }}
        activeCount={filterActiveCount}
      >
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={exportCsvClick} disabled={!items.length}>
          <BtnIconLabel icon={<IconDownload />}>{t('recycle.exportCsv')}</BtnIconLabel>
        </button>
      </FilterToolbar>

      {someSelected ? (
        <div className="recycle-bin__bulk-bar">
          <span className="recycle-bin__bulk-count">{t('recycle.selectedCount', { count: selected.size })}</span>
          <div className="recycle-bin__bulk-actions">
            {canRestore ? (
              <button type="button" className="btn btn-sm btn-success" onClick={handleBulkRestore}>
                {t('recycle.bulkRestore')}
              </button>
            ) : null}
            {canPurge ? (
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setBulkPurgeOpen(true)}>
                {t('recycle.bulkPurge')}
              </button>
            ) : null}
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setSelected(new Set())}>
              {t('recycle.clearSelection')}
            </button>
          </div>
        </div>
      ) : null}

      <div className="recycle-bin__table-wrap">
        {isLoading || isFetching ? (
          <div className="recycle-bin__skeleton" aria-busy="true" aria-label={t('common.loading')}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="recycle-bin__skeleton-row" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="recycle-bin__empty">
            <p className="recycle-bin__empty-title">{t('recycle.emptyTitle')}</p>
            <p className="recycle-bin__empty-body">{t('recycle.emptyBody')}</p>
          </div>
        ) : (
          <table className="recycle-bin__table">
            <thead>
              <tr>
                {canRestore || canPurge ? (
                  <th className="recycle-bin__col-check" scope="col">
                    <input
                      type="checkbox"
                      aria-label={t('recycle.selectAll')}
                      checked={allPageSelected}
                      onChange={togglePageAll}
                    />
                  </th>
                ) : null}
                <th scope="col">{t('recycle.colModule')}</th>
                <th scope="col">{t('recycle.colRecordName')}</th>
                <th scope="col">{t('recycle.colRecordId')}</th>
                <th scope="col">{t('recycle.colParent')}</th>
                <th scope="col">{t('recycle.colDeletedBy')}</th>
                <th scope="col">
                  <button type="button" className="recycle-bin__sort-btn" onClick={toggleSort}>
                    {t('recycle.colDeletedDate')}
                    <span className="recycle-bin__sort-icon" aria-hidden="true">
                      {sortOrder === 'desc' ? '↓' : '↑'}
                    </span>
                  </button>
                </th>
                <th scope="col">{t('recycle.colReason')}</th>
                <th scope="col">{t('recycle.colSession')}</th>
                <th scope="col">{t('recycle.colStatus')}</th>
                <th className="recycle-bin__col-actions" scope="col">
                  {t('recycle.colActions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row._id} className={selected.has(row._id) ? 'is-selected' : ''}>
                  {canRestore || canPurge ? (
                    <td className="recycle-bin__col-check">
                      <input
                        type="checkbox"
                        aria-label={t('recycle.selectRow')}
                        checked={selected.has(row._id)}
                        onChange={() => toggleRow(row._id)}
                      />
                    </td>
                  ) : null}
                  <td>
                    <span className={`recycle-bin__badge ${moduleBadgeClass(row.module)}`}>
                      {moduleLabel[row.module] || row.module}
                    </span>
                  </td>
                  <td>{loc(row.recordName, lng) || '—'}</td>
                  <td dir="ltr">{row.recordCode || '—'}</td>
                  <td>{row.parentInfo || '—'}</td>
                  <td>{userLabel(row.deletedBy)}</td>
                  <td>{row.deletedAt ? formatDisplayDate(row.deletedAt, lng, mode) : '—'}</td>
                  <td className="recycle-bin__reason">{row.deleteReason || '—'}</td>
                  <td>{row.sessionId?.title || '—'}</td>
                  <td>
                    <span className={`recycle-bin__status recycle-bin__status--${row.status || 'deleted'}`}>
                      {t(`recycle.status.${row.status || 'deleted'}`, { defaultValue: row.status })}
                    </span>
                  </td>
                  <td className="recycle-bin__col-actions">
                    <div className="recycle-bin__row-actions">
                      {canRestore ? (
                        <button type="button" className="btn btn-sm btn-outline-success" onClick={() => handleRestore(row)}>
                          {t('recycle.restore')}
                        </button>
                      ) : null}
                      {canPurge ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => setPurgeTarget(row)}
                        >
                          {t('recycle.purge')}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setDetailTarget({ id: row._id, tab: 'details' })}
                      >
                        {t('recycle.viewDetails')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-link recycle-bin__audit-link"
                        onClick={() => setDetailTarget({ id: row._id, tab: 'audit' })}
                      >
                        {t('recycle.auditHistory')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination.total > 0 ? (
        <nav className="recycle-bin__pagination no-print" aria-label={t('recycle.pagination')}>
          <div className="recycle-bin__pagination-meta">
            <span>
              {en ? (
                <>
                  Showing <strong>{from}</strong>–<strong>{to}</strong> of <strong>{pagination.total}</strong>
                </>
              ) : (
                <>
                  <strong>{from}</strong>–<strong>{to}</strong> از <strong>{pagination.total}</strong>
                </>
              )}
            </span>
          </div>
          <div className="recycle-bin__pagination-controls">
            <button
              type="button"
              className="recycle-bin__page-btn"
              disabled={pagination.page <= 1}
              onClick={() => syncParams({ q, page: pagination.page - 1, ...filters, order: sortOrder })}
            >
              {en ? 'Prev' : 'پچھلا'}
            </button>
            <div className="recycle-bin__page-list">
              {pageList.map((p, idx) => {
                const prev = pageList[idx - 1]
                const showEllipsis = prev != null && p - prev > 1
                return (
                  <span key={p} className="recycle-bin__page-item">
                    {showEllipsis ? <span className="recycle-bin__ellipsis">…</span> : null}
                    <button
                      type="button"
                      className={`recycle-bin__page-btn${p === pagination.page ? ' is-active' : ''}`}
                      onClick={() => syncParams({ q, page: p, ...filters, order: sortOrder })}
                    >
                      {p}
                    </button>
                  </span>
                )
              })}
            </div>
            <button
              type="button"
              className="recycle-bin__page-btn"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => syncParams({ q, page: pagination.page + 1, ...filters, order: sortOrder })}
            >
              {en ? 'Next' : 'اگلا'}
            </button>
          </div>
        </nav>
      ) : null}

      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title={t('recycle.filterTitle')}
        onApply={() => {
          syncParams({ q, page: 1, ...draft, order: sortOrder })
          setFilterOpen(false)
        }}
        onReset={() => setDraft({ module: '', from: '', to: '', deletedBy: '' })}
      >
        <div className="filter-drawer__field">
          <label className="filter-drawer__label" htmlFor="rb-filter-module">
            {t('recycle.filterModule')}
          </label>
          <AppSelect
            id="rb-filter-module"
            className="w-100"
            value={draft.module}
            onChange={(e) => setDraft((prev) => ({ ...prev, module: e.target.value }))}
          >
            <option value="">{t('recycle.allModules')}</option>
            {modules.map((m) => (
              <option key={m.key} value={m.key}>
                {loc(m, lng) || m.key}
              </option>
            ))}
          </AppSelect>
        </div>
        <div className="filter-drawer__field">
          <label className="filter-drawer__label" htmlFor="rb-filter-from">
            {t('recycle.filterFrom')}
          </label>
          <AppDateInput
            id="rb-filter-from"
            className="w-100"
            value={draft.from}
            onChange={(v) => setDraft((prev) => ({ ...prev, from: v }))}
          />
        </div>
        <div className="filter-drawer__field">
          <label className="filter-drawer__label" htmlFor="rb-filter-to">
            {t('recycle.filterTo')}
          </label>
          <AppDateInput
            id="rb-filter-to"
            className="w-100"
            value={draft.to}
            onChange={(v) => setDraft((prev) => ({ ...prev, to: v }))}
          />
        </div>
        <div className="filter-drawer__field">
          <label className="filter-drawer__label" htmlFor="rb-filter-deleted-by">
            {t('recycle.filterDeletedBy')}
          </label>
          <AppSelect
            id="rb-filter-deleted-by"
            className="w-100"
            value={draft.deletedBy}
            onChange={(e) => setDraft((prev) => ({ ...prev, deletedBy: e.target.value }))}
          >
            <option value="">{t('recycle.allUsers')}</option>
            {users.map((u) => (
              <option key={u._id || u.id} value={u._id || u.id}>
                {userLabel(u)}
              </option>
            ))}
          </AppSelect>
        </div>
      </FilterDrawer>

      <RecycleDetailModal
        itemId={detailTarget?.id}
        initialTab={detailTarget?.tab || 'details'}
        onClose={() => setDetailTarget(null)}
      />

      <PurgeConfirmModal
        open={Boolean(purgeTarget)}
        title={t('recycle.purgeTitle')}
        message={t('recycle.purgeWarning')}
        count={1}
        onClose={() => setPurgeTarget(null)}
        onConfirm={async () => {
          await permanentDelete({ id: purgeTarget._id, confirmText: 'DELETE' }).unwrap()
          showFlash(t('recycle.purgeSuccess'), 'success')
          setSelected((prev) => {
            const next = new Set(prev)
            next.delete(purgeTarget._id)
            return next
          })
        }}
      />

      <PurgeConfirmModal
        open={bulkPurgeOpen}
        title={t('recycle.purgeTitle')}
        message={t('recycle.purgeWarning')}
        count={selected.size}
        onClose={() => setBulkPurgeOpen(false)}
        onConfirm={async () => {
          const ids = [...selected]
          const res = await bulkPermanentDelete({ ids, confirmText: 'DELETE' }).unwrap()
          const failed = (res?.results ?? []).filter((r) => !r.ok)
          const ok = (res?.results ?? []).filter((r) => r.ok).length
          if (failed.length) {
            showFlash(t('recycle.bulkPurgePartial', { ok, failed: failed.length, message: failed[0]?.message || '' }))
          } else {
            showFlash(t('recycle.bulkPurgeSuccess', { count: ok }), 'success')
          }
          setSelected(new Set())
          refetch()
        }}
      />
    </div>
  )
}
