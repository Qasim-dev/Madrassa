import { useMemo, useState, useCallback, useRef, useEffect, lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
import { useCalendarMode } from '../app/calendarMode'
import {
  EXAM_WORKFLOW_STEPS,
  getExamWorkflowGate,
} from '../shared/examEnums'
import { useFormValidation, compose, required, minLength, examFormSchema } from '../shared/validation'
import ExamContextBar from '../components/exam/ExamContextBar'
import ExamPhaseStepper from '../components/exam/ExamPhaseStepper'
import PageHeading from '../components/PageHeading'
import ExamDashboardCards from '../components/exam/ExamDashboardCards'
import './examDashboard.css'

const ExamContainersStep = lazy(() => import('./exam/ExamContainersStep'))
const ExamClassesStep = lazy(() => import('./exam/ExamClassesStep'))
const ExamSubjectsStep = lazy(() => import('./exam/ExamSubjectsStep'))
const ExamSnapshotStep = lazy(() => import('./exam/ExamSnapshotStep'))
const ExamScheduleStep = lazy(() => import('./exam/ExamScheduleStep'))
const ExamAttendanceStep = lazy(() => import('./exam/ExamAttendanceStep'))
const ExamMarksStep = lazy(() => import('./exam/ExamMarksStep'))
const ExamResultsStep = lazy(() => import('./exam/ExamResultsStep'))
const ExamAnnounceStep = lazy(() => import('./exam/ExamAnnounceStep'))
const ExamAuditStep = lazy(() => import('./exam/ExamAuditStep'))
const ExamAnalyticsStep = lazy(() => import('./exam/ExamAnalyticsStep'))
const ExamPageModals = lazy(() => import('./exam/ExamPageModals'))

const emptyLoc = () => ({ ur: '', en: '' })

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
    { skip: !scopedExamParams || !selectedDarjahId || !['attendance', 'results', 'marks'].includes(step) }
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
    { skip: !scopedExamParams || !selectedDarjahId || step !== 'marks' }
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

  const [createExam, { isLoading: creatingExam }] = useCreateExamMutation()
  const [updateExam, { isLoading: updatingExam }] = useUpdateExamMutation()
  const [deleteExam, { isLoading: deletingExam }] = useDeleteExamMutation()
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
  const [unlockExam, { isLoading: unlockingExam }] = useUnlockExamContainerMutation()
  const [importMarks] = useImportExamMarksMutation()
  const [applyGrace, { isLoading: applyingGrace }] = useApplyGraceMarksMutation()
  const [unlockMarks, { isLoading: unlockingMarks }] = useUnlockExamMarksMutation()
  const savingExam = creatingExam || updatingExam
  const savingUnlock = unlockingExam || unlockingMarks

  const examValidation = useFormValidation({
    schema: examFormSchema,
    t,
    fieldIds: { 'name.ur': 'ex-u', endDate: 'ex-end' },
    order: ['name.ur', 'endDate'],
  })
  const graceValidation = useFormValidation({
    schema: { reason: required('validation.required') },
    t,
    fieldIds: { reason: 'grace-reason' },
    order: ['reason'],
  })
  const deleteExamValidation = useFormValidation({
    schema: { reason: compose(required('validation.required'), minLength(10)) },
    t,
    fieldIds: { reason: 'delete-exam-reason' },
    order: ['reason'],
  })
  const unlockValidation = useFormValidation({
    schema: { reason: required('validation.required') },
    t,
    fieldIds: { reason: 'unlock-reason' },
    order: ['reason'],
  })

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
    examValidation.setErrors({})
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
    examValidation.setErrors({})
    setExamModal(true)
  }

  async function handleSaveExam() {
    if (!activeSessionId) return
    const nextErrors = examValidation.validateAll(examForm)
    if (Object.keys(nextErrors).length) {
      examValidation.focusInvalid(nextErrors)
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
      examValidation.applyApiError(e)
      flashError(e)
    }
  }

  async function handleDeleteExam() {
    if (!deleteTarget) return
    const values = { reason: deleteExamReason.trim() }
    const nextErrors = deleteExamValidation.validateAll(values)
    if (Object.keys(nextErrors).length) {
      deleteExamValidation.focusInvalid(nextErrors)
      throw new Error('validation')
    }
    try {
      await deleteExam({
        examId: deleteTarget._id,
        sessionId: activeSessionId,
        reason: values.reason,
      }).unwrap()
      if (String(selectedExamId) === String(deleteTarget._id)) {
        clearExamSelection()
      }
      setDeleteTarget(null)
      setDeleteExamReason('')
      deleteExamValidation.setErrors({})
      refetchExams()
      flash(t('exam.deleted'))
    } catch (e) {
      deleteExamValidation.applyApiError(e)
      flashError(e)
      throw e
    }
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
    if (!examParams) return
    const values = { reason: unlockReason.trim() }
    const nextErrors = unlockValidation.validateAll(values)
    if (Object.keys(nextErrors).length) {
      unlockValidation.focusInvalid(nextErrors)
      throw new Error('validation')
    }
    try {
      await unlockExam({ ...examParams, reason: values.reason }).unwrap()
      refetchExams()
      flash(t('exam.unlocked'))
    } catch (e) {
      unlockValidation.applyApiError(e)
      flashError(e)
      throw e
    }
  }

  async function handleUnlockMarks() {
    if (!examParams || !unlockModal) return
    const values = { reason: unlockReason.trim() }
    const nextErrors = unlockValidation.validateAll(values)
    if (Object.keys(nextErrors).length) {
      unlockValidation.focusInvalid(nextErrors)
      throw new Error('validation')
    }
    const { scope, targetId } = unlockModal
    try {
      await unlockMarks({
        ...examParams,
        scope,
        targetId,
        reason: values.reason,
      }).unwrap()
      await refreshExamViews()
      flash(scope === 'subject' ? t('exam.subjectUnlocked') : t('exam.studentUnlocked'))
    } catch (e) {
      unlockValidation.applyApiError(e)
      flashError(e)
      throw e
    }
  }

  function openUnlockModal(scope, targetId) {
    setUnlockReason('')
    unlockValidation.setErrors({})
    setUnlockModal({ scope, targetId })
  }

  function closeUnlockModal() {
    setUnlockModal(null)
    setUnlockReason('')
    unlockValidation.setErrors({})
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
    const nextErrors = graceValidation.validateAll(graceForm)
    if (Object.keys(nextErrors).length) {
      graceValidation.focusInvalid(nextErrors)
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
      graceValidation.setErrors({})
      await refreshExamViews()
      flash(t('exam.graceApplied'))
    } catch (e) {
      graceValidation.applyApiError(e)
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


      <Suspense fallback={<p className="text-secondary py-3">{t('common.loading')}</p>}>
        {step === 'containers' && (
          <ExamContainersStep
            lng={lng}
            mode={mode}
            exams={exams}
            examsLoading={examsLoading}
            onNewExam={openNewExam}
            onEditExam={openEditExam}
            onConfigureExam={(id) => {
              setSelectedExamId(id)
              setStep('classes')
            }}
            onDeleteExam={(r) => {
              setDeleteExamReason('')
              deleteExamValidation.setErrors({})
              setDeleteTarget(r)
            }}
          />
        )}

        {step === 'classes' && selectedExamId && (
          <ExamClassesStep
            lng={lng}
            selectedExam={selectedExam}
            examIsLocked={examIsLocked}
            structureFrozen={structureFrozen}
            darajat={darajat}
            pipelines={pipelines}
            classPicker={classPicker}
            setClassPicker={setClassPicker}
            onAddClasses={handleAddClasses}
            onRemoveClass={handleRemoveClassRow}
            onUnlockExam={() => openUnlockModal('exam')}
          />
        )}

        {step === 'subjects' && selectedExamId && selectedDarjahId && (
          <ExamSubjectsStep
            lng={lng}
            structureFrozen={structureFrozen}
            selectedDarjahId={selectedDarjahId}
            subjectForm={subjectForm}
            setSubjectForm={setSubjectForm}
            subjectMappings={subjectMappings}
            subjects={subjects}
            teachers={teachers}
            books={books}
            onInitSubjectForm={initSubjectForm}
            onAddSubjectRow={addSubjectRow}
            onSaveSubjects={handleSaveSubjects}
            onDeleteMapping={setDeleteMappingTarget}
          />
        )}

        {step === 'snapshot' && selectedExamId && selectedDarjahId && (
          <ExamSnapshotStep
            lng={lng}
            structureFrozen={structureFrozen}
            snapshots={snapshots}
            selectedSectionId={selectedSectionId}
            rollSaving={rollSaving}
            onGenerateSnapshot={handleGenerateSnapshot}
            onSaveRolls={handleSaveRolls}
            onAutoAssign={handleAutoRolls}
          />
        )}

        {step === 'schedule' && selectedExamId && (
          <ExamScheduleStep
            lng={lng}
            mode={mode}
            selectedDarjahId={selectedDarjahId}
            subjectMappings={subjectMappings}
            schedule={schedule}
            scheduleForm={scheduleForm}
            setScheduleForm={setScheduleForm}
            editingScheduleId={editingScheduleId}
            setEditingScheduleId={setEditingScheduleId}
            scheduleConflicts={scheduleConflicts}
            availableScheduleMappings={availableScheduleMappings}
            teachers={teachers}
            onToggleScheduleMapping={toggleScheduleMapping}
            onSelectAllAvailableScheduleMappings={selectAllAvailableScheduleMappings}
            onClearScheduleMappingSelection={clearScheduleMappingSelection}
            onSaveSchedule={handleSaveSchedule}
            onStartEditSchedule={startEditSchedule}
            onDeleteSchedule={setDeleteScheduleTarget}
          />
        )}

        {step === 'attendance' && selectedExamId && selectedDarjahId && (
          <ExamAttendanceStep
            lng={lng}
            attendanceData={attendanceData}
            snapshots={snapshots}
            attendanceDraft={attendanceDraft}
            setAttendanceDraft={setAttendanceDraft}
            onPrintNamazSheet={() => openPrintCards(undefined, 'namaz')}
            onInitAttendanceDraft={initAttendanceDraft}
            onSaveAttendance={handleSaveAttendance}
          />
        )}

        {step === 'marks' && selectedExamId && selectedDarjahId && (
          <ExamMarksStep
            lng={lng}
            mappingLocked={mappingLocked}
            marksHaveUnsavedChanges={marksHaveUnsavedChanges}
            teacherFilterId={teacherFilterId}
            setTeacherFilterId={setTeacherFilterId}
            selectedMappingId={selectedMappingId}
            setSelectedMappingId={setSelectedMappingId}
            marksData={marksData}
            subjectMappings={subjectMappings}
            teachers={teachers}
            selectedMapping={selectedMapping}
            marksEntryEditable={marksEntryEditable}
            marksDraft={marksDraft}
            setMarksDraft={setMarksDraft}
            snapshots={snapshots}
            excelInputRef={excelInputRef}
            isMarksRowEditable={isMarksRowEditable}
            onImportMarks={handleImportMarks}
            onInitMarksDraft={initMarksDraft}
            onUnlockSubject={(id) => openUnlockModal('subject', id)}
            onUnlockStudent={(id) => openUnlockModal('student', id)}
            onSaveMarks={handleSaveMarks}
            onGraceStudent={(r) => {
              setGraceTarget(r)
              setGraceForm({ graceMarks: '', reason: '' })
              graceValidation.setErrors({})
            }}
          />
        )}

        {step === 'results' && selectedExamId && (
          <ExamResultsStep
            lng={lng}
            selectedDarjahId={selectedDarjahId}
            selectedSectionId={selectedSectionId}
            setSelectedSectionId={setSelectedSectionId}
            pendingMarksSubjects={pendingMarksSubjects}
            marksReadyForProcess={marksReadyForProcess}
            matrixLoading={matrixLoading}
            resultMatrix={resultMatrix}
            sectionsForDarjah={sectionsForDarjah}
            onConfirmProcess={() => setConfirmProcessOpen(true)}
            onExportResults={handleExportResults}
            onPrintBulk={() => openPrintCards(undefined, 'cards')}
            onPrintRollSheet={() => openPrintCards(undefined, 'roll')}
            onPrintNamazSheet={() => openPrintCards(undefined, 'namaz')}
          />
        )}

        {step === 'announce' && selectedExamId && (
          <ExamAnnounceStep
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
        )}

        {step === 'audit' && selectedExamId && (
          <ExamAuditStep auditLogs={auditLogs} auditLoading={auditLoading} />
        )}

        {step === 'analytics' && selectedExamId && analytics && (
          <ExamAnalyticsStep lng={lng} analytics={analytics} darajat={darajat} subjects={subjects} />
        )}
      </Suspense>

      <Suspense fallback={null}>
        <ExamPageModals
          lng={lng}
          examNames={examNames}
          graceTarget={graceTarget}
          setGraceTarget={setGraceTarget}
          graceForm={graceForm}
          setGraceForm={setGraceForm}
          onApplyGrace={handleApplyGrace}
          graceErrors={graceValidation.errors}
          onGraceBlur={(name) => graceValidation.onBlurField(name, graceForm)}
          onGraceChange={(name, values) => graceValidation.revalidateIfError(name, values)}
          savingGrace={applyingGrace}
          examModal={examModal}
          setExamModal={setExamModal}
          editingExam={editingExam}
          examForm={examForm}
          setExamForm={setExamForm}
          onSaveExam={handleSaveExam}
          examErrors={examValidation.errors}
          onExamBlur={(name) => examValidation.onBlurField(name, examForm)}
          onExamChange={(name, values) => examValidation.revalidateIfError(name, values)}
          savingExam={savingExam}
          deleteTarget={deleteTarget}
          setDeleteTarget={setDeleteTarget}
          deleteExamReason={deleteExamReason}
          setDeleteExamReason={setDeleteExamReason}
          onDeleteExam={handleDeleteExam}
          deleteExamErrors={deleteExamValidation.errors}
          onDeleteExamBlur={(name) => deleteExamValidation.onBlurField(name, { reason: deleteExamReason })}
          onDeleteExamChange={(name, values) => deleteExamValidation.revalidateIfError(name, values)}
          deletingExam={deletingExam}
          deleteScheduleTarget={deleteScheduleTarget}
          setDeleteScheduleTarget={setDeleteScheduleTarget}
          onDeleteSchedule={handleDeleteSchedule}
          deleteMappingTarget={deleteMappingTarget}
          setDeleteMappingTarget={setDeleteMappingTarget}
          onDeleteSubjectMapping={handleDeleteSubjectMapping}
          confirmProcessOpen={confirmProcessOpen}
          setConfirmProcessOpen={setConfirmProcessOpen}
          onProcessResults={handleProcessResults}
          confirmPublish={confirmPublish}
          setConfirmPublish={setConfirmPublish}
          onPublish={handlePublish}
          unlockModal={unlockModal}
          unlockReason={unlockReason}
          setUnlockReason={setUnlockReason}
          onCloseUnlockModal={closeUnlockModal}
          onUnlockSubmit={handleUnlockSubmit}
          unlockErrors={unlockValidation.errors}
          onUnlockBlur={(name) => unlockValidation.onBlurField(name, { reason: unlockReason })}
          onUnlockChange={(name, values) => unlockValidation.revalidateIfError(name, values)}
          savingUnlock={savingUnlock}
        />
      </Suspense>
    </div>
  )
}
