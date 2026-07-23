import { cn } from './cn.js'

/**
 * Custom radio group — circular outline, mint dot when selected.
 */
export default function AppRadioGroup({
  name,
  value,
  onChange,
  onValueChange,
  items = [],
  legend,
  inline = false,
  disabled = false,
  invalid = false,
  className = '',
  ...rest
}) {
  function pick(next) {
    onValueChange?.(next)
    onChange?.({ target: { value: next, name } })
  }

  return (
    <fieldset
      className={cn(
        'app-radio-group',
        inline && 'app-radio-group--inline',
        invalid && 'app-radio-group--invalid',
        className
      )}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      {...rest}
    >
      {legend ? <legend className="app-radio-group__legend">{legend}</legend> : null}
      {items.map((item) => {
        const inputId = `${name}-${item.value}`
        const selected = value === item.value
        return (
          <label
            key={item.value}
            htmlFor={inputId}
            className={cn(
              'app-check app-check--radio',
              (disabled || item.disabled) && 'app-check--disabled',
              selected && 'app-check--checked'
            )}
          >
            <input
              id={inputId}
              type="radio"
              name={name}
              className="app-check__native"
              value={item.value}
              checked={selected}
              onChange={() => pick(item.value)}
              disabled={disabled || item.disabled}
            />
            <span className="app-check__box" aria-hidden="true" />
            <span className="app-check__label">{item.label}</span>
          </label>
        )
      })}
    </fieldset>
  )
}
