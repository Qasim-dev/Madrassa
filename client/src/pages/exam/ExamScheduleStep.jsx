import { useTranslation } from 'react-i18next'
import { loc } from '../../shared/localized'
import { formatDisplayDate } from '../../shared/formatDisplayDate'
import DataTable from '../../components/DataTable'
import ExamStepHeader from '../../components/exam/ExamStepHeader'
import AppDateInput from '../../components/AppDateInput'
import { AppInput, AppSelect } from '../../components/ui'
import { col } from '../../components/exam/examTableUtils'

export default function ExamScheduleStep({
  lng,
  mode,
  selectedDarjahId,
  subjectMappings,
  schedule,
  scheduleForm,
  setScheduleForm,
  editingScheduleId,
  setEditingScheduleId,
  scheduleConflicts,
  availableScheduleMappings,
  teachers,
  onToggleScheduleMapping,
  onSelectAllAvailableScheduleMappings,
  onClearScheduleMappingSelection,
  onSaveSchedule,
  onStartEditSchedule,
  onDeleteSchedule,
}) {
  const { t } = useTranslation()

  function formatSubjectKitabLabel(m) {
    if (!m) return '—'
    const subject = loc(m.subjectId?.name, lng) || '—'
    const book = loc(m.bookId?.title, lng)
    return book ? `${subject} — ${book}` : subject
  }

  return (
    <div className="exam-step-box">
      <ExamStepHeader title={t('exam.step.schedule')} hint={t('exam.scheduleLead')} />
      {!selectedDarjahId && (
        <div className="alert alert-info mb-3">{t('exam.selectClassFirst')}</div>
      )}
      {selectedDarjahId && subjectMappings.length === 0 && (
        <div className="alert alert-warning mb-3">{t('exam.scheduleNoMappings')}</div>
      )}
      {selectedDarjahId && (
        <>
          {!editingScheduleId && (
            <div className="mb-3">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                <label className="exam-toolbar__label mb-0">
                  {t('exam.schedulePickSubjects')}
                  {scheduleForm.subjectMappingIds?.length > 0 && (
                    <span className="text-secondary ms-1">
                      ({scheduleForm.subjectMappingIds.length})
                    </span>
                  )}
                </label>
                <div className="d-flex flex-wrap gap-1">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    disabled={!availableScheduleMappings.length}
                    onClick={onSelectAllAvailableScheduleMappings}
                  >
                    {t('exam.scheduleSelectAll')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    disabled={!scheduleForm.subjectMappingIds?.length}
                    onClick={onClearScheduleMappingSelection}
                  >
                    {t('exam.scheduleClearSelection')}
                  </button>
                </div>
              </div>
              {availableScheduleMappings.length === 0 ? (
                <p className="small text-secondary mb-0">{t('exam.scheduleAllMapped')}</p>
              ) : (
                <div className="exam-schedule-pick-list border rounded p-2">
                  {availableScheduleMappings.map((m) => {
                    const id = String(m._id)
                    const checked = (scheduleForm.subjectMappingIds || []).includes(id)
                    return (
                      <label key={id} className="exam-schedule-pick-item d-flex align-items-center gap-2 mb-1">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => onToggleScheduleMapping(id)}
                        />
                        <span>{formatSubjectKitabLabel(m)}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )}
          <div className="exam-toolbar exam-toolbar--form">
            {editingScheduleId && (
              <div className="exam-toolbar__field">
                <label className="exam-toolbar__label">{t('exam.col.subject')}</label>
                <AppSelect
                  value={scheduleForm.subjectMappingId}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, subjectMappingId: e.target.value }))}
                >
                  <option value="">{t('exam.selectSubject')}</option>
                  {availableScheduleMappings.map((m) => (
                    <option key={m._id} value={m._id}>{formatSubjectKitabLabel(m)}</option>
                  ))}
                </AppSelect>
              </div>
            )}
            <div className="exam-toolbar__field">
              <label className="exam-toolbar__label">{t('exam.col.date')}</label>
              <AppDateInput
                value={scheduleForm.examDate}
                onChange={(v) => setScheduleForm((f) => ({ ...f, examDate: v }))}
              />
            </div>
            <div className="exam-toolbar__field exam-toolbar__field--time">
              <label className="exam-toolbar__label">{t('exam.col.time')}</label>
              <div className="exam-toolbar__time-pair">
                <AppInput
                  type="time"
                  value={scheduleForm.startTime}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, startTime: e.target.value }))}
                />
                <AppInput
                  type="time"
                  value={scheduleForm.endTime}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, endTime: e.target.value }))}
                />
              </div>
            </div>
            <div className="exam-toolbar__field">
              <label className="exam-toolbar__label">{t('exam.col.room')}</label>
              <AppInput
                type="text"
                placeholder={t('exam.col.room')}
                value={scheduleForm.room}
                onChange={(e) => setScheduleForm((f) => ({ ...f, room: e.target.value }))}
              />
            </div>
            <div className="exam-toolbar__field">
              <label className="exam-toolbar__label">{t('exam.col.supervisor')}</label>
              <AppSelect
                value={scheduleForm.supervisorId}
                onChange={(e) => setScheduleForm((f) => ({ ...f, supervisorId: e.target.value }))}
              >
                <option value="">{t('exam.col.supervisor')}</option>
                {teachers.map((tc) => (
                  <option key={tc._id} value={tc._id}>{loc(tc.name, lng)}</option>
                ))}
              </AppSelect>
            </div>
            <div className="exam-toolbar__actions">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={
                  !scheduleForm.examDate ||
                  (editingScheduleId
                    ? !scheduleForm.subjectMappingId
                    : !(scheduleForm.subjectMappingIds || []).length)
                }
                onClick={onSaveSchedule}
              >
                {editingScheduleId ? t('exam.updateSchedule') : t('exam.addSchedule')}
              </button>
              {editingScheduleId && (
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => {
                    setEditingScheduleId(null)
                    setScheduleForm((f) => ({
                      ...f,
                      subjectMappingId: '',
                      subjectMappingIds: [],
                    }))
                  }}
                >
                  {t('common.cancel')}
                </button>
              )}
            </div>
          </div>
        </>
      )}
      {scheduleConflicts.length > 0 && (
        <div className="alert alert-warning mb-3">
          {t('exam.scheduleConflict')}
          <ul className="mb-0 mt-1 small">
            {scheduleConflicts.map((c, i) => (
              <li key={i}>{c.message || c.type}</li>
            ))}
          </ul>
        </div>
      )}
      <DataTable
        columns={[
          col(t('exam.col.subject'), (r) => formatSubjectKitabLabel(r.subjectMappingId)),
          col(t('exam.col.date'), (r) => formatDisplayDate(r.examDate, lng, mode)),
          col(t('exam.col.time'), (r) => `${r.startTime || ''} – ${r.endTime || ''}`),
          col(t('exam.col.class'), (r) => loc(r.darjahId?.name, lng)),
          col(t('exam.col.section'), (r) => loc(r.sectionId?.name, lng) || '—'),
          col(t('exam.col.room'), (r) => r.room || '—'),
          col(t('exam.col.supervisor'), (r) => loc(r.supervisorId?.name, lng) || '—'),
          col(t('exam.col.actions'), (r) => (
            <div className="flex gap-1">
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => onStartEditSchedule(r)}>
                {t('common.edit')}
              </button>
              <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => onDeleteSchedule(r._id)}>
                {t('common.delete')}
              </button>
            </div>
          )),
        ]}
        rows={schedule}
      />
    </div>
  )
}
