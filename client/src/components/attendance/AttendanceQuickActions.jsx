/**
 * One-click bulk mark actions for the visible roster.
 */
export default function AttendanceQuickActions({ t, onMarkAll, disabled }) {
  return (
    <div className="att-quick" role="group" aria-label={t('attendance.quickActions')}>
      <button
        type="button"
        className="btn btn-sm att-quick__btn att-quick__btn--present"
        disabled={disabled}
        onClick={() => onMarkAll('present')}
      >
        {t('attendance.markAllPresent')}
      </button>
      <button
        type="button"
        className="btn btn-sm att-quick__btn att-quick__btn--absent"
        disabled={disabled}
        onClick={() => onMarkAll('absent')}
      >
        {t('attendance.markAllAbsent')}
      </button>
      <button
        type="button"
        className="btn btn-sm att-quick__btn att-quick__btn--leave"
        disabled={disabled}
        onClick={() => onMarkAll('sick')}
      >
        {t('attendance.markAllSick')}
      </button>
      <button
        type="button"
        className="btn btn-sm att-quick__btn att-quick__btn--late"
        disabled={disabled}
        onClick={() => onMarkAll('late')}
      >
        {t('attendance.markAllLate')}
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary att-quick__btn"
        disabled={disabled}
        onClick={() => onMarkAll('clear')}
      >
        {t('attendance.clearAll')}
      </button>
    </div>
  )
}
