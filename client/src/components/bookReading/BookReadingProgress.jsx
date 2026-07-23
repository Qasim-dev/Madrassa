import { useTranslation } from 'react-i18next'
import { READING_STATUS_LABELS } from '../../shared/readingEnums'
import { formatDisplayDate } from '../../shared/formatDisplayDate'
import { useCalendarMode } from '../../app/calendarMode'

export default function BookReadingProgress({ progress, lng }) {
  const { t } = useTranslation()
  const { mode } = useCalendarMode()
  if (!progress) return null

  const pct = Math.min(100, Math.max(0, progress.readingPercentage ?? 0))
  const statusKey = progress.status || 'NOT_STARTED'
  const statusLabel = READING_STATUS_LABELS[statusKey]?.[lng?.startsWith('en') ? 'en' : 'ur'] || statusKey

  return (
    <div className="book-reading-progress">
      <div className="book-reading-progress__head">
        <span className={`book-reading-progress__badge book-reading-progress__badge--${statusKey.toLowerCase()}`}>
          {statusLabel}
        </span>
        <span className="book-reading-progress__pct" dir="ltr">{pct}%</span>
      </div>
      <div className="book-reading-progress__bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="book-reading-progress__fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="book-reading-progress__meta">
        <span dir="ltr">
          {t('bookReading.currentPage')}: <strong>{progress.currentPage ?? 0}</strong>
          {' / '}
          <strong>{progress.totalPages ?? '—'}</strong>
        </span>
        {progress.lastReadDate && (
          <span>
            {t('bookReading.lastRead')}: {formatDisplayDate(progress.lastReadDate, lng, mode)}
          </span>
        )}
      </div>
    </div>
  )
}
