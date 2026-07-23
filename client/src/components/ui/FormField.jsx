import BilingualLabel from '../BilingualLabel.jsx'
import FieldStatusIcon from './FieldStatusIcon.jsx'
import { cn } from './cn.js'

const COL_CLASS = {
  12: 'app-form-col--12',
  8: 'app-form-col--8',
  6: 'app-form-col--6',
  4: 'app-form-col--4',
  3: 'app-form-col--3',
}

/**
 * Floating-label field shell + hint/error (inspired by modern form UI).
 */
export default function FormField({
  k,
  label,
  htmlFor,
  required = false,
  col,
  className = '',
  labelClassName = '',
  hint,
  error,
  valid = false,
  langField,
  children,
}) {
  const showSuccess = valid && !error

  const labelNode =
    k != null ? (
      <BilingualLabel
        k={k}
        htmlFor={htmlFor}
        required={required}
        className={cn('app-field__float-label', labelClassName)}
        {...(langField ? { 'data-lang-field': langField } : {})}
      />
    ) : label ? (
      <label htmlFor={htmlFor} className={cn('app-field__float-label', labelClassName)}>
        {label}
        {required ? <span className="app-field__required">*</span> : null}
      </label>
    ) : null

  const body = (
    <div
      className={cn(
        'app-field',
        error && 'app-field--error',
        showSuccess && 'app-field--valid',
        className
      )}
      {...(langField ? { 'data-lang-field': langField } : {})}
    >
      {labelNode}
      <div
        className={cn(
          'app-field__shell',
          error && 'app-field__shell--invalid',
          showSuccess && 'app-field__shell--valid',
          (error || showSuccess) && 'app-field__shell--has-status'
        )}
      >
        {children}
        {error ? <FieldStatusIcon variant="error" /> : null}
        {showSuccess ? <FieldStatusIcon variant="success" /> : null}
      </div>
      {error ? (
        <p className="app-field__error mb-0" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="app-field__hint mb-0">{hint}</p>
      ) : null}
    </div>
  )

  if (col == null) return body

  const colKey = String(col)
  return (
    <div
      className={cn('app-form-col', COL_CLASS[colKey] || COL_CLASS[12])}
      {...(langField ? { 'data-lang-field': langField } : {})}
    >
      {body}
    </div>
  )
}
