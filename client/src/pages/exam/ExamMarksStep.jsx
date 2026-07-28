import { useTranslation } from 'react-i18next'
import { loc } from '../../shared/localized'
import DataTable from '../../components/DataTable'
import ExamStepHeader from '../../components/exam/ExamStepHeader'
import { AppInput, AppSelect } from '../../components/ui'
import { col } from '../../components/exam/examTableUtils'

export default function ExamMarksStep({
  lng,
  mappingLocked,
  marksHaveUnsavedChanges,
  teacherFilterId,
  setTeacherFilterId,
  selectedMappingId,
  setSelectedMappingId,
  marksData,
  subjectMappings,
  teachers,
  selectedMapping,
  marksEntryEditable,
  marksDraft,
  setMarksDraft,
  snapshots,
  excelInputRef,
  isMarksRowEditable,
  onImportMarks,
  onInitMarksDraft,
  onUnlockSubject,
  onUnlockStudent,
  onSaveMarks,
  onGraceStudent,
}) {
  const { t } = useTranslation()

  return (
    <div className="exam-step-box">
      {mappingLocked && (
        <div className="alert alert-warning py-2 mb-3">
          {t('exam.subjectLockedHint')}
          {selectedMappingId && (
            <button
              type="button"
              className="btn btn-outline-warning btn-sm ms-2"
              onClick={() => onUnlockSubject(selectedMappingId)}
            >
              {t('exam.unlockSubject')}
            </button>
          )}
        </div>
      )}
      {marksHaveUnsavedChanges && (
        <div className="alert alert-info py-2 mb-3">
          {t('exam.marksUnsavedHint')}
        </div>
      )}
      <ExamStepHeader title={t('exam.step.marks')} />
      <div className="exam-toolbar exam-toolbar--form">
        <div className="exam-toolbar__field">
          <label className="exam-toolbar__label">{t('exam.teacherFilter')}</label>
          <AppSelect
            value={teacherFilterId}
            onChange={(e) => setTeacherFilterId(e.target.value)}
            title={t('exam.teacherFilter')}
          >
            <option value="">{t('exam.allTeachers')}</option>
            {teachers.map((tc) => (
              <option key={tc._id} value={tc._id}>{loc(tc.name, lng)}</option>
            ))}
          </AppSelect>
        </div>
        <div className="exam-toolbar__field exam-toolbar__field--grow">
          <label className="exam-toolbar__label">{t('exam.selectSubject')}</label>
          <AppSelect
            value={selectedMappingId}
            onChange={(e) => setSelectedMappingId(e.target.value)}
          >
            <option value="">{t('exam.selectSubject')}</option>
            {(marksData?.mappings || subjectMappings).map((m) => (
              <option key={m._id} value={m._id}>
                {loc(m.subjectId?.name, lng)} ({m.maxMarks})
              </option>
            ))}
          </AppSelect>
        </div>
        <div className="exam-toolbar__actions">
          <input
            ref={excelInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="d-none"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onImportMarks(f)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            disabled={!selectedMappingId || !marksEntryEditable}
            title={!marksEntryEditable ? t('exam.subjectLockedHint') : ''}
            onClick={() => excelInputRef.current?.click()}
          >
            {t('exam.importExcel')}
          </button>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onInitMarksDraft}>
            {t('exam.loadMarks')}
          </button>
          <button
            type="button"
            className="btn btn-outline-warning btn-sm"
            disabled={!selectedMappingId}
            onClick={() => onUnlockSubject(selectedMappingId)}
          >
            {t('exam.unlockSubject')}
          </button>
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            disabled={!selectedMappingId || !marksEntryEditable}
            title={!marksEntryEditable ? t('exam.subjectLockedHint') : ''}
            onClick={() => onSaveMarks(false)}
          >
            {t('exam.saveDraft')}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!selectedMappingId || !marksEntryEditable}
            title={!marksEntryEditable ? t('exam.subjectLockedHint') : ''}
            onClick={() => onSaveMarks(true)}
          >
            {t('exam.submitFinal')}
          </button>
        </div>
      </div>
      {selectedMappingId && (
        <DataTable
          columns={[
            col(t('exam.col.roll'), (r) => (
              <span className="exam-roll-cell" dir="ltr" title={r.rollNumber || ''}>
                {r.rollNumber || '—'}
              </span>
            )),
            col(t('exam.col.student'), (r) => loc(r.studentName, lng)),
            col(t('exam.col.marks'), (r) => {
              const editable = isMarksRowEditable(r._id)
              const maxMarks = Number(selectedMapping?.maxMarks) || 100
              return (
                <AppInput
                  type="number"
                  className="w-24"
                  min={0}
                  max={maxMarks}
                  disabled={!editable}
                  title={!editable ? t('exam.subjectLockedHint') : undefined}
                  value={marksDraft[r._id] ?? ''}
                  onChange={(e) => setMarksDraft((d) => ({ ...d, [r._id]: e.target.value }))}
                />
              )
            }),
            col(t('exam.col.actions'), (r) => (
              <div className="flex gap-1">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  disabled={!isMarksRowEditable(r._id)}
                  onClick={() => onGraceStudent(r)}
                >
                  {t('exam.grace')}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-warning btn-sm"
                  onClick={() => onUnlockStudent(r._id)}
                >
                  {t('exam.unlockStudent')}
                </button>
              </div>
            )),
          ]}
          rows={marksData?.snapshots || snapshots}
        />
      )}
    </div>
  )
}
