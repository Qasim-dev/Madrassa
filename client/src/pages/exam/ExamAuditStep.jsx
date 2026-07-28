import { useTranslation } from 'react-i18next'
import ExamStepHeader from '../../components/exam/ExamStepHeader'
import ExamAuditPanel from '../../components/exam/ExamAuditPanel'

export default function ExamAuditStep({ auditLogs, auditLoading }) {
  const { t } = useTranslation()

  return (
    <div className="exam-step-box">
      <ExamStepHeader title={t('exam.step.audit')} hint={t('exam.auditHint')} />
      <ExamAuditPanel logs={auditLogs} loading={auditLoading} />
    </div>
  )
}
