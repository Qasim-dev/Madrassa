import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useFocusTrap } from '../shared/useFocusTrap'

/**
 * Shared modal frame: backdrop, elevated card, title row. Put `<form className="modal-app-form">` inside with
 * `.modal-app-body` and `.modal-app-footer`, or pass `footer` as a prop.
 * Portaled to document.body so backdrop blur is never broken by parent transforms.
 */
export default function AppModalShell({
  open = true,
  title,
  onClose,
  size = 'md',
  children,
  footer,
  dialogClassName = '',
  dir: dirAttr,
}) {
  const { t } = useTranslation()
  const titleId = useId()
  const dialogRef = useRef(null)
  useFocusTrap(open, dialogRef)

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

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="modal-app-backdrop no-print"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div
        ref={dialogRef}
        className={['modal-app-dialog', size === 'lg' ? 'modal-app-dialog--lg' : '', dialogClassName]
          .filter(Boolean)
          .join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        dir={dirAttr || undefined}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-app-card">
          <header className="modal-app-header">
            <div className="modal-app-header__text">
              <h2 id={titleId} className="modal-app-title">
                {title}
              </h2>
            </div>
            <button
              type="button"
              className="modal-app-close-btn"
              aria-label={t('common.cancel')}
              onClick={() => onClose?.()}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </header>
          {children}
          {footer ? <div className="modal-app-footer d-flex flex-wrap gap-2 justify-content-end">{footer}</div> : null}
        </div>
      </div>
    </div>,
    document.body
  )
}
