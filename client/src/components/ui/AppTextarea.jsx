import { forwardRef } from 'react'
import { controlClasses } from './controlClasses.js'

const AppTextarea = forwardRef(function AppTextarea(
  {
    id,
    value,
    onChange,
    placeholder,
    disabled = false,
    readOnly = false,
    required = false,
    rows = 3,
    latin = false,
    size = 'sm',
    invalid = false,
    className = '',
    name,
    ...rest
  },
  ref
) {
  return (
    <textarea
      ref={ref}
      id={id}
      name={name}
      value={value ?? ''}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      rows={rows}
      className={controlClasses({ size, latin, invalid, textarea: true, className })}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  )
})

export default AppTextarea
