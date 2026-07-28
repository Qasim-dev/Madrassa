import { useTranslation } from 'react-i18next'
import { loc } from '../../shared/localized'
import { formatDisplayDate } from '../../shared/formatDisplayDate'
import DataTable from '../../components/DataTable'
import ExamStatusBadge from '../../components/exam/ExamStatusBadge'
import { col } from '../../components/exam/examTableUtils'

export default function ExamContainersStep({
  lng,
  mode,
  exams,
  examsLoading,
  onNewExam,
  onEditExam,
  onConfigureExam,
  onDeleteExam,
}) {
  const { t } = useTranslation()

  function formatExamClasses(row) {
    const pipes = row.pipelines || []
    if (!pipes.length) return '—'
    return pipes
      .map((p) => {
        const name = loc(p.darjahId?.name, lng)
        const code = p.darjahId?.code ? ` (${p.darjahId.code})` : ''
        return name + code
      })
      .join(lng.startsWith('ur') ? '، ' : ', ')
  }

  return (
    <div className="exam-step-box">
      <p className="exam-step-box__lead">{t('exam.flowGuide')}</p>
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold mb-0">{t('exam.step.containers')}</h2>
        <button type="button" className="btn btn-primary btn-sm" onClick={onNewExam}>
          + {t('exam.newExam')}
        </button>
      </div>
      <DataTable
        isLoading={examsLoading}
        columns={[
          col(t('exam.col.name'), (r) => loc(r.name, lng)),
          col(t('exam.col.type'), (r) => loc(r.examType, lng) || '—'),
          col(t('exam.col.class'), (r) => formatExamClasses(r)),
          col(t('exam.col.start'), (r) => formatDisplayDate(r.startDate, lng, mode)),
          col(t('exam.col.end'), (r) => formatDisplayDate(r.endDate, lng, mode)),
          col(t('exam.col.status'), (r) => <ExamStatusBadge status={r.status} lng={lng} />),
          col(t('exam.col.actions'), (r) => (
            <div className="flex gap-1 flex-wrap">
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => onEditExam(r)}>
                {t('common.edit')}
              </button>
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={() => onConfigureExam(r._id)}
              >
                {t('exam.configure')}
              </button>
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={() => onDeleteExam(r)}
              >
                {t('common.delete')}
              </button>
            </div>
          )),
        ]}
        rows={exams}
      />
    </div>
  )
}
