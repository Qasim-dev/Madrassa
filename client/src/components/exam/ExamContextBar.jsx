import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { loc } from '../../shared/localized'
import { formatDisplayDate } from '../../shared/formatDisplayDate'
import { useCalendarMode } from '../../app/calendarMode'
import { statusLabel } from '../../shared/examEnums'
import { AppSelect } from '../ui'

/**
 * Sticky context bar.
 * Dropdown order (app-wide): امتحان → شعبہ → کلاس
 * شعبہ filters which classes appear; کلاس is required for most steps.
 */
export default function ExamContextBar({
  lng,
  exams,
  pipelines,
  subjects = [],
  darajat = [],
  selectedExamId,
  selectedDarjahId,
  selectedSectionId,
  onExamChange,
  onClassChange,
  onSectionChange,
  selectedExam,
  showClass = true,
  showSection = false,
}) {
  const { t } = useTranslation()
  const { mode } = useCalendarMode()

  /** Subjects linked to any class in the current exam pipeline */
  const subjectOptions = useMemo(() => {
    if (!subjects.length || !pipelines.length) return subjects
    const darjahIds = new Set(
      pipelines.map((p) => String(p.darjahId?._id || p.darjahId || '')).filter(Boolean)
    )
    const allowed = new Set()
    for (const d of darajat) {
      if (!darjahIds.has(String(d._id))) continue
      for (const s of d.subjectIds || []) allowed.add(String(s._id || s))
    }
    if (!allowed.size) return subjects
    return subjects.filter((s) => allowed.has(String(s._id)))
  }, [subjects, pipelines, darajat])

  /** Classes filtered by selected شعبہ (subject) when set */
  const classOptions = useMemo(() => {
    if (!selectedSectionId) return pipelines
    return pipelines.filter((p) => {
      const djId = String(p.darjahId?._id || p.darjahId || '')
      const dj = darajat.find((d) => String(d._id) === djId)
      if (!dj) return false
      return (dj.subjectIds || []).some((x) => String(x._id || x) === String(selectedSectionId))
    })
  }, [pipelines, darajat, selectedSectionId])

  const filterCount =
    1 + (showSection && selectedExamId ? 1 : 0) + (showClass && selectedExamId ? 1 : 0)

  function handleSectionChange(v) {
    onSectionChange(v)
    // If current class is not valid for the new شعبہ, clear it
    if (v && selectedDarjahId) {
      const dj = darajat.find((d) => String(d._id) === String(selectedDarjahId))
      const ok = (dj?.subjectIds || []).some((x) => String(x._id || x) === String(v))
      if (!ok) onClassChange('')
    }
  }

  function handleClassChange(v) {
    onClassChange(v)
    // Keep شعبہ if it still belongs to the new class; otherwise clear
    if (v && selectedSectionId) {
      const dj = darajat.find((d) => String(d._id) === String(v))
      const ok = (dj?.subjectIds || []).some((x) => String(x._id || x) === String(selectedSectionId))
      if (!ok) onSectionChange('')
    }
  }

  return (
    <div className="exam-ctx">
      <div className="exam-ctx__top">
        <div className="exam-ctx__intro">
          <span className="exam-ctx__badge">{t('exam.contextTitle')}</span>
          <p className="exam-ctx__desc">{t('exam.contextHint')}</p>
        </div>
        {selectedExam && (
          <div className="exam-ctx__summary">
            <span className={`exam-ctx__pill exam-ctx__pill--${selectedExam.status || 'draft'}`}>
              {statusLabel(selectedExam.status, lng)}
            </span>
            {selectedExam.startDate && (
              <span className="exam-ctx__meta">
                {formatDisplayDate(selectedExam.startDate, lng, mode)}
                {' — '}
                {selectedExam.endDate ? formatDisplayDate(selectedExam.endDate, lng, mode) : '…'}
              </span>
            )}
          </div>
        )}
      </div>

      <div className={`exam-ctx__grid exam-ctx__grid--${filterCount}`}>
        <div className="exam-ctx__field">
          <label className="exam-ctx__label" htmlFor="exam-ctx-exam">
            {t('exam.filterExam')}
          </label>
          <AppSelect
            id="exam-ctx-exam"
            className="exam-ctx__select"
            value={selectedExamId}
            onChange={(e) => onExamChange(e.target.value)}
          >
            <option value="">{t('exam.chooseExam')}</option>
            {exams.map((ex) => (
              <option key={ex._id} value={ex._id}>
                {loc(ex.name, lng)} — {statusLabel(ex.status, lng)}
              </option>
            ))}
          </AppSelect>
        </div>

        {/* شعبہ first, then کلاس */}
        {showSection && selectedExamId && (
          <div className="exam-ctx__field">
            <label className="exam-ctx__label" htmlFor="exam-ctx-section">
              {t('exam.filterSection')}
            </label>
            <AppSelect
              id="exam-ctx-section"
              className="exam-ctx__select"
              value={selectedSectionId}
              onChange={(e) => handleSectionChange(e.target.value)}
            >
              <option value="">{t('exam.allSections')}</option>
              {subjectOptions.map((s) => (
                <option key={s._id} value={s._id}>
                  {loc(s.name, lng)}
                </option>
              ))}
            </AppSelect>
          </div>
        )}

        {showClass && selectedExamId && (
          <div className="exam-ctx__field">
            <label className="exam-ctx__label" htmlFor="exam-ctx-class">
              {t('exam.filterClass')}
            </label>
            <AppSelect
              id="exam-ctx-class"
              className="exam-ctx__select"
              value={selectedDarjahId}
              onChange={(e) => handleClassChange(e.target.value)}
            >
              <option value="">{t('exam.chooseClass')}</option>
              {classOptions.map((p) => (
                <option key={p._id} value={p.darjahId?._id || p.darjahId}>
                  {loc(p.darjahId?.name, lng)}
                  {p.darjahId?.code ? ` (${p.darjahId.code})` : ''}
                </option>
              ))}
            </AppSelect>
          </div>
        )}
      </div>
    </div>
  )
}
