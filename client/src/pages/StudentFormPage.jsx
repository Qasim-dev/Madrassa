import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import {
  useGetGradesQuery,
  useGetSessionsQuery,
  useGetSettingsQuery,
  useGetStudentQuery,
  useCreateStudentMutation,
  useUpdateStudentMutation,
  useUploadStudentPhotoMutation,
  useGetStudentFeeBalanceQuery,
} from '../services/api'
import { flText, uiLang } from '../shared/localized'
import { FL } from '../shared/fieldLabels'
import {
  defaultForm,
  mapStudentRecordToForm,
  buildPayload,
} from '../shared/studentFormUtils'
import StudentEnrollmentForm from '../components/StudentEnrollmentForm'

export default function StudentFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const lang = uiLang(lng)

  const isNew = !id
  const {
    data: student,
    isLoading: loadingStudent,
    isError: studentError,
  } = useGetStudentQuery(id, { skip: isNew })
  const { data: feeBalance } = useGetStudentFeeBalanceQuery(id, { skip: isNew || !id })

  const [enrollTab, setEnrollTab] = useState('basic')
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)

  const activeSessionId = useSelector((s) => s.session.activeSessionId)
  const gradesSessionId = form.sessionId || activeSessionId || ''
  const { data: gradesBySession = [] } = useGetGradesQuery(
    gradesSessionId ? { sessionId: gradesSessionId } : undefined
  )
  // Legacy support: many older Grade rows have sessionId=null; allow dropdown to populate anyway.
  const { data: allGrades = [] } = useGetGradesQuery(undefined)
  const grades = gradesBySession.length ? gradesBySession : allGrades
  const { data: sessions = [] } = useGetSessionsQuery()
  const { data: settings, refetch: refetchSettings } = useGetSettingsQuery()
  const [createStudent] = useCreateStudentMutation()
  const [updateStudent] = useUpdateStudentMutation()
  const [uploadPhoto] = useUploadStudentPhotoMutation()

  const fileRef = useRef(null)
  const videoRef = useRef(null)
  /** Keeps the chosen/captured File even if the file input is cleared by a re-render. */
  const pendingPhotoRef = useRef(null)
  const [camOn, setCamOn] = useState(false)

  useEffect(() => {
    void refetchSettings()
  }, [refetchSettings])

  useEffect(() => {
    if (isNew) {
      setForm(defaultForm())
      setEnrollTab('basic')
      pendingPhotoRef.current = null
      return
    }
    if (student) {
      setForm(mapStudentRecordToForm(student))
      setEnrollTab('basic')
      pendingPhotoRef.current = null
    }
  }, [isNew, student])

  useEffect(() => {
    if (!isNew || !activeSessionId) return
    setForm((prev) => (prev.sessionId ? prev : { ...prev, sessionId: activeSessionId }))
  }, [isNew, activeSessionId])

  // If header session is "All sessions", still pick a sensible default for new student
  // so "موجودہ درجہ" (grades) can populate.
  useEffect(() => {
    if (!isNew) return
    if (form.sessionId) return
    if (!Array.isArray(sessions) || sessions.length === 0) return
    const fallback = sessions.find((s) => s.isActive)?._id || sessions[0]?._id || ''
    if (!fallback) return
    setForm((prev) => (prev.sessionId ? prev : { ...prev, sessionId: fallback }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, sessions])

  useEffect(() => {
    if (!isNew && !loadingStudent && studentError) {
      navigate('/students', { replace: true })
    }
  }, [isNew, loadingStudent, studentError, navigate])

  useEffect(() => {
    return () => {
      if (form.photoUrl?.startsWith('blob:')) URL.revokeObjectURL(form.photoUrl)
    }
    // only on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function setPhotoPreview(file) {
    if (!file) return
    pendingPhotoRef.current = file
    const previewUrl = URL.createObjectURL(file)
    setForm((prev) => {
      if (prev.photoUrl?.startsWith('blob:')) URL.revokeObjectURL(prev.photoUrl)
      return { ...prev, photoUrl: previewUrl }
    })
    if (fileRef.current) {
      try {
        const dt = new DataTransfer()
        dt.items.add(file)
        fileRef.current.files = dt.files
      } catch {
        /* some browsers block programmatic files; pendingPhotoRef is enough */
      }
    }
  }

  function onPhotoFileChange(e) {
    const file = e.target.files?.[0]
    if (file) setPhotoPreview(file)
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = buildPayload(form)
      payload.gradeId = form.gradeId || null
      payload.currentGradeId = form.currentGradeId || null
      payload.previousGradeId = form.previousGradeId || null

      const photoFile = pendingPhotoRef.current || fileRef.current?.files?.[0] || null

      if (isNew) {
        const created = await createStudent(payload).unwrap()
        if (photoFile) {
          const fd = new FormData()
          fd.append('photo', photoFile)
          await uploadPhoto({ id: created._id, formData: fd }).unwrap()
        }
      } else {
        await updateStudent({ id, ...payload }).unwrap()
        if (photoFile) {
          const fd = new FormData()
          fd.append('photo', photoFile)
          await uploadPhoto({ id, formData: fd }).unwrap()
        }
      }
      pendingPhotoRef.current = null
      navigate('/students')
    } finally {
      setSaving(false)
    }
  }

  async function startCam() {
    setCamOn(true)
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    if (videoRef.current) {
      videoRef.current.srcObject = stream
      await videoRef.current.play()
    }
  }

  async function captureCam() {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' })
        setPhotoPreview(file)
      },
      'image/jpeg',
      0.92
    )
    const stream = video.srcObject
    stream?.getTracks?.().forEach((tr) => tr.stop())
    setCamOn(false)
  }

  if (!isNew && loadingStudent) {
    return (
      <div className="content-panel p-4">
        <p className="text-muted mb-0" lang={lang}>
          {t('common.loading')}
        </p>
      </div>
    )
  }

  const titleK = isNew ? 'studentFormTitleNew' : 'studentFormTitleEdit'

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => navigate('/students')}
            lang={lang}
          >
            {flText(FL.backToStudentList, lng)}
          </button>
          <h1 className="h5 mb-0 fw-bold" lang={lang}>
            {flText(FL[titleK], lng)}
          </h1>
        </div>
        {!isNew && feeBalance && Number(feeBalance.due) > 0 ? (
          <div className="fee-due-banner" dir="ltr">
            <span className="fee-due-banner__label">
              {lng === 'ur' ? 'واجب الادا فیس' : 'Fee due'}
            </span>
            <span className="fee-due-banner__value">{feeBalance.due}</span>
          </div>
        ) : null}
      </div>

      <form className="content-panel p-3 p-md-4 mb-4" onSubmit={save}>
        <StudentEnrollmentForm
          isNew={isNew}
          form={form}
          setForm={setForm}
          grades={grades}
          sessions={sessions}
          settings={settings}
          lng={lng}
          activeTab={enrollTab}
          setActiveTab={setEnrollTab}
          fileRef={fileRef}
          videoRef={videoRef}
          camOn={camOn}
          startCam={startCam}
          captureCam={captureCam}
          onPhotoFileChange={onPhotoFileChange}
        />
        <div className="d-flex flex-wrap gap-2 justify-content-end mt-4 pt-3 border-top border-secondary-subtle">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/students')}
            disabled={saving}
            lang={lang}
          >
            {flText(FL.cancel, lng)}
          </button>
          <button type="submit" className="btn btn-success" disabled={saving} lang={lang}>
            {flText(FL.save, lng)}
          </button>
        </div>
      </form>
    </div>
  )
}
