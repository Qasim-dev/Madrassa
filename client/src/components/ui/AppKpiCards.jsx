import { Link } from 'react-router-dom'

/**
 * @typedef {Object} AppKpiCardItem
 * @property {string} key
 * @property {import('react').ReactNode} [value]
 * @property {import('react').ReactNode} label
 * @property {import('react').ReactNode} [hint]
 * @property {import('react').ReactNode} [actionLabel]
 * @property {import('react').ReactNode} [icon]
 * @property {string} [tone]
 * @property {boolean} [featured]
 * @property {string} [to]
 * @property {() => void} [onClick]
 * @property {string} [ariaLabel]
 */

function toneClass(tone, featured) {
  if (featured) return 'app-kpi-card--featured'
  if (!tone) return 'app-kpi-card--teal'
  return `app-kpi-card--${tone}`
}

function formatValue(value) {
  if (value == null || value === '') return '—'
  if (typeof value === 'number') return value.toLocaleString()
  return value
}

/** Single KPI card — exam-dashboard style, link or button when interactive. */
export function AppKpiCard({ item, onCardClick, defaultActionLabel }) {
  const {
    to,
    onClick,
    value,
    label,
    hint,
    actionLabel,
    icon,
    tone,
    featured,
    ariaLabel,
  } = item

  const interactive = Boolean(to || onClick || onCardClick)
  const hasValue = value !== undefined && value !== null && value !== ''
  const className = [
    'app-kpi-card',
    toneClass(tone, featured),
    interactive ? 'app-kpi-card--clickable' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      {icon ? <div className="app-kpi-card__icon">{icon}</div> : null}
      <div className="app-kpi-card__body">
        {hasValue ? <div className="app-kpi-card__value table-num">{formatValue(value)}</div> : null}
        <div className="app-kpi-card__label">{label}</div>
        {hint ? <div className="app-kpi-card__hint">{hint}</div> : null}
        {interactive && (actionLabel ?? defaultActionLabel) ? (
          <div className="app-kpi-card__action">{actionLabel ?? defaultActionLabel}</div>
        ) : null}
      </div>
    </>
  )

  const handleClick = () => {
    if (onClick) onClick(item)
    else if (onCardClick) onCardClick(item)
  }

  if (to) {
    return (
      <Link to={to} className={className} aria-label={ariaLabel || String(label)}>
        {content}
      </Link>
    )
  }

  if (onClick || onCardClick) {
    return (
      <button type="button" className={className} onClick={handleClick} aria-label={ariaLabel || String(label)}>
        {content}
      </button>
    )
  }

  return <div className={className}>{content}</div>
}

/**
 * Responsive grid of KPI cards — shared across dashboard, exams, finance, inventory, library.
 *
 * @param {{
 *   items: AppKpiCardItem[],
 *   loading?: boolean,
 *   skeletonCount?: number,
 *   columns?: 2 | 3 | 4 | 5 | 'auto',
 *   className?: string,
 *   onCardClick?: (item: AppKpiCardItem) => void,
 *   actionLabel?: string,
 * }} props
 */
export default function AppKpiCards({
  items,
  loading = false,
  skeletonCount = 4,
  columns = 4,
  className = '',
  onCardClick,
  actionLabel,
}) {
  const gridClass =
    columns === 'auto'
      ? 'app-kpi-grid--auto'
      : columns === 2
        ? 'app-kpi-grid--cols-2'
        : columns === 3
          ? 'app-kpi-grid--cols-3'
          : columns === 5
            ? 'app-kpi-grid--cols-5'
            : ''

  if (loading) {
    return (
      <div className={`app-kpi-grid ${gridClass} ${className}`.trim()}>
        {Array.from({ length: skeletonCount }, (_, i) => (
          <div key={i} className="app-kpi-card app-kpi-card--skeleton" aria-hidden />
        ))}
      </div>
    )
  }

  if (!items?.length) return null

  return (
    <div className={`app-kpi-grid ${gridClass} ${className}`.trim()}>
      {items.map((item) => (
        <AppKpiCard
          key={item.key}
          item={item}
          onCardClick={onCardClick}
          defaultActionLabel={actionLabel}
        />
      ))}
    </div>
  )
}
