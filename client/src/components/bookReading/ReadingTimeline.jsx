import { useTranslation } from 'react-i18next'
import { loc } from '../../shared/localized'
import { formatDisplayDate } from '../../shared/formatDisplayDate'
import { useCalendarMode } from '../../app/calendarMode'

export default function ReadingTimeline({ records, lng, onEdit, onDelete }) {
  const { t } = useTranslation()
  const { mode } = useCalendarMode()

  if (!records?.length) {
    return (
      <div className="reading-timeline reading-timeline--empty">
        <p className="text-secondary mb-0">{t('bookReading.noRecords')}</p>
      </div>
    )
  }

  return (
    <div className="reading-timeline">
      {records.map((r) => (
        <article key={r._id} className="reading-timeline__item">
          <div className="reading-timeline__dot" />
          <div className="reading-timeline__body">
            <div className="reading-timeline__head">
              <time className="reading-timeline__date">{formatDisplayDate(r.readingDate, lng, mode)}</time>
              <span className="reading-timeline__pages" dir="ltr">
                {t('bookReading.pagesRead')}: {r.startPage}–{r.endPage} ({r.pagesRead})
              </span>
            </div>
            {r.durationMinutes != null && (
              <p className="reading-timeline__duration small text-secondary mb-1">
                {t('bookReading.duration')}: {r.durationMinutes} {t('bookReading.minutes')}
              </p>
            )}
            {r.notes ? <p className="reading-timeline__notes mb-2">{r.notes}</p> : null}
            {!r.bookId?.title && null}
            {r.bookId?.title && (
              <p className="small text-secondary mb-1 d-none">{loc(r.bookId.title, lng)}</p>
            )}
            <div className="reading-timeline__actions">
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => onEdit(r)}>
                {t('common.edit')}
              </button>
              <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => onDelete(r._id)}>
                {t('common.delete')}
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
