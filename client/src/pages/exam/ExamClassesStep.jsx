import { useTranslation } from 'react-i18next'
import { loc } from '../../shared/localized'
import DataTable from '../../components/DataTable'
import ExamStatusBadge from '../../components/exam/ExamStatusBadge'
import ExamStepHeader from '../../components/exam/ExamStepHeader'
import { AppCheckbox } from '../../components/ui'
import { col } from '../../components/exam/examTableUtils'

export default function ExamClassesStep({
  lng,
  selectedExam,
  examIsLocked,
  structureFrozen,
  darajat,
  pipelines,
  classPicker,
  setClassPicker,
  onAddClasses,
  onRemoveClass,
  onUnlockExam,
}) {
  const { t } = useTranslation()

  return (
    <div className="exam-step-box">
      <ExamStepHeader title={`${t('exam.step.classes')} — ${loc(selectedExam?.name, lng)}`} />
      {examIsLocked && (
        <div className="alert alert-warning d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <span>{t('exam.lockedBanner')}</span>
          <button type="button" className="btn btn-warning btn-sm" onClick={onUnlockExam}>
            {t('exam.unlockExam')}
          </button>
        </div>
      )}
      {!structureFrozen && (
        <div className="mb-4 p-3 border rounded">
          <label className="form-label">{t('exam.addClasses')}</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {darajat
              .filter((d) => !pipelines.some((p) => String(p.darjahId?._id || p.darjahId) === String(d._id)))
              .map((d) => (
                <AppCheckbox
                  key={d._id}
                  id={`class-pick-${d._id}`}
                  size="sm"
                  className="text-sm"
                  label={loc(d.name, lng)}
                  checked={classPicker.includes(d._id)}
                  onChange={(e) =>
                    setClassPicker((prev) =>
                      e.target.checked ? [...prev, d._id] : prev.filter((id) => id !== d._id)
                    )
                  }
                />
              ))}
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={onAddClasses} disabled={!classPicker.length}>
            {t('exam.addSelectedClasses')}
          </button>
        </div>
      )}
      {structureFrozen && !examIsLocked && (
        <div className="alert alert-info mb-3">{t('exam.structureFrozen')}</div>
      )}
      <DataTable
        columns={[
          col(t('exam.col.class'), (r) => loc(r.darjahId?.name, lng)),
          col(t('exam.col.code'), (r) => r.darjahId?.code || '—'),
          col(t('exam.col.status'), (r) => <ExamStatusBadge status={r.status} lng={lng} />),
          col(t('exam.col.actions'), (r) => (
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              disabled={!!r.marksEntryStartedAt}
              onClick={() => onRemoveClass(r.darjahId?._id || r.darjahId)}
            >
              {t('exam.remove')}
            </button>
          )),
        ]}
        rows={pipelines}
      />
    </div>
  )
}
