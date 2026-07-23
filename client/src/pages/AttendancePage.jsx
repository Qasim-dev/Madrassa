import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import {
  useGetTeachersQuery,
  useGetStudentsQuery,
  useGetStudentAttendanceQuery,
  useGetTeacherAttendanceQuery,
  useSaveStudentAttendanceMutation,
  useSaveTeacherAttendanceMutation,
  useGetAttendanceRosterQuery,
  useGetAttendanceContextQuery,
  useGetStudentAttendanceRecordsQuery,
  useGetAttendanceDaySummaryQuery,
  useGetTeacherAttendanceDaySummaryQuery,
  useGetTeacherAttendanceRecordsQuery,
} from '../services/api'
import { loc, uiLang } from '../shared/localized'
import { formatDisplayDate } from '../shared/formatDisplayDate'
import { useCalendarMode } from '../app/calendarMode'
import AppDateInput from '../components/AppDateInput'
import AppTabs from '../components/AppTabs'
import PageHeading from '../components/PageHeading'
import DataTable from '../components/DataTable'
import { AppInput, AppSelect, AppRadio, FormField } from '../components/ui'

const DAILY_PERIOD = 'daily'

const STATUS_LABEL_KEYS = {
  present: 'attendance.statusPresent',
  absent: 'attendance.statusAbsent',
  sick: 'attendance.statusSick',
  late: 'attendance.statusLate',
}

const STUDENT_STATUSES = ['present', 'absent', 'sick', 'late']
const TEACHER_STATUSES = ['present', 'absent', 'sick', 'late']

function monthBounds(ym) {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) {
    const d = new Date()
    ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  const [y, m] = ym.split('-').map(Number)
  const from = `${ym}-01`
  const last = new Date(y, m, 0).getDate()
  const to = `${ym}-${String(last).padStart(2, '0')}`
  return { from, to, ym }
}

function statusLabel(t, status) {
  return STATUS_LABEL_KEYS[status] ? t(STATUS_LABEL_KEYS[status]) : status
}

export default function AttendancePage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const { mode } = useCalendarMode()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab = tabParam === 'teacher' ? 'teacher' : tabParam === 'report' ? 'report' : 'student'

  const activeSessionId = useSelector((s) => s.session.activeSessionId)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [darjahId, setDarjahId] = useState('')
  const [markMode, setMarkMode] = useState('daily')
  const [courseSubjectId, setCourseSubjectId] = useState('')
  const [bookId, setBookId] = useState('')
  const [studentEntries, setStudentEntries] = useState({})
  const [teacherEntries, setTeacherEntries] = useState({})
  const [reportPersonType, setReportPersonType] = useState('student') // student | teacher
  const [reportStudentId, setReportStudentId] = useState('')
  const [reportTeacherId, setReportTeacherId] = useState('')
  const [reportMonth, setReportMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  const isSubjectMode = markMode === 'subject'

  const { data: attendanceContext } = useGetAttendanceContextQuery(
    {
      ...(activeSessionId ? { sessionId: activeSessionId } : {}),
      ...(isSubjectMode && courseSubjectId ? { courseSubjectId } : {}),
      ...(isSubjectMode && darjahId ? { darjahId } : {}),
    },
    { skip: tab !== 'student' }
  )

  const { data: dailyContext } = useGetAttendanceContextQuery(
    activeSessionId ? { sessionId: activeSessionId } : undefined,
    { skip: tab !== 'student' || isSubjectMode }
  )

  const darajat = isSubjectMode ? attendanceContext?.darajat ?? [] : dailyContext?.darajat ?? []
  const subjectOptions = attendanceContext?.subjects ?? dailyContext?.subjects ?? []
  const bookOptions = attendanceContext?.books ?? []

  const rosterParams = useMemo(() => {
    if (tab !== 'student' || !darjahId) return null
    if (isSubjectMode && (!courseSubjectId || !bookId)) return null
    return {
      categoryCode: 'academic',
      darjahId,
      ...(activeSessionId ? { sessionId: activeSessionId } : {}),
      ...(isSubjectMode ? { courseSubjectId, bookId } : {}),
    }
  }, [tab, darjahId, activeSessionId, courseSubjectId, bookId, isSubjectMode])

  const { data: students = [], isLoading: studentsLoading } = useGetAttendanceRosterQuery(rosterParams ?? undefined, {
    skip: !rosterParams,
  })

  const { data: teachers = [] } = useGetTeachersQuery()
  const { data: allStudents = [] } = useGetStudentsQuery(
    activeSessionId ? { sessionId: activeSessionId } : undefined,
    { skip: tab !== 'report' || reportPersonType !== 'student' }
  )

  const studentSheetQuery = useMemo(() => {
    if (tab !== 'student' || !darjahId) return null
    if (isSubjectMode && (!courseSubjectId || !bookId)) return null
    return {
      date,
      categoryCode: 'academic',
      period: DAILY_PERIOD,
      darjahId,
      ...(activeSessionId ? { sessionId: activeSessionId } : {}),
      ...(isSubjectMode ? { courseSubjectId, bookId } : { courseSubjectId: '', bookId: '' }),
    }
  }, [tab, date, darjahId, activeSessionId, courseSubjectId, bookId, isSubjectMode])

  const { data: saList = [] } = useGetStudentAttendanceQuery(studentSheetQuery ?? undefined, {
    skip: !studentSheetQuery,
  })

  const { data: daySummary = [] } = useGetAttendanceDaySummaryQuery(
    {
      darjahId,
      date,
      ...(activeSessionId ? { sessionId: activeSessionId } : {}),
    },
    { skip: tab !== 'student' || !darjahId }
  )

  const { data: teacherDaySummary = [] } = useGetTeacherAttendanceDaySummaryQuery(
    {
      date,
      ...(activeSessionId ? { sessionId: activeSessionId } : {}),
    },
    { skip: tab !== 'teacher' || !date }
  )

  // Students already marked full-day — exclude from subject-wise roster
  const dailyStudentIds = useMemo(() => {
    const set = new Set()
    for (const r of daySummary) {
      if (r.isDaily && r.studentId) set.add(String(r.studentId))
    }
    return set
  }, [daySummary])

  const rosterStudents = useMemo(() => {
    if (!isSubjectMode || dailyStudentIds.size === 0) return students
    return students.filter((s) => !dailyStudentIds.has(String(s._id)))
  }, [students, isSubjectMode, dailyStudentIds])

  const teacherSheetQuery = useMemo(
    () => ({
      date,
      categoryCode: 'staff',
      period: DAILY_PERIOD,
      ...(activeSessionId ? { sessionId: activeSessionId } : {}),
    }),
    [date, activeSessionId]
  )

  const { data: taList = [] } = useGetTeacherAttendanceQuery(teacherSheetQuery, {
    skip: tab !== 'teacher',
  })

  const reportBounds = useMemo(() => monthBounds(reportMonth), [reportMonth])

  const { data: studentMonthlyData, isLoading: studentMonthlyLoading } =
    useGetStudentAttendanceRecordsQuery(
      {
        studentId: reportStudentId,
        from: reportBounds.from,
        to: reportBounds.to,
        ...(activeSessionId ? { sessionId: activeSessionId } : {}),
      },
      { skip: tab !== 'report' || reportPersonType !== 'student' || !reportStudentId }
    )

  const { data: teacherMonthlyData, isLoading: teacherMonthlyLoading } =
    useGetTeacherAttendanceRecordsQuery(
      {
        teacherId: reportTeacherId,
        from: reportBounds.from,
        to: reportBounds.to,
        ...(activeSessionId ? { sessionId: activeSessionId } : {}),
      },
      { skip: tab !== 'report' || reportPersonType !== 'teacher' || !reportTeacherId }
    )

  const monthlyData = reportPersonType === 'teacher' ? teacherMonthlyData : studentMonthlyData
  const monthlyLoading = reportPersonType === 'teacher' ? teacherMonthlyLoading : studentMonthlyLoading
  const monthlyRows = monthlyData?.rows ?? []
  const monthlySummary = monthlyData?.summary
  const reportPersonSelected =
    reportPersonType === 'teacher' ? !!reportTeacherId : !!reportStudentId

  const [saveSA, { isLoading: savingStudents }] = useSaveStudentAttendanceMutation()
  const [saveTA, { isLoading: savingTeachers }] = useSaveTeacherAttendanceMutation()

  function setTab(next) {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next === 'teacher') p.set('tab', 'teacher')
        else if (next === 'report') p.set('tab', 'report')
        else p.delete('tab')
        return p
      },
      { replace: true }
    )
  }

  useEffect(() => {
    setStudentEntries({})
  }, [darjahId, courseSubjectId, bookId, date, tab, markMode])

  useEffect(() => {
    if (markMode === 'daily') {
      setCourseSubjectId('')
      setBookId('')
    }
  }, [markMode])

  useEffect(() => {
    setDarjahId('')
    setBookId('')
  }, [courseSubjectId])

  useEffect(() => {
    setBookId('')
  }, [darjahId])

  useEffect(() => {
    setTeacherEntries({})
  }, [date, tab])

  const existingStudentSheet = useMemo(() => saList[0], [saList])

  const mergedStudentEntries = useMemo(() => {
    const m = { ...studentEntries }
    if (existingStudentSheet?.entries?.length) {
      existingStudentSheet.entries.forEach((e) => {
        const sid = e.studentId?._id || e.studentId
        if (m[sid] === undefined) m[sid] = e.status || 'present'
      })
    }
    return m
  }, [studentEntries, existingStudentSheet])

  const mergedTeacherEntries = useMemo(() => {
    const m = { ...teacherEntries }
    taList.forEach((row) => {
      const tid = row.teacherId?._id || row.teacherId
      if (tid && m[tid] === undefined) {
        m[tid] = row.status || (row.present ? 'present' : 'absent')
      }
    })
    teachers.forEach((te) => {
      if (m[te._id] === undefined) m[te._id] = 'present'
    })
    return m
  }, [teacherEntries, taList, teachers])

  const setStudentStatus = useCallback((studentId, status) => {
    setStudentEntries((prev) => ({ ...prev, [studentId]: status }))
  }, [])

  const setTeacherStatus = useCallback((teacherId, status) => {
    setTeacherEntries((prev) => ({ ...prev, [teacherId]: status }))
  }, [])

  async function saveStudents() {
    const list = rosterStudents.map((s) => ({
      studentId: s._id,
      status: mergedStudentEntries[s._id] || 'present',
    }))
    if (!list.length) return
    await saveSA({
      date,
      categoryCode: 'academic',
      period: DAILY_PERIOD,
      sessionId: activeSessionId || undefined,
      darjahId,
      ...(isSubjectMode && courseSubjectId ? { courseSubjectId } : {}),
      ...(isSubjectMode && bookId ? { bookId } : {}),
      entries: list,
    }).unwrap()
  }

  async function saveTeachers() {
    await Promise.all(
      teachers.map((te) =>
        saveTA({
          date,
          teacherId: te._id,
          categoryCode: 'staff',
          period: DAILY_PERIOD,
          sessionId: activeSessionId || undefined,
          status: mergedTeacherEntries[te._id] || 'present',
        }).unwrap()
      )
    )
  }

  const studentColumns = useMemo(() => {
    const cols = [{ key: 'nm', headerKey: 'fullName', cell: (s) => loc(s.name, lng) }]
    if (isSubjectMode) {
      cols.push({
        key: 'book',
        headerKey: 'bookTitle',
        hidePrint: true,
        cell: () => {
          const b = bookOptions.find((x) => String(x._id) === String(bookId))
          return loc(b?.title, lng) || '—'
        },
      })
    }
    cols.push(
      ...STUDENT_STATUSES.map((st) => ({
        key: st,
        header: t(STATUS_LABEL_KEYS[st]),
        cell: (s) => (
          <AppRadio
            iconOnly
            name={`st-${s._id}`}
            value={st}
            checked={(mergedStudentEntries[s._id] || 'present') === st}
            onValueChange={() => setStudentStatus(s._id, st)}
            aria-label={st}
          />
        ),
      }))
    )
    return cols
  }, [lng, mergedStudentEntries, setStudentStatus, t, isSubjectMode, bookId, bookOptions])

  const daySummaryColumns = useMemo(
    () => [
      {
        key: 'dt',
        headerKey: 'date',
        cell: (r) => formatDisplayDate(r.date, lng, mode),
      },
      { key: 'nm', headerKey: 'fullName', cell: (r) => loc(r.studentName, lng) },
      {
        key: 'sub',
        headerKey: 'bookTitle',
        cell: (r) =>
          r.isDaily
            ? t('attendance.dailyClass')
            : loc(r.bookName, lng) || loc(r.subjectName, lng) || '—',
      },
      {
        key: 'st',
        headerKey: 'salaryStatusLabel',
        cell: (r) => statusLabel(t, r.status),
      },
    ],
    [lng, t, mode]
  )

  const teacherDaySummaryColumns = useMemo(
    () => [
      {
        key: 'dt',
        headerKey: 'date',
        cell: (r) => formatDisplayDate(r.date, lng, mode),
      },
      { key: 'nm', headerKey: 'fullName', cell: (r) => loc(r.teacherName, lng) },
      {
        key: 'st',
        headerKey: 'salaryStatusLabel',
        cell: (r) => statusLabel(t, r.status),
      },
    ],
    [lng, t, mode]
  )

  const monthlyColumns = useMemo(() => {
    const cols = [
      {
        key: 'dt',
        headerKey: 'date',
        cell: (r) => formatDisplayDate(r.date, lng, mode),
      },
    ]
    if (reportPersonType === 'student') {
      cols.push({
        key: 'sub',
        headerKey: 'bookTitle',
        cell: (r) =>
          r.isDaily
            ? t('attendance.dailyClass')
            : loc(r.bookName, lng) || loc(r.subjectName, lng) || '—',
      })
    }
    cols.push({
      key: 'st',
      headerKey: 'salaryStatusLabel',
      cell: (r) => statusLabel(t, r.status),
    })
    return cols
  }, [lng, t, mode, reportPersonType])

  const teacherColumns = useMemo(
    () => [
      { key: 'nm', headerKey: 'fullName', cell: (te) => loc(te.name, lng) },
      ...TEACHER_STATUSES.map((st) => ({
        key: st,
        header: t(STATUS_LABEL_KEYS[st]),
        cell: (te) => (
          <AppRadio
            iconOnly
            name={`te-${te._id}`}
            value={st}
            checked={(mergedTeacherEntries[te._id] || 'present') === st}
            onValueChange={() => setTeacherStatus(te._id, st)}
            aria-label={st}
          />
        ),
      })),
    ],
    [lng, mergedTeacherEntries, setTeacherStatus, t]
  )

  const studentHint = useMemo(() => {
    if (isSubjectMode && !courseSubjectId) return t('attendance.selectSubjectFirst')
    if (!darjahId) return t('attendance.selectDarjahFirst')
    if (isSubjectMode && !bookId) return t('attendance.selectBookFirst')
    if (rosterStudents.length > 0) {
      return isSubjectMode ? t('attendance.bookWiseHint') : t('attendance.dailyHint')
    }
    if (isSubjectMode && students.length > 0 && rosterStudents.length === 0) {
      return t('attendance.allHaveDailyMark')
    }
    return isSubjectMode ? t('attendance.noStudentsForBook') : t('common.noRecords')
  }, [darjahId, students.length, rosterStudents.length, isSubjectMode, courseSubjectId, bookId, t])

  const canSaveStudents =
    tab === 'student' &&
    darjahId &&
    rosterStudents.length > 0 &&
    (!isSubjectMode || (courseSubjectId && bookId))
  const canSaveTeachers = tab === 'teacher' && teachers.length > 0

  return (
    <div className="attendance-page">
      <PageHeading navKey="navAttendance" />

      <div className="content-panel p-2 p-md-3 mb-3">
        <AppTabs
          variant="pills"
          value={tab}
          onChange={setTab}
          lang={lng}
          ariaLabel={t('nav.attendance')}
          items={[
            { id: 'student', label: t('attendance.tabMark') },
            { id: 'teacher', label: t('attendance.tabTeachers') },
            { id: 'report', label: t('attendance.tabMonthly') },
          ]}
        />
      </div>

      {tab === 'student' && (
        <>
          <div className="content-panel p-3 mb-3">
            <div className="row g-2 align-items-end">
              <div className="col-md-3">
                <FormField k="date" htmlFor="at-dt">
                  <AppDateInput id="at-dt" lng={lng} value={date} onChange={setDate} />
                </FormField>
              </div>
              <div className="col-12 col-md-6">
                <span className="form-label small d-block mb-1" lang={uiLang(lng)}>
                  {t('attendance.markMode')}
                </span>
                <div className="tt-week-toggle d-inline-flex" role="group">
                  <button
                    type="button"
                    className={`tt-week-toggle__btn${markMode === 'daily' ? ' is-active' : ''}`}
                    onClick={() => setMarkMode('daily')}
                  >
                    {t('attendance.modeDaily')}
                  </button>
                  <button
                    type="button"
                    className={`tt-week-toggle__btn${markMode === 'subject' ? ' is-active' : ''}`}
                    onClick={() => setMarkMode('subject')}
                  >
                    {t('attendance.modeSubject')}
                  </button>
                </div>
              </div>
              {isSubjectMode && (
                <>
                  <div className="col-md-3">
                    <FormField k="subjectName" htmlFor="at-subject">
                      <AppSelect
                        id="at-subject"
                        value={courseSubjectId}
                        onChange={(e) => setCourseSubjectId(e.target.value)}
                      >
                        <option value="">—</option>
                        {subjectOptions.map((s) => (
                          <option key={s._id} value={s._id}>
                            {loc(s.name, lng)}
                          </option>
                        ))}
                      </AppSelect>
                    </FormField>
                  </div>
                  <div className="col-md-3">
                    <FormField label={t('attendance.selectDarjah')} htmlFor="at-darjah">
                      <AppSelect
                        id="at-darjah"
                        value={darjahId}
                        onChange={(e) => setDarjahId(e.target.value)}
                        disabled={!courseSubjectId}
                      >
                        <option value="">—</option>
                        {darajat.map((d) => (
                          <option key={d._id} value={d._id}>
                            {loc(d.name, lng)}
                            {d.code ? ` (${d.code})` : ''}
                          </option>
                        ))}
                      </AppSelect>
                    </FormField>
                  </div>
                  <div className="col-md-3">
                    <FormField k="bookTitle" htmlFor="at-book">
                      <AppSelect
                        id="at-book"
                        value={bookId}
                        onChange={(e) => setBookId(e.target.value)}
                        disabled={!darjahId || !courseSubjectId}
                      >
                        <option value="">—</option>
                        {bookOptions.map((b) => (
                          <option key={b._id} value={b._id}>
                            {loc(b.title, lng)}
                          </option>
                        ))}
                      </AppSelect>
                    </FormField>
                  </div>
                </>
              )}
              {!isSubjectMode && (
                <div className="col-md-3">
                  <FormField label={t('attendance.selectDarjah')} htmlFor="at-darjah-daily">
                    <AppSelect
                      id="at-darjah-daily"
                      value={darjahId}
                      onChange={(e) => setDarjahId(e.target.value)}
                    >
                      <option value="">—</option>
                      {darajat.map((d) => (
                        <option key={d._id} value={d._id}>
                          {loc(d.name, lng)}
                          {d.code ? ` (${d.code})` : ''}
                        </option>
                      ))}
                    </AppSelect>
                  </FormField>
                </div>
              )}
            </div>
            {studentHint ? (
              <p className="small text-secondary mb-0 mt-2" lang={uiLang(lng)}>
                {studentHint}
                {rosterStudents.length > 0
                  ? ` · ${t('attendance.studentsFound', { count: rosterStudents.length })}`
                  : ''}
              </p>
            ) : null}
          </div>

          <DataTable
            className="mb-2"
            columns={studentColumns}
            rows={rosterStudents}
            getRowKey={(s) => s._id}
            isLoading={studentsLoading}
            loadingText={t('common.loading')}
            emptyText={studentHint || t('common.noRecords')}
          />
          <button
            type="button"
            className="btn btn-success btn-sm mb-4"
            disabled={!canSaveStudents || savingStudents}
            onClick={saveStudents}
          >
            {savingStudents ? t('common.loading') : t('common.save')}
          </button>

          {darjahId && daySummary.length > 0 && (
            <div className="mt-2">
              <h2 className="h6 mb-2" lang={uiLang(lng)}>
                {t('attendance.daySummaryTitle')}
              </h2>
              <DataTable
                columns={daySummaryColumns}
                rows={daySummary}
                getRowKey={(r) => r._id}
                emptyText={t('common.noRecords')}
              />
            </div>
          )}
        </>
      )}

      {tab === 'teacher' && (
        <>
          <div className="content-panel p-3 mb-3">
            <div className="row g-2">
              <div className="col-md-3">
                <FormField k="date" htmlFor="at-dt-tea">
                  <AppDateInput id="at-dt-tea" lng={lng} value={date} onChange={setDate} />
                </FormField>
              </div>
            </div>
            <p className="small text-secondary mb-0 mt-2" lang={uiLang(lng)}>
              {t('attendance.teacherDailyHint')}
              {teachers.length > 0 ? ` · ${teachers.length}` : ''}
            </p>
          </div>
          <DataTable
            className="mb-2"
            columns={teacherColumns}
            rows={teachers}
            getRowKey={(te) => te._id}
            loadingText={t('common.loading')}
            emptyText={t('common.noRecords')}
          />
          <button
            type="button"
            className="btn btn-success btn-sm"
            disabled={!canSaveTeachers || savingTeachers}
            onClick={saveTeachers}
          >
            {savingTeachers ? t('common.loading') : t('common.save')}
          </button>

          {teacherDaySummary.length > 0 && (
            <div className="mt-3">
              <h2 className="h6 mb-2" lang={uiLang(lng)}>
                {t('attendance.teacherDaySummaryTitle')}
              </h2>
              <DataTable
                columns={teacherDaySummaryColumns}
                rows={teacherDaySummary}
                getRowKey={(r) => r._id}
                emptyText={t('common.noRecords')}
              />
            </div>
          )}
        </>
      )}

      {tab === 'report' && (
        <>
          <div className="content-panel p-3 mb-3">
            <div className="row g-2 align-items-end">
              <div className="col-md-3">
                <FormField label={t('attendance.reportPersonType')} htmlFor="at-rep-type">
                  <AppSelect
                    id="at-rep-type"
                    value={reportPersonType}
                    onValueChange={(v) => {
                      setReportPersonType(v || 'student')
                      setReportStudentId('')
                      setReportTeacherId('')
                    }}
                  >
                    <option value="student">{t('attendance.tabStudents')}</option>
                    <option value="teacher">{t('attendance.tabTeachers')}</option>
                  </AppSelect>
                </FormField>
              </div>
              <div className="col-md-4">
                {reportPersonType === 'teacher' ? (
                  <FormField label={t('attendance.labelTeacher')} htmlFor="at-rep-tea">
                    <AppSelect
                      id="at-rep-tea"
                      value={reportTeacherId}
                      onValueChange={(v) => setReportTeacherId(v || '')}
                    >
                      <option value="">—</option>
                      {teachers.map((te) => (
                        <option key={te._id} value={te._id}>
                          {loc(te.name, lng)}
                        </option>
                      ))}
                    </AppSelect>
                  </FormField>
                ) : (
                  <FormField k="feeStudentCol" htmlFor="at-rep-stu">
                    <AppSelect
                      id="at-rep-stu"
                      value={reportStudentId}
                      onValueChange={(v) => setReportStudentId(v || '')}
                    >
                      <option value="">—</option>
                      {allStudents.map((s) => (
                        <option key={s._id} value={s._id}>
                          {loc(s.name, lng)}
                          {s.rollNumber ? ` (${s.rollNumber})` : ''}
                        </option>
                      ))}
                    </AppSelect>
                  </FormField>
                )}
              </div>
              <div className="col-md-3">
                <FormField label={t('attendance.reportMonth')} htmlFor="at-rep-month">
                  <AppInput
                    id="at-rep-month"
                    type="month"
                    latin
                    value={reportMonth}
                    onChange={(e) => setReportMonth(e.target.value)}
                  />
                </FormField>
              </div>
            </div>
            {monthlySummary && reportPersonSelected ? (
              <div className="row g-2 mt-3">
                {[
                  { label: t('attendance.statusPresent'), value: monthlySummary.present },
                  { label: t('attendance.statusAbsent'), value: monthlySummary.absent },
                  { label: t('attendance.statusSick'), value: monthlySummary.sick },
                  { label: t('attendance.statusLate'), value: monthlySummary.late },
                  { label: t('attendance.reportTotal'), value: monthlySummary.total },
                ].map((s) => (
                  <div key={s.label} className="col-6 col-md-auto">
                    <div className="small text-secondary">{s.label}</div>
                    <div className="fw-bold table-num">{s.value}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <DataTable
            columns={monthlyColumns}
            rows={monthlyRows}
            getRowKey={(r) => r._id}
            isLoading={monthlyLoading}
            loadingText={t('common.loading')}
            emptyText={
              reportPersonSelected
                ? t('attendance.noMonthlyRecords')
                : reportPersonType === 'teacher'
                  ? t('attendance.pickTeacherForReport')
                  : t('attendance.pickStudentForReport')
            }
          />
        </>
      )}
    </div>
  )
}
