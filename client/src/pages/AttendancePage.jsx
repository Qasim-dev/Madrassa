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
  useGetSessionsQuery,
} from '../services/api'
import { loc, uiLang } from '../shared/localized'
import { formatDisplayDate } from '../shared/formatDisplayDate'
import { useCalendarMode } from '../app/calendarMode'
import { useFlash } from '../app/flash.jsx'
import AppDateInput from '../components/AppDateInput'
import AppTabs from '../components/AppTabs'
import BilingualLabel from '../components/BilingualLabel'
import PageHeading from '../components/PageHeading'
import DataTable from '../components/DataTable'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import { AppInput, AppSelect } from '../components/ui'
import AttendanceStatusSegment from '../components/attendance/AttendanceStatusSegment'
import AttendanceSummaryCards from '../components/attendance/AttendanceSummaryCards'
import AttendanceQuickActions from '../components/attendance/AttendanceQuickActions'
import {
  DAILY_PERIOD,
  monthBounds,
  statusLabel,
  countByStatus,
} from '../components/attendance/attendanceConstants'
import './attendancePage.css'

export default function AttendancePage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const { mode } = useCalendarMode()
  const { showFlash } = useFlash()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab = tabParam === 'teacher' ? 'teacher' : tabParam === 'report' ? 'report' : 'student'

  const activeSessionId = useSelector((s) => s.session.activeSessionId)
  const { data: sessions = [] } = useGetSessionsQuery()
  const activeSession = useMemo(
    () => sessions.find((s) => String(s._id) === String(activeSessionId)),
    [sessions, activeSessionId]
  )

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [darjahId, setDarjahId] = useState('')
  const [markMode, setMarkMode] = useState('daily')
  const [courseSubjectId, setCourseSubjectId] = useState('')
  const [bookId, setBookId] = useState('')
  const [studentEntries, setStudentEntries] = useState({})
  const [teacherEntries, setTeacherEntries] = useState({})
  const [reportPersonType, setReportPersonType] = useState('student')
  const [reportStudentId, setReportStudentId] = useState('')
  const [reportTeacherId, setReportTeacherId] = useState('')
  const [reportMonth, setReportMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [listSearch, setListSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dirty, setDirty] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const [bulkConfirm, setBulkConfirm] = useState(null)
  const [saveError, setSaveError] = useState('')
  const [undoStack, setUndoStack] = useState([])
  const [sheetPanel, setSheetPanel] = useState('mark') // mark | audit
  const [teacherSheetPanel, setTeacherSheetPanel] = useState('mark')
  /** null = auto (open until roster ready), true/false = user override */
  const [controlsForced, setControlsForced] = useState(null)

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

  const darajat = useMemo(
    () => (isSubjectMode ? attendanceContext?.darajat ?? [] : dailyContext?.darajat ?? []),
    [isSubjectMode, attendanceContext?.darajat, dailyContext?.darajat]
  )
  const subjectOptions = useMemo(
    () => attendanceContext?.subjects ?? dailyContext?.subjects ?? [],
    [attendanceContext?.subjects, dailyContext?.subjects]
  )
  const bookOptions = useMemo(() => attendanceContext?.books ?? [], [attendanceContext?.books])

  const selectedDarjah = useMemo(
    () => darajat.find((d) => String(d._id) === String(darjahId)),
    [darajat, darjahId]
  )
  const selectedSubject = useMemo(
    () => subjectOptions.find((s) => String(s._id) === String(courseSubjectId)),
    [subjectOptions, courseSubjectId]
  )
  const selectedBook = useMemo(
    () => bookOptions.find((b) => String(b._id) === String(bookId)),
    [bookOptions, bookId]
  )

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

  const { data: students = [], isLoading: studentsLoading } = useGetAttendanceRosterQuery(
    rosterParams ?? undefined,
    { skip: !rosterParams }
  )

  const { data: teachers = [], isLoading: teachersLoading } = useGetTeachersQuery()
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
    setStudentEntries({})
    setTeacherEntries({})
    setDirty(false)
    setUndoStack([])
    setStatusFilter('')
    setListSearch('')
    setSaveError('')
    setSheetPanel('mark')
    setControlsForced(null)
  }

  function changeDate(next) {
    setDate(next)
    setStudentEntries({})
    setTeacherEntries({})
    setDirty(false)
    setUndoStack([])
    setListSearch('')
    setSaveError('')
    setSheetPanel('mark')
    setTeacherSheetPanel('mark')
    setControlsForced(null)
  }

  function changeMarkMode(next) {
    setMarkMode(next)
    if (next === 'daily') {
      setCourseSubjectId('')
      setBookId('')
    }
    setStudentEntries({})
    setDirty(false)
    setUndoStack([])
    setStatusFilter('')
    setListSearch('')
    setSaveError('')
    setControlsForced(null)
  }

  useEffect(() => {
    if (!dirty) return undefined
    const onBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

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

  const pushUndo = useCallback((snapshot) => {
    setUndoStack((prev) => [...prev.slice(-19), snapshot])
  }, [])

  const setStudentStatus = useCallback(
    (studentId, status) => {
      setStudentEntries((prev) => {
        pushUndo(prev)
        return { ...prev, [studentId]: status }
      })
      setDirty(true)
      setSaveError('')
    },
    [pushUndo]
  )

  const setTeacherStatus = useCallback(
    (teacherId, status) => {
      setTeacherEntries((prev) => {
        pushUndo(prev)
        return { ...prev, [teacherId]: status }
      })
      setDirty(true)
      setSaveError('')
    },
    [pushUndo]
  )

  const undoLast = useCallback(() => {
    setUndoStack((prev) => {
      if (!prev.length) return prev
      const snap = prev[prev.length - 1]
      if (tab === 'teacher') setTeacherEntries(snap)
      else setStudentEntries(snap)
      return prev.slice(0, -1)
    })
    setDirty(true)
  }, [tab])

  const applyBulkStatus = useCallback(
    (status) => {
      if (tab === 'teacher') {
        pushUndo(teacherEntries)
        if (status === 'clear') {
          setTeacherEntries({})
        } else {
          const next = {}
          teachers.forEach((te) => {
            next[te._id] = status
          })
          setTeacherEntries(next)
        }
      } else {
        pushUndo(studentEntries)
        if (status === 'clear') {
          setStudentEntries({})
        } else {
          const next = {}
          rosterStudents.forEach((s) => {
            next[s._id] = status
          })
          setStudentEntries(next)
        }
      }
      setDirty(true)
      setSaveError('')
    },
    [tab, teachers, rosterStudents, studentEntries, teacherEntries, pushUndo]
  )

  const requestBulk = useCallback((status) => {
    if (status === 'absent' || status === 'clear') {
      setBulkConfirm(status)
      return
    }
    applyBulkStatus(status)
  }, [applyBulkStatus])

  async function saveStudents() {
    setSaveError('')
    if (!darjahId) {
      setSaveError(t('attendance.selectDarjahFirst'))
      return
    }
    if (isSubjectMode && !courseSubjectId) {
      setSaveError(t('attendance.selectSubjectFirst'))
      return
    }
    if (isSubjectMode && !bookId) {
      setSaveError(t('attendance.selectBookFirst'))
      return
    }
    const list = rosterStudents.map((s) => ({
      studentId: s._id,
      status: mergedStudentEntries[s._id] || 'present',
    }))
    if (!list.length) {
      setSaveError(t('attendance.noStudentsToSave'))
      return
    }
    try {
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
      setDirty(false)
      setLastSavedAt(new Date())
      setUndoStack([])
      showFlash(t('attendance.saveSuccess'), 'success')
    } catch (err) {
      const msg = err?.data?.message || err?.error || err?.message || t('common.error')
      setSaveError(msg)
      showFlash(msg, 'danger')
    }
  }

  async function saveTeachers() {
    setSaveError('')
    if (!teachers.length) {
      setSaveError(t('common.noRecords'))
      return
    }
    try {
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
      setDirty(false)
      setLastSavedAt(new Date())
      setUndoStack([])
      showFlash(t('attendance.saveSuccess'), 'success')
    } catch (err) {
      const msg = err?.data?.message || err?.error || err?.message || t('common.error')
      setSaveError(msg)
      showFlash(msg, 'danger')
    }
  }

  const filteredRosterStudents = useMemo(() => {
    const q = listSearch.trim().toLowerCase()
    return rosterStudents.filter((s) => {
      const st = mergedStudentEntries[s._id] || 'present'
      if (statusFilter && st !== statusFilter) return false
      if (!q) return true
      const name = String(loc(s.name, lng) || '').toLowerCase()
      const ur = String(s.name?.ur || '').toLowerCase()
      const en = String(s.name?.en || '').toLowerCase()
      const roll = String(s.rollNumber || '').toLowerCase()
      const admission = String(s.admissionNumber || s.registrationNo || '').toLowerCase()
      const father = String(loc(s.fatherName, lng) || s.fatherName?.ur || s.fatherName?.en || '').toLowerCase()
      return (
        name.includes(q) ||
        ur.includes(q) ||
        en.includes(q) ||
        roll.includes(q) ||
        admission.includes(q) ||
        father.includes(q)
      )
    })
  }, [rosterStudents, listSearch, lng, mergedStudentEntries, statusFilter])

  const filteredTeachers = useMemo(() => {
    const q = listSearch.trim().toLowerCase()
    return teachers.filter((te) => {
      const st = mergedTeacherEntries[te._id] || 'present'
      if (statusFilter && st !== statusFilter) return false
      if (!q) return true
      const name = String(loc(te.name, lng) || '').toLowerCase()
      return name.includes(q) || String(te.name?.ur || '').toLowerCase().includes(q)
    })
  }, [teachers, listSearch, lng, mergedTeacherEntries, statusFilter])

  const studentCounts = useMemo(() => {
    const ids = rosterStudents.map((s) => s._id)
    return countByStatus(ids, mergedStudentEntries)
  }, [rosterStudents, mergedStudentEntries])

  const teacherCounts = useMemo(() => {
    const ids = teachers.map((te) => te._id)
    return countByStatus(ids, mergedTeacherEntries)
  }, [teachers, mergedTeacherEntries])

  const liveCounts = tab === 'teacher' ? teacherCounts : studentCounts

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
  const canSave = tab === 'student' ? canSaveStudents : tab === 'teacher' ? canSaveTeachers : false
  const saving = savingStudents || savingTeachers
  const rosterReady =
    (tab === 'student' && rosterStudents.length > 0) || (tab === 'teacher' && teachers.length > 0)
  const controlsOpen = controlsForced != null ? controlsForced : !rosterReady

  const daySummaryColumns = useMemo(
    () => [
      { key: 'dt', headerKey: 'date', cell: (r) => formatDisplayDate(r.date, lng, mode) },
      { key: 'nm', headerKey: 'fullName', cell: (r) => loc(r.studentName, lng) },
      {
        key: 'sub',
        headerKey: 'bookTitle',
        cell: (r) =>
          r.isDaily ? t('attendance.dailyClass') : loc(r.bookName, lng) || loc(r.subjectName, lng) || '—',
      },
      { key: 'st', headerKey: 'salaryStatusLabel', cell: (r) => statusLabel(t, r.status) },
    ],
    [lng, t, mode]
  )

  const teacherDaySummaryColumns = useMemo(
    () => [
      { key: 'dt', headerKey: 'date', cell: (r) => formatDisplayDate(r.date, lng, mode) },
      { key: 'nm', headerKey: 'fullName', cell: (r) => loc(r.teacherName, lng) },
      { key: 'st', headerKey: 'salaryStatusLabel', cell: (r) => statusLabel(t, r.status) },
    ],
    [lng, t, mode]
  )

  const monthlyColumns = useMemo(() => {
    const cols = [{ key: 'dt', headerKey: 'date', cell: (r) => formatDisplayDate(r.date, lng, mode) }]
    if (reportPersonType === 'student') {
      cols.push({
        key: 'sub',
        headerKey: 'bookTitle',
        cell: (r) =>
          r.isDaily ? t('attendance.dailyClass') : loc(r.bookName, lng) || loc(r.subjectName, lng) || '—',
      })
    }
    cols.push({ key: 'st', headerKey: 'salaryStatusLabel', cell: (r) => statusLabel(t, r.status) })
    return cols
  }, [lng, t, mode, reportPersonType])

  const progressPct =
    liveCounts.total > 0 ? Math.round(((liveCounts.present + liveCounts.absent + liveCounts.sick + liveCounts.late) / liveCounts.total) * 100) : 0

  function renderPersonRows(people, entries, onStatus, idPrefix) {
    if (studentsLoading || (tab === 'teacher' && teachersLoading)) {
      return (
        <div className="att-skeleton" aria-busy="true" aria-live="polite">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="att-skeleton__row" />
          ))}
        </div>
      )
    }

    if (!people.length) {
      return (
        <div className="att-empty" lang={uiLang(lng)}>
          {tab === 'teacher' && listSearch.trim() && teachers.length > 0
            ? t('attendance.noSearchMatchTeacher')
            : tab === 'student' && listSearch.trim() && rosterStudents.length > 0
              ? t('attendance.noSearchMatch')
              : tab === 'student'
                ? studentHint
                : t('attendance.noTeachers')}
        </div>
      )
    }

    return (
      <div className="att-sheet__scroll" role="list" aria-label={t('nav.attendance')}>
        <div className="att-sheet__head" aria-hidden="true">
          <span className="att-sheet__col att-sheet__col--roll">{t('attendance.colRoll')}</span>
          <span className="att-sheet__col att-sheet__col--name">{t('attendance.colName')}</span>
          <span className="att-sheet__col att-sheet__col--status">{t('attendance.colStatus')}</span>
        </div>
        {people.map((person, index) => {
          const id = person._id
          const status = entries[id] || 'present'
          const roll = person.rollNumber || person.employeeCode || index + 1
          return (
            <div
              key={id}
              role="listitem"
              className={`att-row att-row--${status}`}
              data-status={status}
            >
              <div className="att-row__roll table-num" dir="ltr">
                {roll}
              </div>
              <div className="att-row__name" lang={uiLang(lng)}>
                <span className="att-row__name-text">{loc(person.name, lng)}</span>
                {person.fatherName ? (
                  <span className="att-row__meta">{loc(person.fatherName, lng)}</span>
                ) : null}
              </div>
              <div className="att-row__status">
                <AttendanceStatusSegment
                  name={`${idPrefix}-${id}`}
                  value={status}
                  onChange={(st) => onStatus(id, st)}
                  t={t}
                  disabled={saving}
                />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={`attendance-page${dirty ? ' is-dirty' : ''}`}>
      <PageHeading navKey="navAttendance" sticky={false} />

      <section
        className={`att-controls-acc content-panel${controlsOpen ? ' is-open' : ''}`}
        aria-label={t('nav.attendance')}
      >
        <div className="att-controls-acc__tabs">
          <AppTabs
            variant="pills"
            value={tab}
            onChange={setTab}
            lang={lng}
            size="sm"
            ariaLabel={t('nav.attendance')}
            items={[
              { id: 'student', label: t('attendance.tabMark') },
              { id: 'teacher', label: t('attendance.tabTeachers') },
              { id: 'report', label: t('attendance.tabMonthly') },
            ]}
          />
        </div>

        <button
          type="button"
          className="att-acc__toggle att-controls-acc__toggle"
          aria-expanded={controlsOpen}
          onClick={() => setControlsForced(!controlsOpen)}
        >
          <span className="att-acc__title" lang={uiLang(lng)}>
            {controlsOpen ? t('attendance.hideFilters') : t('attendance.showFilters')}
          </span>
          <span className="att-controls-acc__chips" lang={uiLang(lng)}>
            <span className="att-chip">{formatDisplayDate(date, lng, mode)}</span>
            {activeSession?.title ? (
              <span className="att-chip att-chip--muted">{activeSession.title}</span>
            ) : null}
            {selectedDarjah ? <span className="att-chip">{loc(selectedDarjah.name, lng)}</span> : null}
            {isSubjectMode && selectedSubject ? (
              <span className="att-chip">{loc(selectedSubject.name, lng)}</span>
            ) : null}
            {isSubjectMode && selectedBook ? (
              <span className="att-chip att-chip--muted">{loc(selectedBook.title, lng)}</span>
            ) : null}
            {rosterReady ? (
              <span className="att-chip att-chip--muted table-num">
                {tab === 'teacher'
                  ? t('attendance.teachersFound', { count: liveCounts.total })
                  : t('attendance.studentsFound', { count: liveCounts.total })}
              </span>
            ) : null}
          </span>
          <span className="att-acc__chevron" aria-hidden="true" />
        </button>

        {controlsOpen ? (
          <div className="att-controls-acc__body">
            <div className="att-toolbar">
        {tab === 'student' ? (
          <div
            className={`att-toolbar__filters${isSubjectMode ? ' att-toolbar__filters--subject' : ''}`}
          >
            <div className="att-field">
              <BilingualLabel k="date" htmlFor="at-dt" required className="att-field__label" />
              <AppDateInput id="at-dt" lng={lng} value={date} onChange={changeDate} />
            </div>
            {isSubjectMode ? (
              <div className="att-field">
                <BilingualLabel k="subjectName" htmlFor="at-subject" required className="att-field__label" />
                <AppSelect
                  id="at-subject"
                  value={courseSubjectId}
                  onChange={(e) => {
                    setCourseSubjectId(e.target.value)
                    setDarjahId('')
                    setBookId('')
                    setStudentEntries({})
                    setDirty(false)
                    setUndoStack([])
                    setStatusFilter('')
                    setListSearch('')
                    setSaveError('')
                    setControlsForced(null)
                  }}
                >
                  <option value="">—</option>
                  {subjectOptions.map((s) => (
                    <option key={s._id} value={s._id}>
                      {loc(s.name, lng)}
                    </option>
                  ))}
                </AppSelect>
              </div>
            ) : null}
            <div className="att-field">
              <label className="att-field__label" htmlFor="at-darjah" lang={uiLang(lng)}>
                {t('attendance.selectDarjah')}
                <span className="att-field__req">*</span>
              </label>
              <AppSelect
                id="at-darjah"
                value={darjahId}
                onChange={(e) => {
                  setDarjahId(e.target.value)
                  setBookId('')
                  setStudentEntries({})
                  setDirty(false)
                  setUndoStack([])
                  setStatusFilter('')
                  setListSearch('')
                  setSaveError('')
                  setControlsForced(null)
                  setSheetPanel('mark')
                }}
                disabled={isSubjectMode && !courseSubjectId}
              >
                <option value="">—</option>
                {darajat.map((d) => (
                  <option key={d._id} value={d._id}>
                    {loc(d.name, lng)}
                    {d.code ? ` (${d.code})` : ''}
                  </option>
                ))}
              </AppSelect>
            </div>
            {isSubjectMode ? (
              <div className="att-field">
                <BilingualLabel k="bookTitle" htmlFor="at-book" className="att-field__label" />
                <AppSelect
                  id="at-book"
                  value={bookId}
                  onChange={(e) => {
                    setBookId(e.target.value)
                    setStudentEntries({})
                    setDirty(false)
                    setUndoStack([])
                    setStatusFilter('')
                    setListSearch('')
                    setSaveError('')
                    setControlsForced(null)
                  }}
                  disabled={!darjahId || !courseSubjectId}
                >
                  <option value="">—</option>
                  {bookOptions.map((b) => (
                    <option key={b._id} value={b._id}>
                      {loc(b.title, lng)}
                    </option>
                  ))}
                </AppSelect>
              </div>
            ) : null}
            <div className="att-field att-field--mode">
              <span className="att-field__label" id="at-mode-label" lang={uiLang(lng)}>
                {t('attendance.markMode')}
              </span>
              <div className="tt-week-toggle tt-week-toggle--toolbar" role="group" aria-labelledby="at-mode-label">
                <button
                  type="button"
                  className={`tt-week-toggle__btn${markMode === 'daily' ? ' is-active' : ''}`}
                  aria-pressed={markMode === 'daily'}
                  onClick={() => changeMarkMode('daily')}
                >
                  {t('attendance.modeDaily')}
                </button>
                <button
                  type="button"
                  className={`tt-week-toggle__btn${markMode === 'subject' ? ' is-active' : ''}`}
                  aria-pressed={markMode === 'subject'}
                  onClick={() => changeMarkMode('subject')}
                >
                  {t('attendance.modeSubject')}
                </button>
              </div>
            </div>
            <div className="att-field att-field--search">
              <label className="att-field__label" htmlFor="at-search" lang={uiLang(lng)}>
                {t('common.search')}
              </label>
              <AppInput
                id="at-search"
                type="search"
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                placeholder={t('attendance.searchStudent')}
              />
            </div>
          </div>
        ) : null}

        {tab === 'teacher' ? (
          <div className="att-toolbar__filters att-toolbar__filters--teacher">
            <div className="att-field">
              <BilingualLabel k="date" htmlFor="at-dt-tea" className="att-field__label" />
              <AppDateInput id="at-dt-tea" lng={lng} value={date} onChange={changeDate} />
            </div>
            <div className="att-field att-field--search">
              <label className="att-field__label" htmlFor="at-search-tea" lang={uiLang(lng)}>
                {t('common.search')}
              </label>
              <AppInput
                id="at-search-tea"
                type="search"
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                placeholder={t('attendance.searchTeacher')}
              />
            </div>
          </div>
        ) : null}

        {tab === 'report' ? (
          <div className="att-toolbar__filters att-toolbar__filters--report">
            <div className="att-field">
              <label className="att-field__label" htmlFor="at-rep-type" lang={uiLang(lng)}>
                {t('attendance.reportPersonType')}
              </label>
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
            </div>
            <div className="att-field">
              {reportPersonType === 'teacher' ? (
                <>
                  <label className="att-field__label" htmlFor="at-rep-tea" lang={uiLang(lng)}>
                    {t('attendance.labelTeacher')}
                  </label>
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
                </>
              ) : (
                <>
                  <BilingualLabel k="feeStudentCol" htmlFor="at-rep-stu" className="att-field__label" />
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
                </>
              )}
            </div>
            <div className="att-field">
              <label className="att-field__label" htmlFor="at-rep-month" lang={uiLang(lng)}>
                {t('attendance.reportMonth')}
              </label>
              <AppInput
                id="at-rep-month"
                type="month"
                latin
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
              />
            </div>
          </div>
        ) : null}
            </div>

            {(tab === 'student' || tab === 'teacher') && rosterReady ? (
              <div className="att-controls-acc__stats">
                <AttendanceSummaryCards
                  counts={liveCounts}
                  t={t}
                  totalLabel={
                    tab === 'teacher' ? t('attendance.statTotalTeachers') : t('attendance.statTotal')
                  }
                  filterStatus={statusFilter}
                  onFilterStatus={(v) => setStatusFilter((prev) => (prev === v ? '' : v))}
                />
                <div className="att-actions-row">
                  <AttendanceQuickActions t={t} onMarkAll={requestBulk} disabled={saving || !rosterReady} />
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={!undoStack.length || saving}
                    onClick={undoLast}
                  >
                    {t('attendance.undo')}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {tab === 'student' && (
        <section
          className={`att-sheet content-panel${darjahId && daySummary.length > 0 ? ' att-sheet--accordion' : ''}`}
        >
          {darjahId && daySummary.length > 0 ? (
            <>
              <div className={`att-acc${sheetPanel === 'mark' ? ' is-open' : ''}`}>
                <button
                  type="button"
                  className="att-acc__toggle"
                  aria-expanded={sheetPanel === 'mark'}
                  onClick={() => setSheetPanel('mark')}
                >
                  <span className="att-acc__title" lang={uiLang(lng)}>
                    {t('attendance.tabMark')}
                    <span className="att-acc__count table-num"> ({filteredRosterStudents.length})</span>
                  </span>
                  <span className="att-acc__chevron" aria-hidden="true" />
                </button>
                {sheetPanel === 'mark' ? (
                  <div className="att-acc__body att-sheet__main">
                    {renderPersonRows(filteredRosterStudents, mergedStudentEntries, setStudentStatus, 'st')}
                  </div>
                ) : null}
              </div>
              <div className={`att-acc${sheetPanel === 'audit' ? ' is-open' : ''}`}>
                <button
                  type="button"
                  className="att-acc__toggle"
                  aria-expanded={sheetPanel === 'audit'}
                  onClick={() => setSheetPanel('audit')}
                >
                  <span className="att-acc__title" lang={uiLang(lng)}>
                    {t('attendance.daySummaryTitle')}
                    <span className="att-acc__count table-num"> ({daySummary.length})</span>
                  </span>
                  <span className="att-acc__chevron" aria-hidden="true" />
                </button>
                {sheetPanel === 'audit' ? (
                  <div className="att-acc__body att-audit">
                    <div className="att-audit__body">
                      <DataTable
                        columns={daySummaryColumns}
                        rows={daySummary}
                        getRowKey={(r) => r._id}
                        emptyText={t('common.noRecords')}
                        fillScroll
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="att-sheet__main">
              {renderPersonRows(filteredRosterStudents, mergedStudentEntries, setStudentStatus, 'st')}
            </div>
          )}
        </section>
      )}

      {tab === 'teacher' && (
        <section
          className={`att-sheet content-panel${teacherDaySummary.length > 0 ? ' att-sheet--accordion' : ''}`}
        >
          {teacherDaySummary.length > 0 ? (
            <>
              <div className={`att-acc${teacherSheetPanel === 'mark' ? ' is-open' : ''}`}>
                <button
                  type="button"
                  className="att-acc__toggle"
                  aria-expanded={teacherSheetPanel === 'mark'}
                  onClick={() => setTeacherSheetPanel('mark')}
                >
                  <span className="att-acc__title" lang={uiLang(lng)}>
                    {t('attendance.tabTeachers')}
                    <span className="att-acc__count table-num"> ({filteredTeachers.length})</span>
                  </span>
                  <span className="att-acc__chevron" aria-hidden="true" />
                </button>
                {teacherSheetPanel === 'mark' ? (
                  <div className="att-acc__body att-sheet__main">
                    {renderPersonRows(filteredTeachers, mergedTeacherEntries, setTeacherStatus, 'te')}
                  </div>
                ) : null}
              </div>
              <div className={`att-acc${teacherSheetPanel === 'audit' ? ' is-open' : ''}`}>
                <button
                  type="button"
                  className="att-acc__toggle"
                  aria-expanded={teacherSheetPanel === 'audit'}
                  onClick={() => setTeacherSheetPanel('audit')}
                >
                  <span className="att-acc__title" lang={uiLang(lng)}>
                    {t('attendance.teacherDaySummaryTitle')}
                    <span className="att-acc__count table-num"> ({teacherDaySummary.length})</span>
                  </span>
                  <span className="att-acc__chevron" aria-hidden="true" />
                </button>
                {teacherSheetPanel === 'audit' ? (
                  <div className="att-acc__body att-audit">
                    <div className="att-audit__body">
                      <DataTable
                        columns={teacherDaySummaryColumns}
                        rows={teacherDaySummary}
                        getRowKey={(r) => r._id}
                        emptyText={t('common.noRecords')}
                        fillScroll
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="att-sheet__main">
              {renderPersonRows(filteredTeachers, mergedTeacherEntries, setTeacherStatus, 'te')}
            </div>
          )}
        </section>
      )}

      {tab === 'report' && (
        <section className="att-sheet content-panel att-sheet--report">
          {monthlySummary && reportPersonSelected ? (
            <div className="att-summary att-summary--static">
              {[
                { label: t('attendance.statusPresent'), value: monthlySummary.present, tone: 'present' },
                { label: t('attendance.statusAbsent'), value: monthlySummary.absent, tone: 'absent' },
                { label: t('attendance.statusSick'), value: monthlySummary.sick, tone: 'leave' },
                { label: t('attendance.statusLate'), value: monthlySummary.late, tone: 'late' },
                { label: t('attendance.reportTotal'), value: monthlySummary.total, tone: 'neutral' },
              ].map((s) => (
                <div key={s.label} className={`att-summary__card att-summary__card--${s.tone}`}>
                  <span className="att-summary__value table-num">{s.value}</span>
                  <span className="att-summary__label">{s.label}</span>
                </div>
              ))}
            </div>
          ) : null}
          <DataTable
            fillScroll={monthlyRows.length > 8}
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
        </section>
      )}

      {(tab === 'student' || tab === 'teacher') && (
        <div className="att-savebar no-print" role="region" aria-label={t('common.save')}>
          <div className="att-savebar__inner">
            <div className="att-savebar__progress">
              <div className="att-savebar__progress-text" lang={uiLang(lng)}>
                <strong className="table-num">
                  {liveCounts.present + liveCounts.absent + liveCounts.sick + liveCounts.late}
                </strong>
                {' / '}
                <span className="table-num">{liveCounts.total}</span>
                <span className="att-savebar__progress-label"> {t('attendance.progressLabel')}</span>
              </div>
              <div
                className="att-savebar__bar"
                role="progressbar"
                aria-valuenow={progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span style={{ width: `${progressPct}%` }} />
              </div>
              <div className="att-savebar__flags">
                {dirty ? (
                  <span className="att-savebar__unsaved">{t('attendance.unsavedChanges')}</span>
                ) : lastSavedAt ? (
                  <span className="att-savebar__saved">
                    {t('attendance.lastSaved', {
                      time: lastSavedAt.toLocaleTimeString(lng === 'ur' ? 'ur-PK' : 'en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                      }),
                    })}
                  </span>
                ) : null}
              </div>
            </div>
            {saveError ? (
              <p className="att-savebar__error mb-0" role="alert">
                {saveError}
              </p>
            ) : null}
            <button
              type="button"
              className="btn btn-success att-savebar__btn"
              disabled={!canSave || saving}
              onClick={tab === 'student' ? saveStudents : saveTeachers}
            >
              {saving ? t('common.loading') : t('attendance.saveAttendance')}
            </button>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        open={!!bulkConfirm}
        title={t('attendance.confirmBulkTitle')}
        message={
          bulkConfirm === 'clear'
            ? t('attendance.confirmClear')
            : t('attendance.confirmMarkAll', { status: statusLabel(t, bulkConfirm) })
        }
        confirmLabel={t('common.confirm')}
        onClose={() => setBulkConfirm(null)}
        onConfirm={async () => {
          applyBulkStatus(bulkConfirm)
        }}
        dir={uiLang(lng) === 'ur' ? 'rtl' : 'ltr'}
      />
    </div>
  )
}
