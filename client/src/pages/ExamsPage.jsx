import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts'
import {
  useGetExamDashboardQuery,
  useGetExamResultMatrixQuery,
  useImportExamMarksMutation,
  useApplyGraceMarksMutation,
  useUnlockExamMarksMutation,
  useGetExamAuditLogQuery,
  useGetExamsQuery,
  useCreateExamMutation,
  useUpdateExamMutation,
  useDeleteExamMutation,
  useGetExamClassesQuery,
  useAddExamClassesMutation,
  useRemoveExamClassMutation,
  useGetExamSubjectsQuery,
  useSaveExamSubjectsMutation,
  useGetExamSnapshotQuery,
  useSaveExamRollNumbersMutation,
  useGenerateExamSnapshotMutation,
  useGetExamScheduleQuery,
  useSaveExamScheduleMutation,
  useUpdateExamScheduleMutation,
  useDeleteExamScheduleMutation,
  useDeleteExamSubjectMutation,
  useGetExamAttendanceQuery,
  useSaveExamAttendanceMutation,
  useGetExamMarksQuery,
  useSaveExamMarksMutation,
  useProcessExamResultsMutation,
  usePublishExamResultsMutation,
  useGetExamAnalyticsQuery,
  useUnlockExamContainerMutation,
  useGetDarajatQuery,
  useGetSubjectsQuery,
  useGetTeachersQuery,
  useGetSubjectBooksQuery,
  useGetSettingsQuery,
  api,
} from '../services/api'
import { loc } from '../shared/localized'
import { formatDisplayDate } from '../shared/formatDisplayDate'
import { useCalendarMode } from '../app/calendarMode'
import {
  EXAM_WORKFLOW_STEPS,
  EXAM_ATTENDANCE_STATUS,
  EXAM_SUBJECT_TYPES,
  statusLabel,
  examSubjectTypeLabel,
  divisionLabel,
  getExamWorkflowGate,
} from '../shared/examEnums'
import ExamContextBar from '../components/exam/ExamContextBar'
import ExamPhaseStepper from '../components/exam/ExamPhaseStepper'
import ExamRollAssignPanel from '../components/exam/ExamRollAssignPanel'
import ExamAnnouncePanel from '../components/exam/ExamAnnouncePanel'
import PageHeading from '../components/PageHeading'
import DataTable from '../components/DataTable'
import AppModalShell from '../components/AppModalShell'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import ConfirmActionModal from '../components/ConfirmActionModal'
import AppDateInput from '../components/AppDateInput'
import ExamDashboardCards from '../components/exam/ExamDashboardCards'
import AppKpiCards from '../components/ui/AppKpiCards'
import ExamResultMatrix from '../components/exam/ExamResultMatrix'
import ExamAuditPanel from '../components/exam/ExamAuditPanel'
import ExamStepHeader from '../components/exam/ExamStepHeader'
import { AppInput, AppSelect, AppCheckbox, FormField, FormRow } from '../components/ui'
import './examDashboard.css'

const CHART_COL = ['#0f8f5f', '#12a873', '#26ba99', '#5eead4', '#0b6e49', '#99f6e4']

const emptyLoc = () => ({ ur: '', en: '' })

function col(header, cellFn) {
  return { key: header, header, cell: cellFn }
}

function ExamStatusBadge({ status, lng }) {
  const colors = {
    draft: 'bg-slate-100 text-slate-700',
    configured: 'bg-blue-100 text-blue-700',
    active: 'bg-emerald-100 text-emerald-700',
    marks_entry: 'bg-amber-100 text-amber-800',
    processing: 'bg-purple-100 text-purple-700',
    published: 'bg-teal-100 text-teal-800',
    closed: 'bg-gray-200 text-gray-600',
  }
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || colors.draft}`}>
      {statusLabel(status, lng)}
    </span>
  )
}

export default function ExamsPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const { mode } = useCalendarMode()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const dispatch = useDispatch()
  const activeSessionId = useSelector((s) => s.session.activeSessionId)
  const authToken = useSelector((s) => s.auth.token)

  const [step, setStep] = useState(() => {
    const s = searchParams.get('step')
    return s && EXAM_WORKFLOW_STEPS.includes(s) ? s : 'containers'
  })
  const [selectedExamId, setSelectedExamId] = useState(() => searchParams.get('examId') || '')
  const [selectedDarjahId, setSelectedDarjahId] = useState(() => searchParams.get('darjahId') || '')
  const [selectedSectionId, setSelectedSectionId] = useState(() => searchParams.get('sectionId') || '')
  const [selectedMappingId, setSelectedMappingId] = useState('')
  const [teacherFilterId, setTeacherFilterId] = useState('')
  const [publishStudentId, setPublishStudentId] = useState('')
  const [editingScheduleId, setEditingScheduleId] = useState(null)
  const [scheduleConflicts, setScheduleConflicts] = useState([])
  const [examModal, setExamModal] = useState(false)
  const [editingExam, setEditingExam] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteExamReason, setDeleteExamReason] = useState('')
  const [examForm, setExamForm] = useState({
    name: emptyLoc(),
    examTypeIndex: '',
    customExamType: emptyLoc(),
    startDate: '',
    endDate: '',
    resultPublicationDate: '',
  })
  const [classPicker, setClassPicker] = useState([])
  const [subjectForm, setSubjectForm] = useState([])
  const [attendanceDraft, setAttendanceDraft] = useState({})
  const [marksDraft, setMarksDraft] = useState({})
  const [scheduleForm, setScheduleForm] = useState({
    subjectMappingIds: [],
    subjectMappingId: '',
    examDate: '',
    startTime: '09:00',
    endTime: '12:00',
    room: '',
    supervisorId: '',
  })
  const [rollSaving, setRollSaving] = useState(false)
  const [graceTarget, setGraceTarget] = useState(null)
  const [graceForm, setGraceForm] = useState({ graceMarks: '', reason: '' })
  const [deleteScheduleTarget, setDeleteScheduleTarget] = useState(null)
  const [deleteMappingTarget, setDeleteMappingTarget] = useState(null)
  const [confirmProcessOpen, setConfirmProcessOpen] = useState(false)
  const [confirmPublish, setConfirmPublish] = useState(null)
  const [unlockModal, setUnlockModal] = useState(null)
  const [unlockReason, setUnlockReason] = useState('')
  const [msg, setMsg] = useState('')
  const [msgTone, setMsgTone] = useState('success')
  const msgTimerRef = useRef(null)
  const excelInputRef = useRef(null)

  const sessionParams = useMemo(
    () => (activeSessionId ? { sessionId: activeSessionId } : null),
    [activeSessionId]
  )

  const { data: exams = [], isLoading: examsLoading, isFetching: examsFetching, refetch: refetchExams } = useGetExamsQuery(
    sessionParams,
    { skip: !sessionParams }
  )
  const { data: darajat = [] } = useGetDarajatQuery(
    sessionParams ? { sessionId: activeSessionId } : undefined,
    { skip: !activeSessionId }
  )
  const { data: subjects = [] } = useGetSubjectsQuery()
  const { data: teachers = [] } = useGetTeachersQuery()
  const { data: books = [] } = useGetSubjectBooksQuery(
    activeSessionId
      ? {
          sessionId: activeSessionId,
          ...(selectedDarjahId ? { darjahId: selectedDarjahId } : {}),
        }
      : undefined,
    { skip: !activeSessionId }
  )
  const { data: settings } = useGetSettingsQuery()

  const examParams = useMemo(
    () => (selectedExamId && activeSessionId ? { examId: selectedExamId, sessionId: activeSessionId } : null),
    [selectedExamId, activeSessionId]
  )

  const selectedExam = useMemo(
    () => exams.find((e) => String(e._id) === String(selectedExamId)),
    [exams, selectedExamId]
  )
  /** Only query exam sub-resources once the exam is confirmed in the active session list. */
  const examScopeReady = Boolean(examParams && selectedExam)
  const scopedExamParams = examScopeReady ? examParams : null

  const { data: pipelines = [] } = useGetExamClassesQuery(scopedExamParams, { skip: !scopedExamParams })
  const { data: subjectMappings = [], refetch: refetchSubjects } = useGetExamSubjectsQuery(
    scopedExamParams && selectedDarjahId
      ? { ...scopedExamParams, darjahId: selectedDarjahId }
      : null,
    { skip: !scopedExamParams || !selectedDarjahId }
  )
  const { data: snapshots = [], refetch: refetchSnapshot } = useGetExamSnapshotQuery(
    scopedExamParams && selectedDarjahId
      ? { ...scopedExamParams, darjahId: selectedDarjahId, ...(selectedSectionId ? { sectionId: selectedSectionId } : {}) }
      : null,
    { skip: !scopedExamParams || !selectedDarjahId }
  )
  const { data: schedule = [] } = useGetExamScheduleQuery(
    scopedExamParams
      ? {
          ...scopedExamParams,
          ...(selectedDarjahId ? { darjahId: selectedDarjahId } : {}),
          ...(selectedSectionId ? { sectionId: selectedSectionId } : {}),
        }
      : null,
    { skip: !scopedExamParams }
  )
  const { data: attendanceData } = useGetExamAttendanceQuery(
    scopedExamParams && selectedDarjahId
      ? { ...scopedExamParams, darjahId: selectedDarjahId, ...(selectedSectionId ? { sectionId: selectedSectionId } : {}) }
      : null,
    { skip: !scopedExamParams || !selectedDarjahId }
  )
  const { data: marksData, refetch: refetchMarks } = useGetExamMarksQuery(
    scopedExamParams && selectedDarjahId
      ? {
          ...scopedExamParams,
          darjahId: selectedDarjahId,
          ...(selectedMappingId ? { subjectMappingId: selectedMappingId } : {}),
          ...(teacherFilterId ? { teacherId: teacherFilterId } : {}),
        }
      : null,
    { skip: !scopedExamParams || !selectedDarjahId }
  )
  const { data: marksReadinessData } = useGetExamMarksQuery(
    scopedExamParams && selectedDarjahId && step === 'results'
      ? { ...scopedExamParams, darjahId: selectedDarjahId }
      : null,
    { skip: !scopedExamParams || !selectedDarjahId || step !== 'results' }
  )
  const { data: resultMatrix, isLoading: matrixLoading, refetch: refetchMatrix } = useGetExamResultMatrixQuery(
    scopedExamParams && selectedDarjahId
      ? {
          ...scopedExamParams,
          darjahId: selectedDarjahId,
          ...(selectedSectionId ? { sectionId: selectedSectionId } : {}),
        }
      : null,
    { skip: !scopedExamParams || !selectedDarjahId || !['results', 'announce'].includes(step) }
  )
  const { data: analytics } = useGetExamAnalyticsQuery(
    scopedExamParams
      ? { ...scopedExamParams, ...(selectedDarjahId ? { darjahId: selectedDarjahId } : {}) }
      : null,
    { skip: !scopedExamParams || step !== 'analytics' }
  )
  const { data: dashStats, isLoading: dashLoading } = useGetExamDashboardQuery(sessionParams, {
    skip: !sessionParams,
  })
  const { data: auditLogs = [], isLoading: auditLoading } = useGetExamAuditLogQuery(scopedExamParams, {
    skip: !scopedExamParams || step !== 'audit',
  })

  const [createExam] = useCreateExamMutation()
  const [updateExam] = useUpdateExamMutation()
  const [deleteExam] = useDeleteExamMutation()
  const [addClasses] = useAddExamClassesMutation()
  const [removeClass] = useRemoveExamClassMutation()
  const [saveSubjects] = useSaveExamSubjectsMutation()
  const [genSnapshot] = useGenerateExamSnapshotMutation()
  const [saveRollNumbers] = useSaveExamRollNumbersMutation()
  const [saveSchedule] = useSaveExamScheduleMutation()
  const [updateSchedule] = useUpdateExamScheduleMutation()
  const [deleteSchedule] = useDeleteExamScheduleMutation()
  const [deleteSubject] = useDeleteExamSubjectMutation()
  const [saveAttendance] = useSaveExamAttendanceMutation()
  const [saveMarks] = useSaveExamMarksMutation()
  const [processResults] = useProcessExamResultsMutation()
  const [publishResults] = usePublishExamResultsMutation()
  const [unlockExam] = useUnlockExamContainerMutation()
  const [importMarks] = useImportExamMarksMutation()
  const [applyGrace] = useApplyGraceMarksMutation()
  const [unlockMarks] = useUnlockExamMarksMutation()

  const examNames = settings?.examNames || []

  const sectionsForDarjah = useMemo(() => {
    if (!selectedDarjahId) return []
    const darjah = darajat.find((d) => String(d._id) === String(selectedDarjahId))
    if (!darjah?.subjectIds) return []
    const ids = darjah.subjectIds.map((s) => String(s._id || s))
    return subjects.filter((s) => ids.includes(String(s._id)))
  }, [darajat, subjects, selectedDarjahId])

  const selectedPipeline = useMemo(
    () => pipelines.find((p) => String(p.darjahId?._id || p.darjahId) === String(selectedDarjahId)),
    [pipelines, selectedDarjahId]
  )

  const selectedMapping = useMemo(
    () => (marksData?.mappings || subjectMappings).find((m) => String(m._id) === String(selectedMappingId)),
    [marksData, subjectMappings, selectedMappingId]
  )

  const resultsProcessed = selectedPipeline?.status === 'locked'
  const allClassesProcessed = pipelines.length > 0 && pipelines.every((p) => p.status === 'locked')
  const mappingLocked = Boolean(selectedMapping?.isLocked)
  const marksBySnapshotId = useMemo(() => {
    const map = new Map()
    for (const m of marksData?.marks || []) {
      map.set(String(m.studentSnapshotId?._id || m.studentSnapshotId), m)
    }
    return map
  }, [marksData])
  const hasUnlockedMarks = useMemo(
    () => [...marksBySnapshotId.values()].some((m) => m.isUnlocked || m.status === 'draft'),
    [marksBySnapshotId]
  )
  /** Subject final-submit lock: edits only after unlock (subject or student). */
  const marksEntryEditable = !mappingLocked || hasUnlockedMarks
  const hasUnpublishedResults = (resultMatrix?.rows || []).some((r) => !r.isPublished)
  const hasPublishedResults =
    ['published', 'closed'].includes(selectedExam?.status) ||
    (resultMatrix?.rows || []).some((r) => r.isPublished)

  function isMarksRowEditable(snapshotId) {
    if (!mappingLocked) return true
    const existing = marksBySnapshotId.get(String(snapshotId))
    if (!existing) return false
    return Boolean(existing.isUnlocked) || existing.status !== 'locked'
  }

  const pendingMarksSubjects = useMemo(() => {
    const maps = marksReadinessData?.mappings || subjectMappings
    const allMarks = marksReadinessData?.marks || []
    const snaps = marksReadinessData?.snapshots || snapshots
    const att = attendanceData?.attendance || []
    if (!maps.length || !snaps.length) return []

    const absentSet = new Set(
      att
        .filter((a) => ['absent', 'leave', 'medical_leave'].includes(a.status))
        .map((a) => String(a.studentSnapshotId?._id || a.studentSnapshotId))
    )
    const expectedCount = snaps.filter((s) => !absentSet.has(String(s._id))).length

    return maps
      .map((m) => {
        const submitted = allMarks.filter(
          (x) => String(x.subjectMappingId) === String(m._id) && x.status === 'submitted'
        ).length
        return {
          mapping: m,
          subjectName: loc(m.subjectId?.name, lng),
          submitted,
          expected: expectedCount,
        }
      })
      .filter((row) => row.submitted < row.expected)
  }, [marksReadinessData, subjectMappings, snapshots, attendanceData, lng])

  const marksReadyForProcess =
    pendingMarksSubjects.length === 0 && subjectMappings.length > 0 && snapshots.length > 0

  const workflowGate = useMemo(() => {
    const pipeStatuses = pipelines.map((p) => p.status)
    return getExamWorkflowGate({
      selectedExamId,
      examCount: exams.length,
      examStatus: selectedExam?.status,
      pipelineCount: pipelines.length,
      pipelinesConfigured: pipeStatuses.some((s) => s && s !== 'pending'),
      pipelinesSnapshotTaken: pipeStatuses.some((s) =>
        ['snapshot_taken', 'active', 'locked'].includes(s)
      ),
      subjectMappingCount: subjectMappings.length,
      snapshotCount: snapshots.length,
      scheduleCount: schedule.length,
      attendanceCount: attendanceData?.attendance?.length || 0,
      marksReady: marksReadyForProcess,
      resultsProcessed: resultsProcessed || allClassesProcessed,
      hasPublished: hasPublishedResults,
    })
  }, [
    selectedExamId,
    exams.length,
    selectedExam?.status,
    pipelines,
    subjectMappings.length,
    snapshots.length,
    schedule.length,
    attendanceData?.attendance?.length,
    marksReadyForProcess,
    resultsProcessed,
    allClassesProcessed,
    hasPublishedResults,
  ])

  const scheduledMappingIdSet = useMemo(() => {
    const set = new Set()
    for (const row of schedule) {
      const id = row.subjectMappingId?._id || row.subjectMappingId
      if (id) set.add(String(id))
    }
    return set
  }, [schedule])

  const availableScheduleMappings = useMemo(() => {
    if (!selectedDarjahId) return []
    return subjectMappings.filter((m) => {
      if (editingScheduleId && String(m._id) === String(scheduleForm.subjectMappingId)) return true
      return !scheduledMappingIdSet.has(String(m._id))
    })
  }, [subjectMappings, selectedDarjahId, scheduledMappingIdSet, editingScheduleId, scheduleForm.subjectMappingId])

  function formatSubjectKitabLabel(m) {
    if (!m) return '—'
    const subject = loc(m.subjectId?.name, lng) || '—'
    const book = loc(m.bookId?.title, lng)
    return book ? `${subject} — ${book}` : subject
  }

  const marksHaveUnsavedChanges = useMemo(() => {
    if (!selectedMappingId || !marksEntryEditable) return false
    const list = marksData?.snapshots || snapshots
    for (const s of list) {
      if (mappingLocked) {
        const existing = marksBySnapshotId.get(String(s._id))
        if (!existing || (!existing.isUnlocked && existing.status === 'locked')) continue
      }
      const existing = marksBySnapshotId.get(String(s._id))
      const saved = existing?.originalMarks ?? ''
      const draft = marksDraft[s._id] ?? ''
      if (String(draft) !== String(saved ?? '')) return true
    }
    return false
  }, [marksData, marksDraft, snapshots, selectedMappingId, marksEntryEditable, mappingLocked, marksBySnapshotId])

  function flash(text, tone = 'success') {
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current)
    setMsg(text)
    setMsgTone(tone)
    msgTimerRef.current = setTimeout(() => {
      setMsg('')
      setMsgTone('success')
      msgTimerRef.current = null
    }, tone === 'danger' ? 7000 : 4000)
    if (tone === 'danger' || tone === 'warning') {
      requestAnimationFrame(() => {
        document.querySelector('.exam-module .alert[role="alert"]')?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        })
      })
    }
  }

  function flashError(err, fallback = '') {
    const text =
      err?.data?.message ||
      (typeof err?.data === 'string' ? err.data : '') ||
      err?.error ||
      err?.message ||
      fallback ||
      t('common.error')
    flash(text, 'danger')
  }

  function clearExamSelection({ notify = false } = {}) {
    setSelectedExamId('')
    setSelectedDarjahId('')
    setSelectedSectionId('')
    setSelectedMappingId('')
    setTeacherFilterId('')
    setEditingScheduleId(null)
    setScheduleConflicts([])
    setSubjectForm([])
    setClassPicker([])
    setStep('containers')
    if (notify) flash(t('exam.examNotInSession'), 'warning')
  }

  const prevSessionRef = useRef(activeSessionId)
  useEffect(() => {
    if (prevSessionRef.current && String(prevSessionRef.current) !== String(activeSessionId)) {
      clearExamSelection()
    }
    prevSessionRef.current = activeSessionId
  }, [activeSessionId]) // eslint-disable-line react-hooks/exhaustive-deps -- clear only on session change

  useEffect(() => {
    if (!selectedExamId || examsLoading || examsFetching) return
    if (!selectedExam) {
      clearExamSelection({ notify: true })
    }
  }, [selectedExamId, selectedExam, examsLoading, examsFetching]) // eslint-disable-line react-hooks/exhaustive-deps

  function openNewExam() {
    setEditingExam(null)
    setExamForm({
      name: emptyLoc(),
      examTypeIndex: '',
      customExamType: emptyLoc(),
      startDate: '',
      endDate: '',
      resultPublicationDate: '',
    })
    setExamModal(true)
  }

  function openEditExam(ex) {
    setEditingExam(ex)
    const isCustom = ex.examTypeIndex == null || ex.examTypeIndex === ''
    setExamForm({
      name: ex.name || emptyLoc(),
      examTypeIndex: isCustom ? '' : String(ex.examTypeIndex),
      customExamType: isCustom ? (ex.examType || emptyLoc()) : emptyLoc(),
      startDate: ex.startDate ? new Date(ex.startDate).toISOString().slice(0, 10) : '',
      endDate: ex.endDate ? new Date(ex.endDate).toISOString().slice(0, 10) : '',
      resultPublicationDate: ex.resultPublicationDate
        ? new Date(ex.resultPublicationDate).toISOString().slice(0, 10)
        : '',
    })
    setExamModal(true)
  }

  async function handleSaveExam() {
    if (!activeSessionId) return
    if (!examForm.name.ur?.trim() && !examForm.name.en?.trim()) {
      flash(t('exam.nameRequired'))
      return
    }
    const isCustomType = examForm.examTypeIndex === ''
    const examType = isCustomType
      ? examForm.customExamType
      : examNames[Number(examForm.examTypeIndex)]
    if (isCustomType && !examType.ur?.trim() && !examType.en?.trim()) {
      flash(t('exam.customTypeRequired'))
      return
    }
    const body = {
      sessionId: activeSessionId,
      name: examForm.name,
      examType,
      examTypeIndex: isCustomType ? null : Number(examForm.examTypeIndex),
      startDate: examForm.startDate || null,
      endDate: examForm.endDate || null,
      resultPublicationDate: examForm.resultPublicationDate || null,
    }
    try {
      if (editingExam) {
        await updateExam({ examId: editingExam._id, ...body }).unwrap()
        setSelectedExamId(editingExam._id)
      } else {
        const created = await createExam(body).unwrap()
        if (created?._id) {
          setSelectedExamId(created._id)
          setStep('classes')
        }
      }
      setExamModal(false)
      refetchExams()
      flash(t('exam.saved'))
    } catch (e) {
      flashError(e)
    }
  }

  async function handleDeleteExam() {
    if (!deleteTarget) return
    const reason = deleteExamReason.trim()
    if (reason.length < 10) {
      flash(t('exam.deleteReasonTooShort'))
      return
    }
    try {
      await deleteExam({
        examId: deleteTarget._id,
        sessionId: activeSessionId,
        reason,
      }).unwrap()
      if (String(selectedExamId) === String(deleteTarget._id)) {
        clearExamSelection()
      }
      setDeleteTarget(null)
      setDeleteExamReason('')
      refetchExams()
      flash(t('exam.deleted'))
    } catch (e) {
      flashError(e)
      throw e
    }
  }

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

  function formatExamClasses(row) {
    const pipes = row.pipelines || []
    if (!pipes.length) return '—'
    return pipes
      .map((p) => {
        const name = loc(p.darjahId?.name, lng)
        const code = p.darjahId?.code ? ` (${p.darjahId.code})` : ''
        return name + code
      })
      .join(lng.startsWith('ur') ? '، ' : ', ')
  }

  async function handleAddClasses() {
    if (!examParams || !classPicker.length) return
    try {
      await addClasses({ ...examParams, darjahIds: classPicker }).unwrap()
      setClassPicker([])
      flash(t('exam.classesAdded'))
    } catch (e) {
      flashError(e)
    }
  }

  function initSubjectForm() {
    const darjah = darajat.find((d) => String(d._id) === String(selectedDarjahId))
    const assignments = darjah?.assignments || []
    const rows = assignments.length
      ? assignments.map((a) => ({
          subjectId: a.subjectId?._id || a.subjectId || '',
          bookId: a.bookId?._id || a.bookId || '',
          teacherId: a.teacherId?._id || a.teacherId || '',
          maxMarks: 100,
          passingMarks: 40,
          weightage: 100,
          examType: 'written',
        }))
      : [{ subjectId: '', bookId: '', teacherId: '', maxMarks: 100, passingMarks: 40, weightage: 100, examType: 'written' }]
    setSubjectForm(rows)
  }

  async function handleSaveSubjects() {
    if (!examParams || !selectedDarjahId) return
    if (structureFrozen) {
      flash(t('exam.structureFrozen'))
      return
    }
    try {
      await saveSubjects({
        ...examParams,
        darjahId: selectedDarjahId,
        mappings: subjectForm,
      }).unwrap()
      refetchSubjects()
      flash(t('exam.subjectsSaved'))
    } catch (e) {
      flashError(e)
    }
  }

  async function handleGenerateSnapshot() {
    if (!examParams || !selectedDarjahId) return
    if (structureFrozen) {
      flash(t('exam.structureFrozen'))
      return
    }
    try {
      await genSnapshot({ ...examParams, darjahId: selectedDarjahId }).unwrap()
      refetchSnapshot()
      flash(t('exam.snapshotGenerated'))
    } catch (e) {
      flashError(e)
    }
  }

  async function handleSaveSchedule() {
    if (!examParams || !selectedDarjahId || !scheduleForm.examDate) return
    setScheduleConflicts([])

    if (editingScheduleId) {
      if (!scheduleForm.subjectMappingId) {
        flash(t('exam.selectSubjectFirst'))
        return
      }
      const payload = {
        darjahId: selectedDarjahId,
        sectionId: selectedSectionId || null,
        subjectMappingId: scheduleForm.subjectMappingId,
        examDate: scheduleForm.examDate,
        startTime: scheduleForm.startTime,
        endTime: scheduleForm.endTime,
        room: scheduleForm.room,
        supervisorId: scheduleForm.supervisorId || null,
      }
      try {
        await updateSchedule({
          ...examParams,
          scheduleId: editingScheduleId,
          ...payload,
        }).unwrap()
        setEditingScheduleId(null)
        setScheduleForm((f) => ({
          ...f,
          subjectMappingId: '',
          subjectMappingIds: [],
        }))
        flash(t('exam.scheduleUpdated'))
      } catch (e) {
        if (e?.data?.conflicts?.length) {
          setScheduleConflicts(e.data.conflicts)
          flash(t('exam.scheduleConflict'))
        } else {
          flashError(e)
        }
      }
      return
    }

    const mappingIds = (scheduleForm.subjectMappingIds || []).filter(Boolean)
    if (!mappingIds.length) {
      flash(t('exam.selectSubjectFirst'))
      return
    }

    const entries = mappingIds.map((subjectMappingId) => ({
      darjahId: selectedDarjahId,
      sectionId: selectedSectionId || null,
      subjectMappingId,
      examDate: scheduleForm.examDate,
      startTime: scheduleForm.startTime,
      endTime: scheduleForm.endTime,
      room: scheduleForm.room,
      supervisorId: scheduleForm.supervisorId || null,
    }))

    try {
      await saveSchedule({
        ...examParams,
        entries,
      }).unwrap()
      setScheduleForm((f) => ({
        ...f,
        subjectMappingIds: [],
        subjectMappingId: '',
      }))
      flash(
        mappingIds.length > 1
          ? t('exam.scheduleSavedMany', { count: mappingIds.length })
          : t('exam.scheduleSaved')
      )
    } catch (e) {
      if (e?.data?.conflicts?.length) {
        setScheduleConflicts(e.data.conflicts)
        flash(t('exam.scheduleConflict'))
      } else {
        flashError(e)
      }
    }
  }

  async function handleDeleteSchedule() {
    if (!examParams || !deleteScheduleTarget) return
    await deleteSchedule({ ...examParams, scheduleId: deleteScheduleTarget }).unwrap()
    flash(t('exam.scheduleDeleted'))
  }

  function startEditSchedule(row) {
    setEditingScheduleId(row._id)
    setScheduleForm({
      subjectMappingIds: [],
      subjectMappingId: row.subjectMappingId?._id || row.subjectMappingId || '',
      examDate: row.examDate ? new Date(row.examDate).toISOString().slice(0, 10) : '',
      startTime: row.startTime || '09:00',
      endTime: row.endTime || '12:00',
      room: row.room || '',
      supervisorId: row.supervisorId?._id || row.supervisorId || '',
    })
  }

  function toggleScheduleMapping(mappingId) {
    const id = String(mappingId)
    setScheduleForm((f) => {
      const cur = f.subjectMappingIds || []
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
      return { ...f, subjectMappingIds: next }
    })
  }

  function selectAllAvailableScheduleMappings() {
    setScheduleForm((f) => ({
      ...f,
      subjectMappingIds: availableScheduleMappings.map((m) => String(m._id)),
    }))
  }

  function clearScheduleMappingSelection() {
    setScheduleForm((f) => ({ ...f, subjectMappingIds: [] }))
  }

  async function handleDeleteSubjectMapping() {
    if (!examParams || !selectedDarjahId || !deleteMappingTarget) return
    await deleteSubject({ ...examParams, darjahId: selectedDarjahId, mappingId: deleteMappingTarget }).unwrap()
    refetchSubjects()
    flash(t('exam.mappingDeleted'))
  }

  function addSubjectRow() {
    setSubjectForm((prev) => [
      ...prev,
      { subjectId: '', bookId: '', teacherId: '', maxMarks: 100, passingMarks: 40, weightage: 100, examType: 'written' },
    ])
  }

  async function handleRemoveClassRow(darjahId) {
    if (!examParams) return
    try {
      await removeClass({ ...examParams, darjahId }).unwrap()
      flash(t('exam.classRemoved'))
    } catch (e) {
      flashError(e)
    }
  }

  async function handleExportResults() {
    if (!examParams || !selectedDarjahId || !authToken) return
    const params = new URLSearchParams({
      sessionId: activeSessionId,
      darjahId: selectedDarjahId,
    })
    if (selectedSectionId) {
      params.set('sectionId', selectedSectionId)
    }
    try {
      const res = await fetch(`/api/exams/${selectedExamId}/export?${params}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `exam-results-${selectedDarjahId}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      flashError(e, t('common.error'))
    }
  }

  const initAttendanceDraft = useCallback(() => {
    const draft = {}
    const list = attendanceData?.snapshots?.length ? attendanceData.snapshots : snapshots
    for (const s of list) {
      const existing = attendanceData?.attendance?.find(
        (a) => String(a.studentSnapshotId?._id || a.studentSnapshotId) === String(s._id)
      )
      draft[s._id] = {
        status: existing?.status || 'present',
        salahAttendance: {
          fajr: existing?.salahAttendance?.fajr || '',
          zuhr: existing?.salahAttendance?.zuhr || '',
          asr: existing?.salahAttendance?.asr || '',
          maghrib: existing?.salahAttendance?.maghrib || '',
          isha: existing?.salahAttendance?.isha || '',
        },
      }
    }
    setAttendanceDraft(draft)
  }, [attendanceData, snapshots])

  async function handleSaveAttendance() {
    if (!examParams || !selectedDarjahId) return
    const entries = Object.entries(attendanceDraft).map(([studentSnapshotId, row]) => ({
      studentSnapshotId,
      status: typeof row === 'string' ? row : (row?.status || 'present'),
      salahAttendance: typeof row === 'object' ? (row.salahAttendance || {}) : {},
    }))
    try {
      await saveAttendance({
        ...examParams,
        darjahId: selectedDarjahId,
        sectionId: selectedSectionId || null,
        entries,
      }).unwrap()
      flash(t('exam.attendanceSaved'))
    } catch (e) {
      flashError(e)
    }
  }

  const initMarksDraft = useCallback(() => {
    const draft = {}
    const list = marksData?.snapshots || snapshots
    for (const s of list) {
      const existing = marksData?.marks?.find(
        (m) => String(m.studentSnapshotId?._id || m.studentSnapshotId) === String(s._id)
      )
      draft[s._id] = existing?.originalMarks ?? ''
    }
    setMarksDraft(draft)
  }, [marksData, snapshots])

  useEffect(() => {
    if (step === 'attendance' && (attendanceData?.snapshots?.length || snapshots.length)) {
      initAttendanceDraft()
    }
  }, [step, attendanceData, snapshots, initAttendanceDraft])

  useEffect(() => {
    if (step === 'marks' && selectedMappingId && (marksData?.snapshots?.length || snapshots.length)) {
      initMarksDraft()
    }
  }, [step, selectedMappingId, marksData, snapshots, initMarksDraft])

  useEffect(() => {
    setScheduleForm((f) => ({ ...f, subjectMappingIds: [], subjectMappingId: '' }))
    setEditingScheduleId(null)
    setScheduleConflicts([])
  }, [selectedDarjahId])

  function refreshExamViews() {
    dispatch(api.util.invalidateTags(['Exam']))
  }

  async function safeRefetch(refetchFn, isActive) {
    if (isActive) await refetchFn()
  }

  async function handleSaveMarks(submit = false) {
    if (!examParams || !selectedDarjahId || !selectedMappingId) return
    if (mappingLocked && !hasUnlockedMarks) {
      flash(t('exam.subjectLockedHint'), 'warning')
      return
    }
    const maxMarks = Number(selectedMapping?.maxMarks) || 100
    const entries = Object.entries(marksDraft)
      .filter(([studentSnapshotId]) => isMarksRowEditable(studentSnapshotId))
      .map(([studentSnapshotId, originalMarks]) => ({
        studentSnapshotId,
        originalMarks: originalMarks === '' ? null : Number(originalMarks),
      }))
    if (!entries.length) {
      flash(t('exam.subjectLockedHint'), 'warning')
      return
    }
    const overMax = entries.find(
      (e) => e.originalMarks != null && !Number.isNaN(e.originalMarks) && e.originalMarks > maxMarks
    )
    if (overMax) {
      flash(t('exam.marksExceedMax', { max: maxMarks }), 'danger')
      return
    }
    const negative = entries.find(
      (e) => e.originalMarks != null && !Number.isNaN(e.originalMarks) && e.originalMarks < 0
    )
    if (negative) {
      flash(t('exam.marksNegative'), 'danger')
      return
    }
    try {
      const res = await saveMarks({
        ...examParams,
        darjahId: selectedDarjahId,
        subjectMappingId: selectedMappingId,
        entries,
        submit,
      }).unwrap()
      refreshExamViews()
      await safeRefetch(refetchMarks, Boolean(examParams && selectedDarjahId))
      initMarksDraft()
      if (submit && res?.reprocessed) {
        flash(t('exam.marksSubmittedReprocessed'))
      } else {
        flash(submit ? t('exam.marksSubmitted') : t('exam.marksSaved'))
      }
    } catch (e) {
      flashError(e)
    }
  }

  async function handleProcessResults() {
    if (!examParams || !selectedDarjahId) return
    if (!marksReadyForProcess) {
      flash(t('exam.marksNotReady'))
      return
    }
    try {
      await processResults({ ...examParams, darjahId: selectedDarjahId }).unwrap()
      refreshExamViews()
      await safeRefetch(refetchMatrix, examParams && selectedDarjahId && ['results', 'announce'].includes(step))
      flash(t('exam.resultsProcessed'))
    } catch (e) {
      flashError(e)
      throw e
    }
  }

  function requestPublish(level) {
    if (!examParams) return
    if (level === 'class' && !selectedDarjahId) {
      flash(t('exam.selectClassFirst'))
      return
    }
    if (level === 'section' && !selectedSectionId) {
      flash(t('exam.selectSectionFirst'))
      return
    }
    if (level === 'student' && !publishStudentId) {
      flash(t('exam.selectStudentFirst'))
      return
    }
    if (level === 'exam') {
      if (!allClassesProcessed) {
        flash(t('exam.allClassesProcessFirst'))
        return
      }
    } else if (!resultsProcessed) {
      flash(t('exam.processResultsFirst'))
      return
    }
    setConfirmPublish({ level })
  }

  async function handlePublish() {
    if (!examParams || !confirmPublish) return
    const { level } = confirmPublish
    try {
      await publishResults({
        ...examParams,
        level,
        targetId:
          level === 'class'
            ? selectedDarjahId
            : level === 'section'
              ? selectedSectionId
              : level === 'student'
                ? publishStudentId
                : null,
      }).unwrap()
      refreshExamViews()
      await safeRefetch(refetchMatrix, examParams && selectedDarjahId && ['results', 'announce'].includes(step))
      flash(t('exam.resultsPublished'))
    } catch (e) {
      flashError(e)
      throw e
    }
  }

  async function handleUnlockExam() {
    if (!examParams || !unlockReason.trim()) return
    try {
      await unlockExam({ ...examParams, reason: unlockReason.trim() }).unwrap()
      refetchExams()
      flash(t('exam.unlocked'))
    } catch (e) {
      flashError(e)
      throw e
    }
  }

  async function handleUnlockMarks() {
    if (!examParams || !unlockModal || !unlockReason.trim()) return
    const { scope, targetId } = unlockModal
    try {
      await unlockMarks({
        ...examParams,
        scope,
        targetId,
        reason: unlockReason.trim(),
      }).unwrap()
      await refreshExamViews()
      flash(scope === 'subject' ? t('exam.subjectUnlocked') : t('exam.studentUnlocked'))
    } catch (e) {
      flashError(e)
      throw e
    }
  }

  function openUnlockModal(scope, targetId) {
    setUnlockReason('')
    setUnlockModal({ scope, targetId })
  }

  function closeUnlockModal() {
    setUnlockModal(null)
    setUnlockReason('')
  }

  async function handleUnlockSubmit() {
    if (unlockModal?.scope === 'exam') {
      await handleUnlockExam()
    } else {
      await handleUnlockMarks()
    }
  }

  const examIsLocked = selectedExam?.isLocked || ['published', 'closed'].includes(selectedExam?.status)
  const structureFrozen = examIsLocked || ['marks_entry', 'processing'].includes(selectedExam?.status)

  async function handleImportMarks(file) {
    if (!examParams || !selectedDarjahId || !selectedMappingId || !file) return
    const fd = new FormData()
    fd.append('file', file)
    fd.append('darjahId', selectedDarjahId)
    fd.append('subjectMappingId', selectedMappingId)
    fd.append('sessionId', activeSessionId)
    try {
      const res = await importMarks({ examId: selectedExamId, formData: fd, sessionId: activeSessionId }).unwrap()
      await refreshExamViews()
      initMarksDraft()
      const errDetail = res.errors?.length ? ` — ${res.errors.map((x) => x.key).join(', ')}` : ''
      const reprocessedNote = res.reprocessed ? ` ${t('exam.resultsReprocessedNote')}` : ''
      flash(t('exam.importDone', { n: res.imported, f: res.failed }) + errDetail + reprocessedNote)
    } catch (e) {
      flashError(e)
    }
  }

  async function handleApplyGrace() {
    if (!examParams || !graceTarget || !selectedDarjahId || !selectedMappingId) return
    if (!graceForm.reason.trim()) {
      flash(t('exam.graceReasonRequired'))
      return
    }
    try {
      await applyGrace({
        ...examParams,
        darjahId: selectedDarjahId,
        subjectMappingId: selectedMappingId,
        studentSnapshotId: graceTarget._id,
        graceMarks: Number(graceForm.graceMarks) || 0,
        reason: graceForm.reason.trim(),
      }).unwrap()
      setGraceTarget(null)
      setGraceForm({ graceMarks: '', reason: '' })
      await refreshExamViews()
      flash(t('exam.graceApplied'))
    } catch (e) {
      flashError(e)
    }
  }

  async function handleSaveRolls(entries) {
    if (!examParams || !selectedDarjahId) return
    setRollSaving(true)
    try {
      await saveRollNumbers({
        ...examParams,
        darjahId: selectedDarjahId,
        sectionId: selectedSectionId || null,
        entries,
      }).unwrap()
      refetchSnapshot()
      flash(t('exam.rollSaved'))
    } catch (e) {
      flashError(e)
    } finally {
      setRollSaving(false)
    }
  }

  async function handleAutoRolls(autoAssign) {
    if (!examParams || !selectedDarjahId) return
    setRollSaving(true)
    try {
      await saveRollNumbers({
        ...examParams,
        darjahId: selectedDarjahId,
        sectionId: selectedSectionId || null,
        autoAssign,
      }).unwrap()
      refetchSnapshot()
      flash(t('exam.rollAutoDone'))
    } catch (e) {
      flashError(e)
    } finally {
      setRollSaving(false)
    }
  }

  /** @param {'cards'|'roll'|'namaz'} [mode] */
  function openPrintCards(studentSnapshotId, mode = 'cards') {
    if (!activeSessionId || !selectedExamId) return
    if (!selectedDarjahId) {
      flash(t('exam.selectClassFirst'))
      return
    }
    const q = new URLSearchParams({
      sessionId: activeSessionId,
      examId: selectedExamId,
      darjahId: selectedDarjahId,
      mode,
      fromStep: step,
      fromView: 'admin',
    })
    if (selectedSectionId) q.set('sectionId', selectedSectionId)
    if (studentSnapshotId) q.set('studentSnapshotId', studentSnapshotId)
    navigate(`/exams/print?${q}`)
  }

  function openStudentIdPrint(studentSnapshotId) {
    const snap = snapshots.find((s) => String(s._id) === String(studentSnapshotId))
    const sid = snap?.studentId?._id || snap?.studentId
    if (!sid) {
      flash(t('exam.printStudentCardMissing'))
      return
    }
    window.open(`/students/${sid}/print`, '_blank', 'noopener,noreferrer')
  }

  const needsClass = !['containers'].includes(step)
  const needsSection = ['classes', 'subjects', 'attendance', 'schedule', 'snapshot', 'marks', 'results', 'announce'].includes(step)

  const stepLabels = useMemo(() => {
    const nums = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']
    const keys = [
      'containers', 'classes', 'subjects', 'snapshot', 'schedule',
      'attendance', 'marks', 'results', 'announce', 'analytics', 'audit',
    ]
    const labels = {
      containers: t('exam.step.containers'),
      classes: t('exam.step.classes'),
      subjects: t('exam.step.subjects'),
      snapshot: t('exam.step.snapshot'),
      schedule: t('exam.step.schedule'),
      attendance: t('exam.step.attendance'),
      marks: t('exam.step.marks'),
      results: t('exam.step.results'),
      announce: t('exam.step.announce'),
      analytics: t('exam.step.analytics'),
      audit: t('exam.step.audit'),
    }
    return Object.fromEntries(keys.map((k, i) => [k, { num: nums[i], label: labels[k] }]))
  }, [t])

  // Keep URL in sync so print "Back" restores this exact step + filters.
  // Class/department only belong on steps that use the context bar — not on containers.
  useEffect(() => {
    const q = new URLSearchParams()
    if (step) q.set('step', step)
    if (selectedExamId) q.set('examId', selectedExamId)
    if (needsClass && selectedDarjahId) q.set('darjahId', selectedDarjahId)
    if (needsSection && selectedSectionId) q.set('sectionId', selectedSectionId)
    const next = q.toString()
    if (next !== searchParams.toString()) {
      setSearchParams(q, { replace: true })
    }
  }, [step, selectedExamId, selectedDarjahId, selectedSectionId, needsClass, needsSection]) // eslint-disable-line react-hooks/exhaustive-deps -- intentional; avoid loop on searchParams

  useEffect(() => {
    if (workflowGate.enabled[step] === false) {
      setStep(workflowGate.maxEnabledStep)
    }
  }, [step, workflowGate])

  function handleWorkflowStepChange(next) {
    if (workflowGate.enabled[next] === false) {
      flash(t('exam.stepLockedHint'), 'warning')
      return
    }
    // Opening class pipeline (or later) without a selection — use the first exam.
    if (next !== 'containers' && !selectedExamId && exams[0]?._id) {
      setSelectedExamId(exams[0]._id)
    }
    setStep(next)
  }

  function handleDashCardClick(stepKey) {
    if (workflowGate.enabled[stepKey] === false) {
      setStep(workflowGate.maxEnabledStep)
      flash(t('exam.stepLockedHint'), 'warning')
    } else {
      if (stepKey !== 'containers' && !selectedExamId && exams[0]?._id) {
        setSelectedExamId(exams[0]._id)
      }
      setStep(stepKey)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!activeSessionId) {
    return (
      <div>
        <PageHeading title={t('exam.title')} subtitle={t('exam.subtitle')} />
        <div className="alert alert-warning">{t('exam.selectSession')}</div>
      </div>
    )
  }


  return (
    <div className="exam-module">
      <PageHeading title={t('exam.title')} subtitle={t('exam.subtitle')} />

      <ExamDashboardCards stats={dashStats} loading={dashLoading} onCardClick={handleDashCardClick} />

      {msg && (
        <div
          className={`alert alert-${msgTone === 'danger' ? 'danger' : msgTone === 'warning' ? 'warning' : 'success'} py-2 mb-3`}
          role="alert"
        >
          {msg}
        </div>
      )}

      <ExamPhaseStepper
        step={step}
        onStepChange={handleWorkflowStepChange}
        stepLabels={stepLabels}
        enabledSteps={workflowGate.enabled}
        doneSteps={workflowGate.done}
      />

      {step !== 'containers' && (
        <ExamContextBar
          lng={lng}
          exams={exams}
          pipelines={pipelines}
          subjects={subjects}
          darajat={darajat}
          selectedExamId={selectedExamId}
          selectedDarjahId={selectedDarjahId}
          selectedSectionId={selectedSectionId}
          onExamChange={(id) => {
            setSelectedExamId(id)
            setSelectedDarjahId('')
            setSelectedSectionId('')
            setSelectedMappingId('')
          }}
          onClassChange={(id) => {
            setSelectedDarjahId(id)
            setSelectedMappingId('')
          }}
          onSectionChange={setSelectedSectionId}
          selectedExam={selectedExam}
          showClass={needsClass}
          showSection={needsSection}
        />
      )}

      {/* STEP 1: Exam Containers */}
      {step === 'containers' && (
        <div className="exam-step-box">
          <p className="exam-step-box__lead">{t('exam.flowGuide')}</p>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold mb-0">{t('exam.step.containers')}</h2>
            <button type="button" className="btn btn-primary btn-sm" onClick={openNewExam}>
              + {t('exam.newExam')}
            </button>
          </div>
          <DataTable
            isLoading={examsLoading}
            columns={[
              col(t('exam.col.name'), (r) => loc(r.name, lng)),
              col(t('exam.col.type'), (r) => loc(r.examType, lng) || '—'),
              col(t('exam.col.class'), (r) => formatExamClasses(r)),
              col(t('exam.col.start'), (r) => formatDisplayDate(r.startDate, lng, mode)),
              col(t('exam.col.end'), (r) => formatDisplayDate(r.endDate, lng, mode)),
              col(t('exam.col.status'), (r) => <ExamStatusBadge status={r.status} lng={lng} />),
              col(t('exam.col.actions'), (r) => (
                <div className="flex gap-1 flex-wrap">
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => openEditExam(r)}>
                    {t('common.edit')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => {
                      setSelectedExamId(r._id)
                      setStep('classes')
                    }}
                  >
                    {t('exam.configure')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => {
                      setDeleteExamReason('')
                      setDeleteTarget(r)
                    }}
                  >
                    {t('common.delete')}
                  </button>
                </div>
              )),
            ]}
            rows={exams}
          />
        </div>
      )}

      {/* STEP 2: Class Pipelines */}
      {step === 'classes' && selectedExamId && (
        <div className="exam-step-box">
          <ExamStepHeader title={`${t('exam.step.classes')} — ${loc(selectedExam?.name, lng)}`} />
          {examIsLocked && (
            <div className="alert alert-warning d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
              <span>{t('exam.lockedBanner')}</span>
              <button type="button" className="btn btn-warning btn-sm" onClick={() => openUnlockModal('exam')}>
                {t('exam.unlockExam')}
              </button>
            </div>
          )}
          {!structureFrozen && (
          <div className="mb-4 p-3 border rounded">
            <label className="form-label">{t('exam.addClasses')}</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {darajat
                .filter((d) => !pipelines.some((p) => String(p.darjahId?._id || p.darjahId) === String(d._id)))
                .map((d) => (
                  <AppCheckbox
                    key={d._id}
                    id={`class-pick-${d._id}`}
                    size="sm"
                    className="text-sm"
                    label={loc(d.name, lng)}
                    checked={classPicker.includes(d._id)}
                    onChange={(e) =>
                      setClassPicker((prev) =>
                        e.target.checked ? [...prev, d._id] : prev.filter((id) => id !== d._id)
                      )
                    }
                  />
                ))}
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleAddClasses} disabled={!classPicker.length}>
              {t('exam.addSelectedClasses')}
            </button>
          </div>
          )}
          {structureFrozen && !examIsLocked && (
            <div className="alert alert-info mb-3">{t('exam.structureFrozen')}</div>
          )}
          <DataTable
            columns={[
              col(t('exam.col.class'), (r) => loc(r.darjahId?.name, lng)),
              col(t('exam.col.code'), (r) => r.darjahId?.code || '—'),
              col(t('exam.col.status'), (r) => <ExamStatusBadge status={r.status} lng={lng} />),
              col(t('exam.col.actions'), (r) => (
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  disabled={!!r.marksEntryStartedAt}
                  onClick={() => handleRemoveClassRow(r.darjahId?._id || r.darjahId)}
                >
                  {t('exam.remove')}
                </button>
              )),
            ]}
            rows={pipelines}
          />
        </div>
      )}

      {/* STEP 3: Subject Mapping */}
      {step === 'subjects' && selectedExamId && selectedDarjahId && (
        <div className="exam-step-box">
          {structureFrozen && (
            <div className="alert alert-info mb-3">{t('exam.structureFrozen')}</div>
          )}
          <ExamStepHeader
            title={t('exam.step.subjects')}
            actions={
              <>
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={initSubjectForm} disabled={structureFrozen}>
                  {t('exam.loadFromDarjah')}
                </button>
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={addSubjectRow} disabled={structureFrozen}>
                  {t('exam.addSubjectRow')}
                </button>
                <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveSubjects} disabled={structureFrozen}>
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
                  {(subjectForm.length ? subjectForm : subjectMappings).map((row, idx) => (
                    <tr key={row._id || idx} className="data-table__row">
                      <td className="data-table__td">
                        <AppSelect
                          className="w-100"
                          value={row.subjectId?._id || row.subjectId || ''}
                          disabled={row.isLocked}
                          onChange={(e) => {
                            const v = [...(subjectForm.length ? subjectForm : subjectMappings)]
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
                            const v = [...(subjectForm.length ? subjectForm : subjectMappings)]
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
                            const v = [...(subjectForm.length ? subjectForm : subjectMappings)]
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
                            const v = [...(subjectForm.length ? subjectForm : subjectMappings)]
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
                            const v = [...(subjectForm.length ? subjectForm : subjectMappings)]
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
                            const v = [...(subjectForm.length ? subjectForm : subjectMappings)]
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
                            const v = [...(subjectForm.length ? subjectForm : subjectMappings)]
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
                              onClick={() => setDeleteMappingTarget(row._id)}
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
      )}

      {/* STEP 4: Student Snapshot */}
      {step === 'snapshot' && selectedExamId && selectedDarjahId && (
        <div className="exam-step-box">
          <ExamStepHeader title={t('exam.step.snapshot')} hint={t('exam.snapshotLead')} />
          {structureFrozen && (
            <div className="alert alert-info mb-3">{t('exam.structureFrozen')}</div>
          )}
          <div className="flex flex-wrap gap-2 mb-3">
            <button type="button" className="btn btn-primary btn-sm" onClick={handleGenerateSnapshot} disabled={structureFrozen}>
              {t('exam.generateSnapshot')}
            </button>
          </div>
          <ExamRollAssignPanel
            lng={lng}
            snapshots={snapshots}
            sectionFilter={selectedSectionId}
            onSaveRolls={handleSaveRolls}
            onAutoAssign={handleAutoRolls}
            saving={rollSaving}
          />
        </div>
      )}

      {/* STEP 5: Date Sheet */}
      {step === 'schedule' && selectedExamId && (
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
                        onClick={selectAllAvailableScheduleMappings}
                      >
                        {t('exam.scheduleSelectAll')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        disabled={!scheduleForm.subjectMappingIds?.length}
                        onClick={clearScheduleMappingSelection}
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
                              onChange={() => toggleScheduleMapping(id)}
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
                    onClick={handleSaveSchedule}
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
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => startEditSchedule(r)}>
                    {t('common.edit')}
                  </button>
                  <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setDeleteScheduleTarget(r._id)}>
                    {t('common.delete')}
                  </button>
                </div>
              )),
            ]}
            rows={schedule}
          />
        </div>
      )}

      {/* STEP 6: Attendance */}
      {step === 'attendance' && selectedExamId && selectedDarjahId && (
        <div className="exam-step-box">
          <ExamStepHeader
            title={t('exam.step.attendance')}
            hint={t('exam.attendanceLead')}
            actions={
              <>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => openPrintCards(undefined, 'namaz')}
                >
                  {t('exam.printNamazSheet')}
                </button>
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={initAttendanceDraft}>
                  {t('exam.loadAttendance')}
                </button>
                <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveAttendance}>
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
                {(attendanceData?.snapshots?.length ? attendanceData.snapshots : snapshots).map((r) => {
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
      )}

      {/* STEP 7: Marks Entry */}
      {step === 'marks' && selectedExamId && selectedDarjahId && (
        <div className="exam-step-box">
          {mappingLocked && (
            <div className="alert alert-warning py-2 mb-3">
              {t('exam.subjectLockedHint')}
              {selectedMappingId && (
                <button
                  type="button"
                  className="btn btn-outline-warning btn-sm ms-2"
                  onClick={() => openUnlockModal('subject', selectedMappingId)}
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
                  if (f) handleImportMarks(f)
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
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={initMarksDraft}>
                {t('exam.loadMarks')}
              </button>
              <button
                type="button"
                className="btn btn-outline-warning btn-sm"
                disabled={!selectedMappingId}
                onClick={() => openUnlockModal('subject', selectedMappingId)}
              >
                {t('exam.unlockSubject')}
              </button>
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                disabled={!selectedMappingId || !marksEntryEditable}
                title={!marksEntryEditable ? t('exam.subjectLockedHint') : ''}
                onClick={() => handleSaveMarks(false)}
              >
                {t('exam.saveDraft')}
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={!selectedMappingId || !marksEntryEditable}
                title={!marksEntryEditable ? t('exam.subjectLockedHint') : ''}
                onClick={() => handleSaveMarks(true)}
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
                      onClick={() => {
                        setGraceTarget(r)
                        setGraceForm({ graceMarks: '', reason: '' })
                      }}
                    >
                      {t('exam.grace')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-warning btn-sm"
                      onClick={() => openUnlockModal('student', r._id)}
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
      )}

      {step === 'results' && selectedExamId && (
        <div className="exam-step-box">
          <ExamStepHeader title={t('exam.step.results')} hint={t('exam.resultsLead')} />
          {selectedDarjahId && pendingMarksSubjects.length > 0 && (
            <div className="alert alert-warning mb-3">
              <p className="mb-2">{t('exam.marksNotReady')}</p>
              <ul className="mb-0 ps-3">
                {pendingMarksSubjects.map((row) => (
                  <li key={row.mapping._id}>
                    {t('exam.pendingMarksDetail', {
                      subject: row.subjectName,
                      submitted: row.submitted,
                      expected: row.expected,
                    })}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap gap-2 mb-3 exam-results-actions">
            {selectedDarjahId && (
              <>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={!marksReadyForProcess}
                  title={!marksReadyForProcess ? t('exam.marksNotReady') : undefined}
                  onClick={() => setConfirmProcessOpen(true)}
                >
                  {t('exam.processResults')}
                </button>
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleExportResults}>
                  {t('exam.exportCsv')}
                </button>
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => openPrintCards(undefined, 'cards')}>
                  {t('exam.printBulk')}
                </button>
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => openPrintCards(undefined, 'roll')}>
                  {t('exam.printRollSheet')}
                </button>
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => openPrintCards(undefined, 'namaz')}>
                  {t('exam.printNamazSheet')}
                </button>
              </>
            )}
          </div>
          {selectedDarjahId && sectionsForDarjah.length > 0 && (
            <div className="exam-segment">
              <button
                type="button"
                className={`btn btn-sm ${!selectedSectionId ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setSelectedSectionId('')}
              >
                {t('exam.combined')}
              </button>
              {sectionsForDarjah.map((s) => (
                <button
                  key={s._id}
                  type="button"
                  className={`btn btn-sm ${selectedSectionId === s._id ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setSelectedSectionId(s._id)}
                >
                  {loc(s.name, lng)}
                </button>
              ))}
            </div>
          )}
          {selectedDarjahId ? (
            matrixLoading ? (
              <p className="text-secondary">{t('common.loading')}</p>
            ) : (
              <ExamResultMatrix data={resultMatrix} lng={lng} />
            )
          ) : (
            <p className="text-secondary">{t('exam.selectClassForMatrix')}</p>
          )}
        </div>
      )}

      {step === 'announce' && selectedExamId && (
        <div className="exam-step-box">
          <ExamStepHeader title={t('exam.step.announce')} hint={t('exam.announceLead')} />
          <ExamAnnouncePanel
            lng={lng}
            snapshots={snapshots}
            publishStudentId={publishStudentId}
            onPublishStudentChange={setPublishStudentId}
            onPublish={requestPublish}
            onPrintBulk={() => openPrintCards(undefined, 'cards')}
            onPrintSingle={() => openPrintCards(publishStudentId, 'cards')}
            onPrintRoll={() => openPrintCards(undefined, 'roll')}
            onPrintNamaz={() => openPrintCards(undefined, 'namaz')}
            onPrintStudentCard={() => openStudentIdPrint(publishStudentId)}
            selectedDarjahId={selectedDarjahId}
            selectedSectionId={selectedSectionId}
            resultsProcessed={resultsProcessed}
            allClassesProcessed={allClassesProcessed}
            hasUnpublishedResults={hasUnpublishedResults}
            onProcessResults={() => setConfirmProcessOpen(true)}
          />
        </div>
      )}

      {step === 'audit' && selectedExamId && (
        <div className="exam-step-box">
          <ExamStepHeader title={t('exam.step.audit')} hint={t('exam.auditHint')} />
          <ExamAuditPanel logs={auditLogs} loading={auditLoading} />
        </div>
      )}

      {/* Analytics */}
      {step === 'analytics' && selectedExamId && analytics && (
        <div className="exam-step-box">
          <ExamStepHeader title={t('exam.step.analytics')} />
          <AppKpiCards
            items={[
              { key: 'students', value: analytics.summary?.totalStudents ?? 0, label: t('exam.analytics.students'), tone: 'teal' },
              { key: 'avg', value: `${analytics.summary?.avgPercentage ?? 0}%`, label: t('exam.analytics.avgPct'), tone: 'blue' },
              { key: 'pass', value: `${analytics.summary?.passRate ?? 0}%`, label: t('exam.analytics.passRate'), tone: 'emerald' },
              { key: 'fail', value: analytics.summary?.failCount ?? 0, label: t('exam.analytics.failures'), tone: 'rose' },
            ]}
          />
          {analytics.classPerformance?.length > 0 && (
            <div className="exam-analytics-chart mb-4" style={{ height: '16rem' }}>
              <h3 className="exam-analytics-chart__title">{t('exam.analytics.classPerf')}</h3>
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={analytics.classPerformance.map((c) => ({
                  name: darajat.find((d) => String(d._id) === String(c.darjahId))?.code || c.darjahId?.slice(-4),
                  avg: c.avgPercentage,
                  pass: c.passRate,
                }))}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avg" fill={CHART_COL[0]} name={t('exam.analytics.avgPct')} />
                  <Bar dataKey="pass" fill={CHART_COL[1]} name={t('exam.analytics.passRate')} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {analytics.weakSubjects?.length > 0 && (
            <div className="exam-analytics-list">
              <h3 className="exam-analytics-chart__title">{t('exam.analytics.weakSubjects')}</h3>
              <ul>
                {analytics.weakSubjects.map((ws) => (
                  <li key={ws.subjectId}>
                    {loc(subjects.find((s) => String(s._id) === String(ws.subjectId))?.name, lng) || ws.subjectId}
                    {' — '}{t('exam.analytics.passRate')}: {ws.passRate}%
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {graceTarget && (
        <AppModalShell onClose={() => setGraceTarget(null)} title={t('exam.graceTitle')}>
          <form
            className="modal-app-form"
            onSubmit={(e) => {
              e.preventDefault()
              handleApplyGrace()
            }}
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
                    required
                  />
                </FormField>
              </div>
              <div className="mb-2">
                <FormField label={t('exam.audit.reason')} htmlFor="grace-reason">
                  <AppInput
                    id="grace-reason"
                    type="text"
                    value={graceForm.reason}
                    onChange={(e) => setGraceForm((f) => ({ ...f, reason: e.target.value }))}
                    required
                  />
                </FormField>
              </div>
            </div>
            <div className="modal-app-footer d-flex flex-wrap gap-2 justify-content-end">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setGraceTarget(null)}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn btn-primary">{t('common.save')}</button>
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
              handleSaveExam()
            }}
          >
            <div className="modal-app-body">
              <FormRow className="app-form-row--2">
                <FormField k="examNameUr" htmlFor="ex-u" langField="ur" col={6}>
                  <AppInput
                    id="ex-u"
                    value={examForm.name.ur}
                    onChange={(e) => setExamForm((f) => ({ ...f, name: { ...f.name, ur: e.target.value } }))}
                    dir="rtl"
                  />
                </FormField>
                <FormField k="examNameEn" htmlFor="ex-e" langField="en" col={6}>
                  <AppInput
                    id="ex-e"
                    latin
                    value={examForm.name.en}
                    onChange={(e) => setExamForm((f) => ({ ...f, name: { ...f.name, en: e.target.value } }))}
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
                  <AppDateInput id="ex-start" value={examForm.startDate} onChange={(v) => setExamForm((f) => ({ ...f, startDate: v }))} />
                </FormField>
                <FormField label={t('exam.col.end')} htmlFor="ex-end" col={6}>
                  <AppDateInput id="ex-end" value={examForm.endDate} onChange={(v) => setExamForm((f) => ({ ...f, endDate: v }))} />
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
              <button type="submit" className="btn btn-primary">
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
              handleDeleteExam().then(() => {}).catch(() => {})
            }}
          >
            <div className="modal-app-body">
              <p className="small text-secondary mb-2">
                {t('exam.confirmDelete', { name: loc(deleteTarget.name, lng) })}
              </p>
              <p className="small text-danger mb-2">{t('exam.deleteCascadeNote')}</p>
              <p className="small text-secondary mb-2">{t('exam.deleteAuditNote')}</p>
              <FormField label={t('exam.deleteReasonLabel')} htmlFor="delete-exam-reason">
                <AppInput
                  id="delete-exam-reason"
                  type="text"
                  value={deleteExamReason}
                  onChange={(e) => setDeleteExamReason(e.target.value)}
                  placeholder={t('exam.deleteReasonPlaceholder')}
                  required
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
                disabled={deleteExamReason.trim().length < 10}
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
        onConfirm={handleDeleteSchedule}
      />

      <ConfirmDeleteModal
        open={!!deleteMappingTarget}
        title={t('common.confirmDeleteTitle')}
        message={t('exam.confirmDeleteMapping')}
        onClose={() => setDeleteMappingTarget(null)}
        onConfirm={handleDeleteSubjectMapping}
      />

      <ConfirmActionModal
        open={confirmProcessOpen}
        title={t('exam.processResults')}
        message={t('exam.confirmProcessResults')}
        confirmLabel={t('exam.processResults')}
        onClose={() => setConfirmProcessOpen(false)}
        onConfirm={handleProcessResults}
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
        onConfirm={handlePublish}
      />

      {unlockModal && (
        <AppModalShell
          onClose={closeUnlockModal}
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
              handleUnlockSubmit().then(() => closeUnlockModal()).catch(() => {})
            }}
          >
            <div className="modal-app-body">
              <FormField label={t('exam.unlockReasonPrompt')} htmlFor="unlock-reason">
                <AppInput
                  id="unlock-reason"
                  type="text"
                  value={unlockReason}
                  onChange={(e) => setUnlockReason(e.target.value)}
                  required
                  autoFocus
                />
              </FormField>
            </div>
            <div className="modal-app-footer d-flex flex-wrap gap-2 justify-content-end">
              <button type="button" className="btn btn-outline-secondary" onClick={closeUnlockModal}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn btn-warning" disabled={!unlockReason.trim()}>
                {t('common.confirm')}
              </button>
            </div>
          </form>
        </AppModalShell>
      )}
    </div>
  )
}
