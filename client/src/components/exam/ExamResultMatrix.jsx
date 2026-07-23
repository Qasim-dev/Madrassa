import { useTranslation } from 'react-i18next'
import { loc } from '../../shared/localized'
import { divisionLabel } from '../../shared/examEnums'

function ScoreCell({ obtained, max }) {
  if (obtained == null) return '—'
  return (
    <span dir="ltr" className="exam-score">
      {obtained}/{max}
    </span>
  )
}

export default function ExamResultMatrix({ data, lng }) {
  const { t } = useTranslation()
  const columns = data?.columns || []
  const rows = data?.rows || []

  if (!rows.length) {
    return <p className="text-secondary small mb-0">{t('common.noRecords')}</p>
  }

  return (
    <div className="exam-matrix-wrap">
      <table className="table table-sm table-bordered exam-matrix mb-0">
        <thead>
          <tr>
            <th className="exam-matrix__sticky">{t('exam.col.roll')}</th>
            <th className="exam-matrix__sticky">{t('exam.col.student')}</th>
            {columns.map((m) => (
              <th key={m._id} className="exam-matrix__sub-col" title={loc(m.bookId?.title, lng)}>
                {loc(m.subjectId?.name, lng)}
              </th>
            ))}
            <th>{t('exam.col.aggregate')}</th>
            <th>{t('exam.col.percentage')}</th>
            <th>{t('exam.col.division')}</th>
            <th>{t('exam.col.sectionRank')}</th>
            <th>{t('exam.col.classRank')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.resultId}>
              <td className="exam-matrix__sticky">{r.rollNumber || '—'}</td>
              <td className="exam-matrix__sticky">{loc(r.studentName, lng)}</td>
              {r.subjects.map((s) => (
                <td
                  key={s.subjectMappingId}
                  className={`exam-matrix__sub-col ${s.isPassed ? 'exam-matrix__pass' : 'exam-matrix__fail'}`}
                >
                  <ScoreCell obtained={s.obtained} max={s.maxMarks} />
                </td>
              ))}
              <td>
                <ScoreCell obtained={r.aggregateTotal} max={r.maxAggregate} />
              </td>
              <td><span dir="ltr">{r.percentage}%</span></td>
              <td>{divisionLabel(r.division, lng)}</td>
              <td>{r.sectionRank ?? '—'}</td>
              <td>{r.classRank ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
