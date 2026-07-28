import { useTranslation } from 'react-i18next'
import { loc } from '../../shared/localized'
import ExamStepHeader from '../../components/exam/ExamStepHeader'
import ExamResultMatrix from '../../components/exam/ExamResultMatrix'

export default function ExamResultsStep({
  lng,
  selectedDarjahId,
  selectedSectionId,
  setSelectedSectionId,
  pendingMarksSubjects,
  marksReadyForProcess,
  matrixLoading,
  resultMatrix,
  sectionsForDarjah,
  onConfirmProcess,
  onExportResults,
  onPrintBulk,
  onPrintRollSheet,
  onPrintNamazSheet,
}) {
  const { t } = useTranslation()

  return (
    <div className="exam-step-box">
      <ExamStepHeader title={t('exam.step.results')} hint={t('exam.resultsLead')} />
      {selectedDarjahId && pendingMarksSubjects.length > 0 && (
        <div className="alert alert-warning mb-3">
          <p className="mb-2">{t('exam.marksNotReady')}</p>
          <ul className="mb-0 ps-3">
            {pendingMarksSubjects.map((row) => (
              <li key={row.mapping._id}>
                {t('exam.pendingMarksDetail', {
                  subject: row.subjectName,
                  submitted: row.submitted,
                  expected: row.expected,
                })}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap gap-2 mb-3 exam-results-actions">
        {selectedDarjahId && (
          <>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!marksReadyForProcess}
              title={!marksReadyForProcess ? t('exam.marksNotReady') : undefined}
              onClick={onConfirmProcess}
            >
              {t('exam.processResults')}
            </button>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onExportResults}>
              {t('exam.exportCsv')}
            </button>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onPrintBulk}>
              {t('exam.printBulk')}
            </button>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onPrintRollSheet}>
              {t('exam.printRollSheet')}
            </button>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onPrintNamazSheet}>
              {t('exam.printNamazSheet')}
            </button>
          </>
        )}
      </div>
      {selectedDarjahId && sectionsForDarjah.length > 0 && (
        <div className="exam-segment">
          <button
            type="button"
            className={`btn btn-sm ${!selectedSectionId ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setSelectedSectionId('')}
          >
            {t('exam.combined')}
          </button>
          {sectionsForDarjah.map((s) => (
            <button
              key={s._id}
              type="button"
              className={`btn btn-sm ${selectedSectionId === s._id ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setSelectedSectionId(s._id)}
            >
              {loc(s.name, lng)}
            </button>
          ))}
        </div>
      )}
      {selectedDarjahId ? (
        matrixLoading ? (
          <p className="text-secondary">{t('common.loading')}</p>
        ) : (
          <ExamResultMatrix data={resultMatrix} lng={lng} />
        )
      ) : (
        <p className="text-secondary">{t('exam.selectClassForMatrix')}</p>
      )}
    </div>
  )
}
