import { cn } from './cn.js'

/**
 * Custom checkbox — mint fill when checked, rounded square.
 */
export default function AppCheckbox({
  id,
  checked,
  onChange,
  onCheckedChange,
  label,
  disabled = false,
  className = '',
  labelClassName = '',
  size = 'md',
  invalid = false,
  ...rest
}) {
  function handleChange(e) {
    onChange?.(e)
    onCheckedChange?.(e.target.checked)
  }

  return (
    <label
      htmlFor={id}
      className={cn(
        'app-check',
        disabled && 'app-check--disabled',
        invalid && 'app-check--invalid',
        className
      )}
    >
      <input
        id={id}
        type="checkbox"
        className="app-check__native"
        checked={!!checked}
        onChange={handleChange}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        {...rest}
      />
      <span className="app-check__box" aria-hidden="true" />
      {label != null && label !== '' ? (
        <span className={cn('app-check__label', size === 'sm' && 'app-check__label--sm', labelClassName)}>
          {label}
        </span>
      ) : null}
    </label>
  )
}
