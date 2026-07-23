import { cn } from './cn.js'

/** Responsive grid row for FormField columns. */
export default function FormRow({ children, className = '', gap }) {
  const style = gap != null ? { '--app-form-gap': typeof gap === 'number' ? `${gap}rem` : gap } : undefined
  return (
    <div className={cn('app-form-row', className)} style={style}>
      {children}
    </div>
  )
}
