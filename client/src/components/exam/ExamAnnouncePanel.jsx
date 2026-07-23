import { useTranslation } from 'react-i18next'
import { loc } from '../../shared/localized'
import { AppSelect } from '../ui'

export { default as ExamResultCard } from './ExamResultCard'

/** Publish + print actions */
export default function ExamAnnouncePanel({
  lng,
  snapshots,
  publishStudentId,
  onPublishStudentChange,
  onPublish,
  onPrintBulk,
  onPrintSingle,
  onPrintRoll,
  onPrintNamaz,
  onPrintStudentCard,
  selectedDarjahId,
  selectedSectionId,
  resultsProcessed,
  allClassesProcessed,
  hasUnpublishedResults,
  onProcessResults,
}) {
  const { t } = useTranslation()

  return (
    <div className="exam-panel exam-panel--announce">
      <div className="exam-panel__head">
        <div>
          <h3 className="exam-panel__title">{t('exam.announceTitle')}</h3>
          <p className="exam-panel__hint mb-0">{t('exam.announceHint')}</p>
        </div>
      </div>

      {!resultsProcessed && selectedDarjahId && (
        <div className="alert alert-info py-2 mb-3 d-flex flex-wrap align-items-center gap-2">
          <span>{t('exam.processResultsFirst')}</span>
          <button type="button" className="btn btn-sm btn-primary" onClick={onProcessResults}>
            {t('exam.processResults')}
          </button>
        </div>
      )}

      {resultsProcessed && !hasUnpublishedResults && (
        <div className="alert alert-success py-2 mb-3">{t('exam.allResultsPublished')}</div>
      )}

      <div className="exam-announce-grid">
        <div className="exam-announce-block">
          <h4 className="exam-announce-block__title">{t('exam.publishBlock')}</h4>
          <p className="small text-secondary">{t('exam.publishBlockHint')}</p>
          <div className="exam-announce-actions">
            <button
              type="button"
              className="btn btn-outline-success btn-sm"
              disabled={!selectedSectionId || !resultsProcessed}
              onClick={() => onPublish('section')}
            >
              {t('exam.publish.section')}
            </button>
            <button
              type="button"
              className="btn btn-outline-success btn-sm"
              disabled={!selectedDarjahId || !resultsProcessed}
              onClick={() => onPublish('class')}
            >
              {t('exam.publish.class')}
            </button>
            <button
              type="button"
              className="btn btn-success btn-sm"
              disabled={!allClassesProcessed}
              onClick={() => onPublish('exam')}
            >
              {t('exam.publish.exam')}
            </button>
          </div>
          <div className="exam-announce-row">
            <div className="exam-announce-row__field">
              <label className="exam-toolbar__label" htmlFor="exam-publish-student">
                {t('exam.selectStudentPublish')}
              </label>
              <AppSelect
                id="exam-publish-student"
                value={publishStudentId}
                onChange={(e) => onPublishStudentChange(e.target.value)}
              >
                <option value="">{t('exam.chooseStudent')}</option>
                {snapshots.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.rollNumber || '—'} — {loc(s.studentName, lng)}
                  </option>
                ))}
              </AppSelect>
            </div>
            <div className="exam-announce-row__actions">
              <button
                type="button"
                className="btn btn-outline-success btn-sm"
                disabled={!publishStudentId || !resultsProcessed}
                onClick={() => onPublish('student')}
              >
                {t('exam.publish.student')}
              </button>
            </div>
          </div>
        </div>

        <div className="exam-announce-block">
          <h4 className="exam-announce-block__title">{t('exam.printBlock')}</h4>
          <p className="small text-secondary">{t('exam.printBlockHint')}</p>
          <div className="exam-announce-actions">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={!selectedDarjahId}
              onClick={onPrintBulk}
            >
              {t('exam.printBulk')}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={!publishStudentId}
              onClick={onPrintSingle}
            >
              {t('exam.printSingle')}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={!selectedDarjahId}
              onClick={onPrintRoll}
            >
              {t('exam.printRollSheet')}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={!selectedDarjahId}
              onClick={onPrintNamaz}
            >
              {t('exam.printNamazSheet')}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={!publishStudentId}
              onClick={onPrintStudentCard}
            >
              {t('exam.printStudentIdCard')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
