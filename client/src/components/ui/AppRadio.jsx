import { cn } from './cn.js'

/** Single radio — use AppRadioGroup for labeled groups. */
export default function AppRadio({
  id,
  name,
  value,
  checked,
  onChange,
  onValueChange,
  label,
  disabled = false,
  className = '',
  iconOnly = false,
  ...rest
}) {
  function handleChange(e) {
    onChange?.(e)
    onValueChange?.(e.target.value)
  }

  return (
    <label
      className={cn(
        'app-check app-check--radio',
        iconOnly && 'app-check--icon-only',
        disabled && 'app-check--disabled',
        className
      )}
    >
      <input
        id={id}
        type="radio"
        name={name}
        className="app-check__native"
        value={value}
        checked={!!checked}
        onChange={handleChange}
        disabled={disabled}
        {...rest}
      />
      <span className="app-check__box" aria-hidden="true" />
      {label != null && label !== '' && !iconOnly ? (
        <span className="app-check__label">{label}</span>
      ) : null}
    </label>
  )
}
