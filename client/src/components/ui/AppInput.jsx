import { forwardRef } from 'react'
import { controlClasses } from './controlClasses.js'

/**
 * Pill-shaped text input — pair with FormField for floating label + validation icons.
 * File inputs stay uncontrolled (no value prop) so capture / pick works reliably.
 */
const AppInput = forwardRef(function AppInput(
  {
    id,
    type = 'text',
    value,
    onChange,
    onBlur,
    placeholder,
    disabled = false,
    readOnly = false,
    required = false,
    latin = false,
    size = 'sm',
    invalid = false,
    className = '',
    name,
    min,
    max,
    step,
    autoComplete,
    inputMode,
    ...rest
  },
  ref
) {
  const isFile = type === 'file'
  return (
    <input
      ref={ref}
      id={id}
      name={name}
      type={type}
      {...(isFile ? {} : { value: value ?? '' })}
      onChange={onChange}
      onBlur={onBlur}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      min={min}
      max={max}
      step={step}
      autoComplete={autoComplete}
      inputMode={inputMode}
      className={controlClasses({ size, latin, invalid, className })}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  )
})

export default AppInput
