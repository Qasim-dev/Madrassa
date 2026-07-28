import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { AppInput } from './ui'
import { useFocusTrap } from '../shared/useFocusTrap'

/**
 * Side filter panel.
 * Urdu (RTL) → slides from the left; English (LTR) → from the right.
 */
export default function FilterDrawer({
  open = false,
  onClose,
  title,
  children,
  onApply,
  onReset,
  applyLabel,
  resetLabel,
  dir: dirProp,
}) {
  const { t, i18n } = useTranslation()
  const titleId = useId()
  const panelRef = useRef(null)
  const isRtl = (dirProp || i18n.dir()) === 'rtl'
  const side = isRtl ? 'left' : 'right'
  useFocusTrap(open, panelRef)

  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    function onKey(e) {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, open])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className={`filter-drawer-root${open ? ' is-open' : ''}`} aria-hidden={!open}>
      <div
        className="filter-drawer-backdrop"
        onMouseDown={() => onClose?.()}
        {...(open ? {} : { tabIndex: -1 })}
      />
      <aside
        ref={panelRef}
        className={`filter-drawer filter-drawer--${side}${open ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        dir={dirProp || (isRtl ? 'rtl' : 'ltr')}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="filter-drawer__header">
          <h2 id={titleId} className="filter-drawer__title">
            {title ?? t('common.filter')}
          </h2>
          <button
            type="button"
            className="filter-drawer__close"
            aria-label={t('common.cancel')}
            onClick={() => onClose?.()}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="filter-drawer__body">{children}</div>

        <footer className="filter-drawer__footer">
          <button type="button" className="btn btn-outline-secondary filter-drawer__btn" onClick={() => onReset?.()}>
            {resetLabel ?? t('common.reset')}
          </button>
          <button type="button" className="btn btn-success filter-drawer__btn" onClick={() => onApply?.()}>
            {applyLabel ?? t('common.apply')}
          </button>
        </footer>
      </aside>
    </div>,
    document.body
  )
}

/** Compact toolbar row: optional search + Filter button (opens drawer). */
export function FilterToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  searchId = 'page-filter-search',
  onOpenFilters,
  activeCount = 0,
  children,
}) {
  const { t } = useTranslation()

  return (
    <div className="page-toolbar page-toolbar--strip filter-toolbar">
      <div className="filter-toolbar__row">
        {onSearchChange != null ? (
          <div className="filter-toolbar__search min-w-0 flex-grow-1">
            <label className="visually-hidden" htmlFor={searchId}>
              {t('common.search')}
            </label>
            <AppInput
              id={searchId}
              type="search"
              className="w-100"
              value={search ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder ?? t('common.search')}
            />
          </div>
        ) : null}
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary filter-toolbar__btn no-print"
          onClick={() => onOpenFilters?.()}
        >
          <svg className="filter-toolbar__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 6h16M7 12h10M10 18h4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          {t('common.filter')}
          {activeCount > 0 ? (
            <span className="filter-toolbar__badge" aria-hidden="true">
              {activeCount}
            </span>
          ) : null}
        </button>
        {children}
      </div>
    </div>
  )
}
