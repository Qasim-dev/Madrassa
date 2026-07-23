import { FlSectionTitle } from '../BilingualLabel.jsx'
import { cn } from './cn.js'

/** Form section with optional FL heading. */
export default function FormSection({ titleKey, title, children, className = '' }) {
  return (
    <section className={cn('app-form-section', className)}>
      {titleKey ? <FlSectionTitle k={titleKey} /> : title ? <div className="page-section-title mb-3">{title}</div> : null}
      {children}
    </section>
  )
}
