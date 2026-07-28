import { useTranslation } from 'react-i18next'
import { loc } from '../../shared/localized'
import ExamStepHeader from '../../components/exam/ExamStepHeader'
import { EXAM_ATTENDANCE_STATUS, statusLabel } from '../../shared/examEnums'
import { AppSelect } from '../../components/ui'

export default function ExamAttendanceStep({
  lng,
  attendanceData,
  snapshots,
  attendanceDraft,
  setAttendanceDraft,
  onPrintNamazSheet,
  onInitAttendanceDraft,
  onSaveAttendance,
}) {
  const { t } = useTranslation()
  const snapshotList = attendanceData?.snapshots?.length ? attendanceData.snapshots : snapshots

  return (
    <div className="exam-step-box">
      <ExamStepHeader
        title={t('exam.step.attendance')}
        hint={t('exam.attendanceLead')}
        actions={
          <>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={onPrintNamazSheet}
            >
              {t('exam.printNamazSheet')}
            </button>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onInitAttendanceDraft}>
              {t('exam.loadAttendance')}
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={onSaveAttendance}>
              {t('common.save')}
            </button>
          </>
        }
      />
      <div className="table-responsive">
        <table className="table table-sm exam-hazri-table mb-0">
          <thead>
            <tr>
              <th>{t('exam.col.roll')}</th>
              <th>{t('exam.col.student')}</th>
              <th>{t('exam.col.attendance')}</th>
              <th>{t('exam.salah.fajr')}</th>
              <th>{t('exam.salah.zuhr')}</th>
              <th>{t('exam.salah.asr')}</th>
              <th>{t('exam.salah.maghrib')}</th>
              <th>{t('exam.salah.isha')}</th>
            </tr>
          </thead>
          <tbody>
            {snapshotList.map((r) => {
              const row = attendanceDraft[r._id] || { status: 'present', salahAttendance: {} }
              const salah = row.salahAttendance || {}
              return (
                <tr key={r._id}>
                  <td>
                    <span className="exam-roll-cell" dir="ltr" title={r.rollNumber || ''}>
                      {r.rollNumber || '—'}
                    </span>
                  </td>
                  <td>{loc(r.studentName, lng)}</td>
                  <td>
                    <AppSelect
                      value={row.status || 'present'}
                      onChange={(e) =>
                        setAttendanceDraft((d) => ({
                          ...d,
                          [r._id]: { ...row, status: e.target.value },
                        }))
                      }
                    >
                      {EXAM_ATTENDANCE_STATUS.map((st) => (
                        <option key={st} value={st}>{statusLabel(st, lng)}</option>
                      ))}
                    </AppSelect>
                  </td>
                  {['fajr', 'zuhr', 'asr', 'maghrib', 'isha'].map((prayer) => (
                    <td key={prayer}>
                      <AppSelect
                        value={salah[prayer] || ''}
                        onChange={(e) =>
                          setAttendanceDraft((d) => ({
                            ...d,
                            [r._id]: {
                              ...row,
                              salahAttendance: { ...salah, [prayer]: e.target.value },
                            },
                          }))
                        }
                      >
                        <option value="">{t('exam.salah.blank')}</option>
                        <option value="present">{t('exam.salah.present')}</option>
                        <option value="absent">{t('exam.salah.absent')}</option>
                        <option value="excused">{t('exam.salah.excused')}</option>
                      </AppSelect>
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
