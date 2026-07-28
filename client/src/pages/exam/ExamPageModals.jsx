import { useTranslation } from 'react-i18next'
import { loc } from '../../shared/localized'
import AppModalShell from '../../components/AppModalShell'
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal'
import ConfirmActionModal from '../../components/ConfirmActionModal'
import AppDateInput from '../../components/AppDateInput'
import { AppInput, AppSelect, FormField, FormRow } from '../../components/ui'

export default function ExamPageModals({
  lng,
  examNames,
  graceTarget,
  setGraceTarget,
  graceForm,
  setGraceForm,
  onApplyGrace,
  graceErrors = {},
  onGraceBlur,
  onGraceChange,
  savingGrace = false,
  examModal,
  setExamModal,
  editingExam,
  examForm,
  setExamForm,
  onSaveExam,
  examErrors = {},
  onExamBlur,
  onExamChange,
  savingExam = false,
  deleteTarget,
  setDeleteTarget,
  deleteExamReason,
  setDeleteExamReason,
  onDeleteExam,
  deleteExamErrors = {},
  onDeleteExamBlur,
  onDeleteExamChange,
  deletingExam = false,
  deleteScheduleTarget,
  setDeleteScheduleTarget,
  onDeleteSchedule,
  deleteMappingTarget,
  setDeleteMappingTarget,
  onDeleteSubjectMapping,
  confirmProcessOpen,
  setConfirmProcessOpen,
  onProcessResults,
  confirmPublish,
  setConfirmPublish,
  onPublish,
  unlockModal,
  unlockReason,
  setUnlockReason,
  onCloseUnlockModal,
  onUnlockSubmit,
  unlockErrors = {},
  onUnlockBlur,
  onUnlockChange,
  savingUnlock = false,
}) {
  const { t } = useTranslation()

  return (
    <>
      {graceTarget && (
        <AppModalShell onClose={() => setGraceTarget(null)} title={t('exam.graceTitle')}>
          <form
            className="modal-app-form"
            onSubmit={(e) => {
              e.preventDefault()
              onApplyGrace()
            }}
            noValidate
          >
            <div className="modal-app-body">
              <p className="small text-secondary mb-2">
                {loc(graceTarget.studentName, lng)} — {graceTarget.rollNumber}
              </p>
              <div className="mb-2">
                <FormField label={t('exam.graceMarks')} htmlFor="grace-marks">
                  <AppInput
                    id="grace-marks"
                    type="number"
                    min={0}
                    value={graceForm.graceMarks}
                    onChange={(e) => setGraceForm((f) => ({ ...f, graceMarks: e.target.value }))}
                  />
                </FormField>
              </div>
              <div className="mb-2">
                <FormField
                  label={t('exam.audit.reason')}
                  htmlFor="grace-reason"
                  required
                  error={graceErrors.reason}
                >
                  <AppInput
                    id="grace-reason"
                    type="text"
                    value={graceForm.reason}
                    onChange={(e) => {
                      const reason = e.target.value
                      setGraceForm((f) => ({ ...f, reason }))
                      onGraceChange?.('reason', { ...graceForm, reason })
                    }}
                    onBlur={() => onGraceBlur?.('reason')}
                  />
                </FormField>
              </div>
            </div>
            <div className="modal-app-footer d-flex flex-wrap gap-2 justify-content-end">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setGraceTarget(null)}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn btn-primary" disabled={savingGrace}>
                {t('common.save')}
              </button>
            </div>
          </form>
        </AppModalShell>
      )}

      {examModal && (
        <AppModalShell
          onClose={() => setExamModal(false)}
          title={editingExam ? t('exam.editExam') : t('exam.newExam')}
        >
          <form
            className="modal-app-form"
            onSubmit={(e) => {
              e.preventDefault()
              onSaveExam()
            }}
            noValidate
          >
            <div className="modal-app-body">
              <FormRow className="app-form-row--2">
                <FormField
                  k="examNameUr"
                  htmlFor="ex-u"
                  langField="ur"
                  col={6}
                  required
                  error={examErrors['name.ur']}
                >
                  <AppInput
                    id="ex-u"
                    value={examForm.name.ur}
                    onChange={(e) => {
                      const next = { ...examForm, name: { ...examForm.name, ur: e.target.value } }
                      setExamForm(next)
                      onExamChange?.('name.ur', next)
                    }}
                    onBlur={() => onExamBlur?.('name.ur')}
                    dir="rtl"
                  />
                </FormField>
                <FormField k="examNameEn" htmlFor="ex-e" langField="en" col={6}>
                  <AppInput
                    id="ex-e"
                    latin
                    value={examForm.name.en}
                    onChange={(e) => {
                      const next = { ...examForm, name: { ...examForm.name, en: e.target.value } }
                      setExamForm(next)
                      onExamChange?.('name.ur', next)
                    }}
                    onBlur={() => onExamBlur?.('name.ur')}
                  />
                </FormField>
              </FormRow>
              {examForm.examTypeIndex === '' ? (
                <>
                  <FormRow className="app-form-row--2">
                    <FormField label={t('exam.col.type')} htmlFor="ex-type" col={6}>
                      <AppSelect
                        id="ex-type"
                        value={examForm.examTypeIndex}
                        onChange={(e) => setExamForm((f) => ({ ...f, examTypeIndex: e.target.value }))}
                      >
                        <option value="">{t('exam.customType')}</option>
                        {examNames.map((en, i) => (
                          <option key={i} value={i}>{loc(en, lng)}</option>
                        ))}
                      </AppSelect>
                    </FormField>
                    <FormField k="examTypeCustomUr" htmlFor="ex-tu" langField="ur" col={6}>
                      <AppInput
                        id="ex-tu"
                        value={examForm.customExamType.ur}
                        onChange={(e) => setExamForm((f) => ({
                          ...f,
                          customExamType: { ...f.customExamType, ur: e.target.value },
                        }))}
                        dir="rtl"
                        placeholder={t('exam.customTypePlaceholder')}
                      />
                    </FormField>
                  </FormRow>
                  <FormRow className="app-form-row--2">
                    <FormField k="examTypeCustomEn" htmlFor="ex-te" langField="en" col={6}>
                      <AppInput
                        id="ex-te"
                        latin
                        value={examForm.customExamType.en}
                        onChange={(e) => setExamForm((f) => ({
                          ...f,
                          customExamType: { ...f.customExamType, en: e.target.value },
                        }))}
                        placeholder={t('exam.customTypePlaceholder')}
                      />
                    </FormField>
                  </FormRow>
                </>
              ) : (
                <FormRow>
                  <FormField label={t('exam.col.type')} htmlFor="ex-type" col={12}>
                    <AppSelect
                      id="ex-type"
                      value={examForm.examTypeIndex}
                      onChange={(e) => setExamForm((f) => ({ ...f, examTypeIndex: e.target.value }))}
                    >
                      <option value="">{t('exam.customType')}</option>
                      {examNames.map((en, i) => (
                        <option key={i} value={i}>{loc(en, lng)}</option>
                      ))}
                    </AppSelect>
                  </FormField>
                </FormRow>
              )}
              <FormRow className="app-form-row--2">
                <FormField label={t('exam.col.start')} htmlFor="ex-start" col={6}>
                  <AppDateInput
                    id="ex-start"
                    value={examForm.startDate}
                    onChange={(v) => {
                      const next = { ...examForm, startDate: v }
                      setExamForm(next)
                      onExamChange?.('endDate', next)
                    }}
                    onBlur={() => onExamBlur?.('endDate')}
                  />
                </FormField>
                <FormField label={t('exam.col.end')} htmlFor="ex-end" col={6} error={examErrors.endDate}>
                  <AppDateInput
                    id="ex-end"
                    value={examForm.endDate}
                    onChange={(v) => {
                      const next = { ...examForm, endDate: v }
                      setExamForm(next)
                      onExamChange?.('endDate', next)
                    }}
                    onBlur={() => onExamBlur?.('endDate')}
                  />
                </FormField>
              </FormRow>
              <FormRow>
                <FormField label={t('exam.col.resultDate')} htmlFor="ex-result-date" col={12}>
                  <AppDateInput
                    id="ex-result-date"
                    value={examForm.resultPublicationDate}
                    onChange={(v) => setExamForm((f) => ({ ...f, resultPublicationDate: v }))}
                  />
                </FormField>
              </FormRow>
            </div>
            <div className="modal-app-footer d-flex flex-wrap gap-2 justify-content-end">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setExamModal(false)}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn btn-primary" disabled={savingExam}>
                {t('common.save')}
              </button>
            </div>
          </form>
        </AppModalShell>
      )}

      {deleteTarget && (
        <AppModalShell
          onClose={() => { setDeleteTarget(null); setDeleteExamReason('') }}
          title={t('exam.deleteTitle')}
        >
          <form
            className="modal-app-form"
            onSubmit={(e) => {
              e.preventDefault()
              onDeleteExam().then(() => {}).catch(() => {})
            }}
            noValidate
          >
            <div className="modal-app-body">
              <p className="small text-secondary mb-2">
                {t('exam.confirmDelete', { name: loc(deleteTarget.name, lng) })}
              </p>
              <p className="small text-danger mb-2">{t('exam.deleteCascadeNote')}</p>
              <p className="small text-secondary mb-2">{t('exam.deleteAuditNote')}</p>
              <FormField
                label={t('exam.deleteReasonLabel')}
                htmlFor="delete-exam-reason"
                required
                error={deleteExamErrors.reason}
              >
                <AppInput
                  id="delete-exam-reason"
                  type="text"
                  value={deleteExamReason}
                  onChange={(e) => {
                    const reason = e.target.value
                    setDeleteExamReason(reason)
                    onDeleteExamChange?.('reason', { reason })
                  }}
                  onBlur={() => onDeleteExamBlur?.('reason')}
                  placeholder={t('exam.deleteReasonPlaceholder')}
                  minLength={10}
                  autoFocus
                />
              </FormField>
            </div>
            <div className="modal-app-footer d-flex flex-wrap gap-2 justify-content-end">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => { setDeleteTarget(null); setDeleteExamReason('') }}
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="btn btn-danger"
                disabled={deletingExam || deleteExamReason.trim().length < 10}
              >
                {t('common.delete')}
              </button>
            </div>
          </form>
        </AppModalShell>
      )}

      <ConfirmDeleteModal
        open={!!deleteScheduleTarget}
        title={t('common.confirmDeleteTitle')}
        message={t('exam.confirmDeleteSchedule')}
        onClose={() => setDeleteScheduleTarget(null)}
        onConfirm={onDeleteSchedule}
      />

      <ConfirmDeleteModal
        open={!!deleteMappingTarget}
        title={t('common.confirmDeleteTitle')}
        message={t('exam.confirmDeleteMapping')}
        onClose={() => setDeleteMappingTarget(null)}
        onConfirm={onDeleteSubjectMapping}
      />

      <ConfirmActionModal
        open={confirmProcessOpen}
        title={t('exam.processResults')}
        message={t('exam.confirmProcessResults')}
        confirmLabel={t('exam.processResults')}
        onClose={() => setConfirmProcessOpen(false)}
        onConfirm={onProcessResults}
      />

      <ConfirmActionModal
        open={!!confirmPublish}
        title={t('exam.announceTitle')}
        message={
          confirmPublish?.level === 'exam'
            ? t('exam.confirmPublishExam')
            : t('exam.confirmPublishLevel', { level: t(`exam.publish.${confirmPublish?.level}`) })
        }
        confirmLabel={t('common.confirm')}
        confirmVariant="success"
        onClose={() => setConfirmPublish(null)}
        onConfirm={onPublish}
      />

      {unlockModal && (
        <AppModalShell
          onClose={onCloseUnlockModal}
          title={
            unlockModal.scope === 'exam'
              ? t('exam.unlockExam')
              : unlockModal.scope === 'subject'
                ? t('exam.unlockSubject')
                : t('exam.unlockStudent')
          }
        >
          <form
            className="modal-app-form"
            onSubmit={(e) => {
              e.preventDefault()
              onUnlockSubmit().then(() => onCloseUnlockModal()).catch(() => {})
            }}
            noValidate
          >
            <div className="modal-app-body">
              <FormField
                label={t('exam.unlockReasonPrompt')}
                htmlFor="unlock-reason"
                required
                error={unlockErrors.reason}
              >
                <AppInput
                  id="unlock-reason"
                  type="text"
                  value={unlockReason}
                  onChange={(e) => {
                    const reason = e.target.value
                    setUnlockReason(reason)
                    onUnlockChange?.('reason', { reason })
                  }}
                  onBlur={() => onUnlockBlur?.('reason')}
                  autoFocus
                />
              </FormField>
            </div>
            <div className="modal-app-footer d-flex flex-wrap gap-2 justify-content-end">
              <button type="button" className="btn btn-outline-secondary" onClick={onCloseUnlockModal}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn btn-warning" disabled={savingUnlock || !unlockReason.trim()}>
                {t('common.confirm')}
              </button>
            </div>
          </form>
        </AppModalShell>
      )}
    </>
  )
}
