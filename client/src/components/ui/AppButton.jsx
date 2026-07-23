import { cn } from './cn.js'

const VARIANT_CLASS = {
  primary: 'app-btn--primary',
  success: 'app-btn--success',
  secondary: 'app-btn--outline-secondary',
  danger: 'app-btn--danger',
  'outline-primary': 'app-btn--outline-primary',
  'outline-secondary': 'app-btn--outline-secondary',
  'outline-danger': 'app-btn--outline-danger',
  ghost: 'app-btn--ghost',
}

const SIZE_CLASS = {
  sm: 'app-btn--sm',
  md: 'app-btn--md',
  lg: 'app-btn--lg',
}

/**
 * App-wide button — mint primary, consistent sizes, works in RTL.
 *
 * @param {'primary'|'success'|'secondary'|'danger'|'outline-primary'|'outline-danger'|'ghost'} variant
 * @param {'sm'|'md'|'lg'} size
 */
export default function AppButton({
  children,
  type = 'button',
  variant = 'primary',
  size = 'sm',
  className = '',
  disabled = false,
  block = false,
  icon,
  iconPosition = 'start',
  ...rest
}) {
  const iconEl = icon ? <span className="app-btn__icon">{icon}</span> : null

  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        'app-btn',
        VARIANT_CLASS[variant] || VARIANT_CLASS.primary,
        SIZE_CLASS[size] || SIZE_CLASS.sm,
        block && 'app-btn--block',
        disabled && 'is-disabled',
        className
      )}
      {...rest}
    >
      {iconPosition === 'start' ? iconEl : null}
      {children != null && children !== '' ? <span>{children}</span> : null}
      {iconPosition === 'end' ? iconEl : null}
    </button>
  )
}
