import { useTranslation } from 'react-i18next'
import ExamStepHeader from '../../components/exam/ExamStepHeader'
import ExamAnnouncePanel from '../../components/exam/ExamAnnouncePanel'

export default function ExamAnnounceStep({
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
    <div className="exam-step-box">
      <ExamStepHeader title={t('exam.step.announce')} hint={t('exam.announceLead')} />
      <ExamAnnouncePanel
        lng={lng}
        snapshots={snapshots}
        publishStudentId={publishStudentId}
        onPublishStudentChange={onPublishStudentChange}
        onPublish={onPublish}
        onPrintBulk={onPrintBulk}
        onPrintSingle={onPrintSingle}
        onPrintRoll={onPrintRoll}
        onPrintNamaz={onPrintNamaz}
        onPrintStudentCard={onPrintStudentCard}
        selectedDarjahId={selectedDarjahId}
        selectedSectionId={selectedSectionId}
        resultsProcessed={resultsProcessed}
        allClassesProcessed={allClassesProcessed}
        hasUnpublishedResults={hasUnpublishedResults}
        onProcessResults={onProcessResults}
      />
    </div>
  )
}
