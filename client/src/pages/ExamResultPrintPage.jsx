import { useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  useGetExamsQuery,
  useGetExamResultMatrixQuery,
  useGetExamSnapshotQuery,
  useGetExamAttendanceQuery,
  useGetMeQuery,
  useGetSettingsQuery,
  useGetDarajatQuery,
  useGetSubjectsQuery,
} from '../services/api'
import { loc } from '../shared/localized'
import { absoluteAssetUrl, isStoredAssetUrl } from '../shared/assetUrl'
import { getInstitutionName } from '../shared/institutionBrand'
import { statusLabel, EXAM_WORKFLOW_STEPS } from '../shared/examEnums'
import ExamResultCard from '../components/exam/ExamResultCard'
import './examDashboard.css'

const NAMAZ_COLS = [
  { key: 'fajr', ur: 'فجر', en: 'Fajr' },
  { key: 'zuhr', ur: 'ظہر', en: 'Zuhr' },
  { key: 'asr', ur: 'عصر', en: 'Asr' },
  { key: 'maghrib', ur: 'مغرب', en: 'Maghrib' },
  { key: 'isha', ur: 'عشاء', en: 'Isha' },
]

function shortenRoll(roll) {
  const s = String(roll || '')
  if (s.length <= 16) return s || '—'
  return `${s.slice(0, 6)}…${s.slice(-6)}`
}

export default function ExamResultPrintPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const en = lng?.startsWith('en')

  const sessionId = params.get('sessionId') || ''
  const examId = params.get('examId') || ''
  const darjahId = params.get('darjahId') || ''
  const sectionId = params.get('sectionId') || ''
  const studentSnapshotId = params.get('studentSnapshotId') || ''
  const mode = params.get('mode') || 'cards'
  const fromStep = params.get('fromStep') || ''
  const fromView = params.get('fromView') || ''

  const { data: me } = useGetMeQuery()
  const { data: settings } = useGetSettingsQuery()
  const { data: exams = [] } = useGetExamsQuery(sessionId ? { sessionId } : null, { skip: !sessionId })
  const exam = exams.find((e) => String(e._id) === String(examId))
  const { data: darajat = [] } = useGetDarajatQuery(
    sessionId ? { sessionId } : undefined,
    { skip: !sessionId }
  )
  const { data: subjects = [] } = useGetSubjectsQuery()

  const needsMatrix = mode === 'cards'
  const needsRoster = mode === 'roll' || mode === 'namaz'

  const { data: matrix, isLoading: matrixLoading } = useGetExamResultMatrixQuery(
    examId && darjahId && sessionId && needsMatrix
      ? { examId, sessionId, darjahId, ...(sectionId ? { sectionId } : {}) }
      : null,
    { skip: !needsMatrix || !examId || !darjahId || !sessionId }
  )

  const { data: snapData, isLoading: snapLoading } = useGetExamSnapshotQuery(
    examId && darjahId && sessionId && needsRoster
      ? { examId, sessionId, darjahId, ...(sectionId ? { sectionId } : {}) }
      : null,
    { skip: !needsRoster || !examId || !darjahId || !sessionId }
  )

  const { data: attData } = useGetExamAttendanceQuery(
    examId && darjahId && sessionId && needsRoster
      ? { examId, sessionId, darjahId, ...(sectionId ? { sectionId } : {}) }
      : null,
    { skip: !needsRoster || !examId || !darjahId || !sessionId }
  )

  const rows = useMemo(() => {
    let list = matrix?.rows || []
    if (studentSnapshotId) {
      list = list.filter((r) => String(r.studentSnapshotId) === String(studentSnapshotId))
    }
    return list
  }, [matrix, studentSnapshotId])

  const roster = useMemo(() => {
    let list = Array.isArray(snapData) ? snapData : (snapData?.snapshots || attData?.snapshots || [])
    if (!Array.isArray(list)) list = []
    if (studentSnapshotId) {
      list = list.filter((r) => String(r._id) === String(studentSnapshotId))
    }
    return [...list].sort((a, b) =>
      String(a.rollNumber || '').localeCompare(String(b.rollNumber || ''), undefined, { numeric: true })
    )
  }, [snapData, attData, studentSnapshotId])

  const attendanceBySnap = useMemo(() => {
    const map = {}
    for (const a of attData?.attendance || []) {
      const sid = a.studentSnapshotId?._id || a.studentSnapshotId
      if (sid) {
        map[String(sid)] = {
          status: a.status,
          salah: a.salahAttendance || {},
        }
      }
    }
    return map
  }, [attData])

  function salahMark(status) {
    if (status === 'present') return en ? 'P' : 'ح'
    if (status === 'absent') return en ? 'A' : 'غ'
    if (status === 'excused') return en ? 'E' : 'م'
    return ''
  }

  const institution = getInstitutionName(me, lng)
  const collegeAffiliation = settings?.collegeAffiliation ? loc(settings.collegeAffiliation, lng) : ''
  const logoAbs = absoluteAssetUrl(settings?.logoUrl)
  const darjah = darajat.find((d) => String(d._id) === String(darjahId))
  const section = subjects.find((s) => String(s._id) === String(sectionId))
  const classLabel = [loc(section?.name, lng), loc(darjah?.name, lng)].filter(Boolean).join(' — ')

  const isLoading = needsMatrix ? matrixLoading : snapLoading
  const hasContent = needsMatrix ? rows.length > 0 : roster.length > 0

  function goBack() {
    const q = new URLSearchParams()
    const step = fromStep && EXAM_WORKFLOW_STEPS.includes(fromStep) ? fromStep : 'announce'
    q.set('step', step)
    if (examId) q.set('examId', examId)
    if (darjahId) q.set('darjahId', darjahId)
    if (sectionId) q.set('sectionId', sectionId)
    if (fromView === 'teacher') q.set('view', 'teacher')
    navigate(`/exams?${q}`)
  }

  useEffect(() => {
    const titles = {
      cards: en ? 'Exam result cards' : 'امتحانی نتیجہ کارڈ',
      roll: en ? 'Roll number sheet' : 'رول نمبر شیٹ',
      namaz: en ? 'Namaz attendance' : 'نماز کی حاضری',
    }
    const pageTitle = titles[mode] || titles.cards
    document.title = institution ? `${institution} · ${pageTitle}` : pageTitle
    if (!isLoading && hasContent) {
      const tmr = setTimeout(() => window.print(), 400)
      return () => {
        clearTimeout(tmr)
        document.title = institution || 'E-Jamia Pro'
      }
    }
    return () => { document.title = institution || 'E-Jamia Pro' }
  }, [isLoading, hasContent, en, institution, mode])

  const toolbar = (
    <div className="exam-print-toolbar no-print">
      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={goBack}>
        {t('exam.backToExams')}
      </button>
      <button type="button" className="btn btn-sm btn-primary" onClick={() => window.print()}>
        {t('common.print')}
      </button>
    </div>
  )

  if (!sessionId || !examId || !darjahId) {
    return (
      <div className="exam-print-page">
        <div className="exam-sheet exam-sheet--message">
          {toolbar}
          <p className="text-danger mb-0">{t('exam.printMissingParams')}</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="exam-print-page">
        <div className="exam-sheet exam-sheet--message">
          {toolbar}
          <p className="mb-0">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (!hasContent) {
    return (
      <div className="exam-print-page">
        <div className="exam-sheet exam-sheet--message">
          {toolbar}
          <p className="text-secondary mb-0">
            {needsMatrix ? t('exam.noResultsToPrint') : t('exam.noRosterToPrint')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="exam-print-page">
      {mode === 'cards' && (
        <>
          <div className="exam-print-bar no-print">{toolbar}</div>
          <div className="exam-print-grid">
            {rows.map((row) => (
              <ExamResultCard
                key={row.resultId || row.studentSnapshotId}
                row={row}
                exam={exam}
                institution={institution}
                collegeAffiliation={collegeAffiliation}
                logoUrl={logoAbs || undefined}
                lng={lng}
                showWatermark
              />
            ))}
          </div>
        </>
      )}

      {(mode === 'roll' || mode === 'namaz') && (
        <div className="exam-sheet" dir={en ? 'ltr' : 'rtl'}>
          <div className="exam-sheet__top no-print">{toolbar}</div>
          <header className="exam-sheet__head">
            <h1 className="exam-sheet__title">
              {mode === 'namaz' ? t('exam.printNamazSheet') : t('exam.printRollSheet')}
            </h1>
            <p className="exam-sheet__meta">
              <strong>{institution}</strong>
              {exam ? <> · {loc(exam.name, lng)}</> : null}
              {classLabel ? <> · {classLabel}</> : null}
            </p>
            {mode === 'namaz' && (
              <p className="exam-sheet__legend">
                {t('exam.printNamazLegend')}
              </p>
            )}
          </header>
          <table className="exam-sheet__table">
            <thead>
              <tr>
                <th className="exam-sheet__num">#</th>
                <th className="exam-sheet__photo-col">{en ? 'Photo' : 'تصویر'}</th>
                <th>{t('exam.col.roll')}</th>
                <th>{t('exam.col.student')}</th>
                {mode === 'roll' && <th>{t('exam.col.attendance')}</th>}
                {mode === 'namaz' &&
                  NAMAZ_COLS.map((c) => (
                    <th key={c.key} className="exam-sheet__prayer">{en ? c.en : c.ur}</th>
                  ))}
                {mode === 'namaz' && <th>{t('exam.col.examDay')}</th>}
              </tr>
            </thead>
            <tbody>
              {roster.map((r, idx) => {
                const att = attendanceBySnap[String(r._id)]
                const photoAbs = isStoredAssetUrl(r.photoUrl || r.studentId?.photoUrl)
                  ? absoluteAssetUrl(r.photoUrl || r.studentId?.photoUrl)
                  : ''
                return (
                  <tr key={r._id}>
                    <td className="exam-sheet__num" dir="ltr">{idx + 1}</td>
                    <td className="exam-sheet__photo-cell">
                      {photoAbs ? (
                        <img src={photoAbs} alt="" className="exam-sheet__photo" />
                      ) : (
                        <span className="exam-sheet__photo exam-sheet__photo--empty" aria-hidden />
                      )}
                    </td>
                    <td className="exam-sheet__roll" dir="ltr" title={r.rollNumber || ''}>
                      {shortenRoll(r.rollNumber)}
                    </td>
                    <td>{loc(r.studentName, lng) || '—'}</td>
                    {mode === 'roll' && (
                      <td>{att?.status ? statusLabel(att.status, lng) : '—'}</td>
                    )}
                    {mode === 'namaz' &&
                      NAMAZ_COLS.map((c) => {
                        const mark = salahMark(att?.salah?.[c.key])
                        return (
                          <td key={c.key} className={`exam-sheet__hazri ${mark ? 'exam-sheet__hazri--filled' : ''}`}>
                            {mark || <span className="exam-sheet__box" aria-hidden />}
                          </td>
                        )
                      })}
                    {mode === 'namaz' && (
                      <td>{att?.status ? statusLabel(att.status, lng) : ''}</td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
          {mode === 'namaz' && (
            <p className="exam-sheet__note">{t('exam.printNamazHint')}</p>
          )}
        </div>
      )}
    </div>
  )
}
