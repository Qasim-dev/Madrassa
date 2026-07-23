import { useTranslation } from 'react-i18next'
import AppModalShell from '../AppModalShell.jsx'
import AppButton from './AppButton.jsx'
import { cn } from './cn.js'

/**
 * Modal + form scaffold: body scroll region + standard footer.
 * Pass `footer` to override default Cancel/Save buttons.
 */
export default function ModalForm({
  open = true,
  title,
  onClose,
  onSubmit,
  size = 'md',
  children,
  footer,
  saving = false,
  saveLabel,
  cancelLabel,
  bodyClassName = '',
  formClassName = '',
}) {
  const { t } = useTranslation()

  if (!open) return null

  const defaultFooter = (
    <ModalFormFooter
      onCancel={onClose}
      saving={saving}
      saveLabel={saveLabel ?? t('common.save')}
      cancelLabel={cancelLabel ?? t('common.cancel')}
    />
  )

  return (
    <AppModalShell title={title} onClose={onClose} size={size}>
      <form
        className={cn('modal-app-form', formClassName)}
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit?.(e)
        }}
      >
        <div className={cn('modal-app-body', bodyClassName)}>{children}</div>
        {footer !== undefined ? footer : defaultFooter}
      </form>
    </AppModalShell>
  )
}

export function ModalFormFooter({
  onCancel,
  onSave,
  saving = false,
  saveLabel,
  cancelLabel,
  saveVariant = 'success',
  className = '',
}) {
  const { t } = useTranslation()

  return (
    <div className={cn('modal-app-footer d-flex flex-wrap gap-2 justify-content-end', className)}>
      <AppButton type="button" variant="secondary" size="sm" onClick={onCancel} disabled={saving}>
        {cancelLabel ?? t('common.cancel')}
      </AppButton>
      <AppButton type="submit" variant={saveVariant} size="sm" disabled={saving} onClick={onSave}>
        {saveLabel ?? t('common.save')}
      </AppButton>
    </div>
  )
}
