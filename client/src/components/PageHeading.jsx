import AppBreadcrumb from './AppBreadcrumb'

/**
 * Compact page chrome card: breadcrumb + optional subtitle + actions (e.g. New).
 * Large page titles are intentionally omitted — nav + breadcrumb carry context.
 */
export default function PageHeading({ children, subtitle, sticky = true, showBreadcrumb = true }) {
  const className = [
    'ds-page-header',
    'page-heading',
    'page-heading-wrap',
    'page-heading--compact',
    sticky ? 'page-heading--sticky' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const hasActions = !!children
  const hasSubtitle = !!subtitle

  if (!showBreadcrumb && !hasActions && !hasSubtitle) {
    return null
  }

  return (
    <header className={className}>
      <div className="page-heading__glow" aria-hidden />
      <div className="page-heading__body">
        <div className="page-heading__text min-w-0">
          {showBreadcrumb ? (
            <div className="page-heading__breadcrumb">
              <AppBreadcrumb />
            </div>
          ) : null}
          {subtitle ? <p className="ds-page-subtitle page-heading__subtitle">{subtitle}</p> : null}
        </div>
        {hasActions ? <div className="page-heading__actions">{children}</div> : null}
      </div>
    </header>
  )
}
