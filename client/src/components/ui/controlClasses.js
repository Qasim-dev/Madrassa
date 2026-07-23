import { cn } from './cn.js'

export function controlClasses({
  size = 'sm',
  latin = false,
  invalid = false,
  select = false,
  textarea = false,
  className = '',
}) {
  return cn(
    'app-field__control',
    size === 'md' ? 'app-field__control--md' : 'app-field__control--sm',
    latin && 'app-field__control--latin',
    select && 'app-field__control--select',
    textarea && 'app-field__control--textarea',
    invalid && 'app-field__control--invalid is-invalid',
    className
  )
}
