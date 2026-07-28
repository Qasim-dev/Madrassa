import { useTranslation } from 'react-i18next'
import { loc } from '../../shared/localized'
import ExamStepHeader from '../../components/exam/ExamStepHeader'
import { EXAM_SUBJECT_TYPES, examSubjectTypeLabel } from '../../shared/examEnums'
import { AppInput, AppSelect } from '../../components/ui'

export default function ExamSubjectsStep({
  lng,
  structureFrozen,
  selectedDarjahId,
  subjectForm,
  setSubjectForm,
  subjectMappings,
  subjects,
  teachers,
  books,
  onInitSubjectForm,
  onAddSubjectRow,
  onSaveSubjects,
  onDeleteMapping,
}) {
  const { t } = useTranslation()

  function booksForRow(row) {
    const subjectId = String(row.subjectId?._id || row.subjectId || '')
    const darjahId = String(selectedDarjahId || '')
    return books.filter((b) => {
      if (darjahId && String(b.darjahId?._id || b.darjahId) !== darjahId) return false
      if (subjectId && String(b.subjectId?._id || b.subjectId) !== subjectId) return false
      return true
    })
  }

  function bookOptionsForRow(row) {
    const list = booksForRow(row)
    const currentId = row.bookId?._id || row.bookId
    if (currentId && !list.some((b) => String(b._id) === String(currentId))) {
      const embedded = typeof row.bookId === 'object' && row.bookId ? row.bookId : null
      if (embedded) return [embedded, ...list]
    }
    return list
  }

  const rows = subjectForm.length ? subjectForm : subjectMappings

  return (
    <div className="exam-step-box">
      {structureFrozen && (
        <div className="alert alert-info mb-3">{t('exam.structureFrozen')}</div>
      )}
      <ExamStepHeader
        title={t('exam.step.subjects')}
        actions={
          <>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onInitSubjectForm} disabled={structureFrozen}>
              {t('exam.loadFromDarjah')}
            </button>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onAddSubjectRow} disabled={structureFrozen}>
              {t('exam.addSubjectRow')}
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={onSaveSubjects} disabled={structureFrozen}>
              {t('common.save')}
            </button>
          </>
        }
      />
      {subjectForm.length === 0 && subjectMappings.length > 0 && (
        <p className="text-sm text-slate-500 mb-2">{t('exam.existingMappings', { count: subjectMappings.length })}</p>
      )}
      <div className="data-table-shell content-panel overflow-hidden">
        <div className="table-responsive">
          <table className="table data-table exam-subjects-table mb-0 align-middle">
            <colgroup>
              <col className="exam-subjects-table__col exam-subjects-table__col--subject" />
              <col className="exam-subjects-table__col exam-subjects-table__col--book" />
              <col className="exam-subjects-table__col exam-subjects-table__col--teacher" />
              <col className="exam-subjects-table__col exam-subjects-table__col--num" />
              <col className="exam-subjects-table__col exam-subjects-table__col--num" />
              <col className="exam-subjects-table__col exam-subjects-table__col--num" />
              <col className="exam-subjects-table__col exam-subjects-table__col--type" />
              <col className="exam-subjects-table__col exam-subjects-table__col--actions" />
            </colgroup>
            <thead>
              <tr>
                <th className="data-table__th">{t('exam.col.subject')}</th>
                <th className="data-table__th">{t('exam.col.book')}</th>
                <th className="data-table__th">{t('exam.col.teacher')}</th>
                <th className="data-table__th exam-subjects-table__th--num">{t('exam.col.maxMarks')}</th>
                <th className="data-table__th exam-subjects-table__th--num">{t('exam.col.passMarks')}</th>
                <th className="data-table__th exam-subjects-table__th--num">{t('exam.col.weightage')}</th>
                <th className="data-table__th">{t('exam.col.examType')}</th>
                <th className="data-table__th">{t('exam.col.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row._id || idx} className="data-table__row">
                  <td className="data-table__td">
                    <AppSelect
                      className="w-100"
                      value={row.subjectId?._id || row.subjectId || ''}
                      disabled={row.isLocked}
                      onChange={(e) => {
                        const v = [...rows]
                        const subjectId = e.target.value
                        const matches = books.filter(
                          (b) =>
                            String(b.subjectId?._id || b.subjectId) === String(subjectId) &&
                            String(b.darjahId?._id || b.darjahId) === String(selectedDarjahId)
                        )
                        v[idx] = {
                          ...v[idx],
                          subjectId,
                          bookId: matches.length === 1 ? matches[0]._id : '',
                        }
                        setSubjectForm(v)
                      }}
                    >
                      <option value="">—</option>
                      {subjects.map((s) => (
                        <option key={s._id} value={s._id}>{loc(s.name, lng)}</option>
                      ))}
                    </AppSelect>
                  </td>
                  <td className="data-table__td">
                    <AppSelect
                      className="w-100"
                      value={row.bookId?._id || row.bookId || ''}
                      disabled={row.isLocked}
                      onChange={(e) => {
                        const v = [...rows]
                        v[idx] = { ...v[idx], bookId: e.target.value }
                        setSubjectForm(v)
                      }}
                    >
                      <option value="">—</option>
                      {bookOptionsForRow(row).map((b) => (
                        <option key={b._id} value={b._id}>{loc(b.title, lng)}</option>
                      ))}
                    </AppSelect>
                    {!bookOptionsForRow(row).length && row.subjectId && (
                      <p className="small text-warning mb-0 mt-1">{t('exam.noBooksHint')}</p>
                    )}
                  </td>
                  <td className="data-table__td">
                    <AppSelect
                      className="w-100"
                      value={row.teacherId?._id || row.teacherId || ''}
                      disabled={row.isLocked}
                      onChange={(e) => {
                        const v = [...rows]
                        v[idx] = { ...v[idx], teacherId: e.target.value }
                        setSubjectForm(v)
                      }}
                    >
                      <option value="">—</option>
                      {teachers.map((tc) => (
                        <option key={tc._id} value={tc._id}>{loc(tc.name, lng)}</option>
                      ))}
                    </AppSelect>
                  </td>
                  <td className="data-table__td data-table__td--num">
                    <AppInput
                      type="number"
                      className="exam-subjects-table__num"
                      inputMode="numeric"
                      min={0}
                      max={999}
                      value={row.maxMarks}
                      disabled={row.isLocked}
                      onChange={(e) => {
                        const v = [...rows]
                        v[idx] = { ...v[idx], maxMarks: Math.min(999, Number(e.target.value) || 0) }
                        setSubjectForm(v)
                      }}
                    />
                  </td>
                  <td className="data-table__td data-table__td--num">
                    <AppInput
                      type="number"
                      className="exam-subjects-table__num"
                      inputMode="numeric"
                      min={0}
                      max={999}
                      value={row.passingMarks}
                      disabled={row.isLocked}
                      onChange={(e) => {
                        const v = [...rows]
                        v[idx] = { ...v[idx], passingMarks: Math.min(999, Number(e.target.value) || 0) }
                        setSubjectForm(v)
                      }}
                    />
                  </td>
                  <td className="data-table__td data-table__td--num">
                    <AppInput
                      type="number"
                      className="exam-subjects-table__num"
                      inputMode="numeric"
                      min={0}
                      max={999}
                      value={row.weightage ?? 100}
                      disabled={row.isLocked}
                      onChange={(e) => {
                        const v = [...rows]
                        v[idx] = { ...v[idx], weightage: Math.min(999, Number(e.target.value) || 0) }
                        setSubjectForm(v)
                      }}
                    />
                  </td>
                  <td className="data-table__td">
                    <AppSelect
                      className="w-100"
                      value={row.examType || 'written'}
                      disabled={row.isLocked}
                      onChange={(e) => {
                        const v = [...rows]
                        v[idx] = { ...v[idx], examType: e.target.value }
                        setSubjectForm(v)
                      }}
                    >
                      {EXAM_SUBJECT_TYPES.map((et) => (
                        <option key={et} value={et}>{examSubjectTypeLabel(et, lng)}</option>
                      ))}
                    </AppSelect>
                  </td>
                  <td className="data-table__td">
                    <div className="data-table__actions">
                      {row._id && !row.isLocked ? (
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          disabled={structureFrozen}
                          onClick={() => onDeleteMapping(row._id)}
                        >
                          {t('common.delete')}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
