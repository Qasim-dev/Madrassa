import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import AppModalShell from './AppModalShell'

/** Generic confirmation modal — same chrome as ConfirmDeleteModal, configurable confirm button. */
export default function ConfirmActionModal({
  open,
  title,
  message,
  children,
  onClose,
  onConfirm,
  dir,
  dialogClassName = '',
  confirmLabel,
  cancelLabel,
  confirmVariant = 'primary',
}) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = useCallback(async () => {
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
  }, [onConfirm, onClose, t])

  if (!open) return null

  const body =
    children ||
    (message != null && message !== '' ? (
      <p className="mb-0 text-secondary" style={{ whiteSpace: 'pre-line' }}>
        {message}
      </p>
    ) : null)

  const confirmClass =
    confirmVariant === 'success'
      ? 'btn btn-success'
      : confirmVariant === 'danger'
        ? 'btn btn-danger'
        : 'btn btn-primary'

  return (
    <AppModalShell title={title} onClose={onClose} dir={dir} dialogClassName={dialogClassName}>
      <div className="modal-app-body">
        {body}
        {error ? (
          <div className="alert alert-danger py-2 small mt-3 mb-0" role="alert">
            {error}
          </div>
        ) : null}
      </div>
      <div className="modal-app-footer d-flex flex-wrap gap-2 justify-content-end">
        <button type="button" className="btn btn-outline-secondary" disabled={busy} onClick={onClose}>
          {cancelLabel ?? t('common.cancel')}
        </button>
        <button type="button" className={confirmClass} disabled={busy} onClick={handleConfirm}>
          {confirmLabel ?? t('common.confirm')}
        </button>
      </div>
    </AppModalShell>
  )
}
