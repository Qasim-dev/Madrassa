import { useTranslation } from 'react-i18next'
import ExamStepHeader from '../../components/exam/ExamStepHeader'
import ExamRollAssignPanel from '../../components/exam/ExamRollAssignPanel'

export default function ExamSnapshotStep({
  lng,
  structureFrozen,
  snapshots,
  selectedSectionId,
  rollSaving,
  onGenerateSnapshot,
  onSaveRolls,
  onAutoAssign,
}) {
  const { t } = useTranslation()

  return (
    <div className="exam-step-box">
      <ExamStepHeader title={t('exam.step.snapshot')} hint={t('exam.snapshotLead')} />
      {structureFrozen && (
        <div className="alert alert-info mb-3">{t('exam.structureFrozen')}</div>
      )}
      <div className="flex flex-wrap gap-2 mb-3">
        <button type="button" className="btn btn-primary btn-sm" onClick={onGenerateSnapshot} disabled={structureFrozen}>
          {t('exam.generateSnapshot')}
        </button>
      </div>
      <ExamRollAssignPanel
        lng={lng}
        snapshots={snapshots}
        sectionFilter={selectedSectionId}
        onSaveRolls={onSaveRolls}
        onAutoAssign={onAutoAssign}
        saving={rollSaving}
      />
    </div>
  )
}
