import { ATTENDANCE_STATUSES, STATUS_LABEL_KEYS } from './attendanceConstants'

/**
 * Compact segmented status control — replaces radio columns for speed + a11y.
 */
export default function AttendanceStatusSegment({
  value,
  onChange,
  t,
  name,
  disabled = false,
  statuses = ATTENDANCE_STATUSES,
  size = 'md',
}) {
  return (
    <div
      className={`att-status att-status--${size}`}
      role="radiogroup"
      aria-label={t('attendance.markMode')}
      aria-disabled={disabled || undefined}
    >
      {statuses.map((st) => {
        const active = value === st
        return (
          <button
            key={st}
            type="button"
            role="radio"
            name={name}
            aria-checked={active}
            disabled={disabled}
            className={`att-status__btn att-status__btn--${st}${active ? ' is-active' : ''}`}
            onClick={() => onChange(st)}
            onKeyDown={(e) => {
              if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') {
                return
              }
              e.preventDefault()
              const dir = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1
              const idx = statuses.indexOf(st)
              const next = statuses[(idx + dir + statuses.length) % statuses.length]
              onChange(next)
            }}
          >
            {t(STATUS_LABEL_KEYS[st])}
          </button>
        )
      })}
    </div>
  )
}
