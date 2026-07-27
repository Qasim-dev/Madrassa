import { useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGetStudentsQuery, useGetMeQuery, useGetSettingsQuery } from '../services/api'
import { loc } from '../shared/localized'
import { getInstitutionName } from '../shared/institutionBrand'
import { absoluteAssetUrl } from '../shared/assetUrl'
import { useCalendarMode } from '../app/calendarMode'
import StudentRegistrationPrint from '../components/StudentRegistrationPrint'
import { studentPrintLabels } from '../shared/studentPrintUtils'
import './studentsPage.css'

/**
 * Bulk print: all student registration cards matching list filters (not the data table).
 */
export default function StudentsBulkPrintPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const { mode } = useCalendarMode()
  const en = lng?.toLowerCase().startsWith('en')

  const q = searchParams.get('q') || undefined
  const sessionId = searchParams.get('sessionId') || undefined
  const darjahId = searchParams.get('darjahId') || undefined
  const subjectId = searchParams.get('subjectId') || undefined
  const gradeId = searchParams.get('gradeId') || undefined

  const listParams = useMemo(
    () => ({
      ...(q ? { q } : {}),
      ...(sessionId ? { sessionId } : {}),
      ...(darjahId ? { darjahId } : {}),
      ...(subjectId ? { subjectId } : {}),
      ...(gradeId ? { gradeId } : {}),
    }),
    [q, sessionId, darjahId, subjectId, gradeId]
  )

  const { data, isLoading, isError } = useGetStudentsQuery(listParams)
  const { data: me } = useGetMeQuery()
  const { data: settings } = useGetSettingsQuery()

  const students = useMemo(() => {
    if (Array.isArray(data)) return data
    return data?.items ?? []
  }, [data])

  const total = students.length

  const tenantName = getInstitutionName(me, lng)
  const collegeAff = settings?.collegeAffiliation ? loc(settings.collegeAffiliation, lng) : ''
  const instituteLogo = absoluteAssetUrl(settings?.logoUrl)
  const L = studentPrintLabels(lng, tenantName)

  useEffect(() => {
    const pageTitle = en ? 'Print all student cards' : 'تمام طلباء کارڈز پرنٹ'
    document.title = tenantName ? `${tenantName} · ${pageTitle}` : pageTitle
    return () => {
      document.title = tenantName || 'E-Jamia Pro'
    }
  }, [en, tenantName])

  useEffect(() => {
    if (isLoading || isError || students.length === 0) return undefined
    const timer = window.setTimeout(() => {
      window.print()
    }, 600)
    return () => window.clearTimeout(timer)
  }, [isLoading, isError, students.length])

  if (isLoading) {
    return (
      <div className="content-panel p-4">
        <p className="text-muted mb-0">{t('common.loading')}</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="content-panel p-4">
        <p className="text-danger mb-2">{en ? 'Could not load students.' : 'طلباء لوڈ نہیں ہو سکے۔'}</p>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => navigate('/students')}>
          {L.back}
        </button>
      </div>
    )
  }

  if (students.length === 0) {
    return (
      <div className="content-panel p-4">
        <p className="text-secondary mb-2">{en ? 'No students to print.' : 'پرنٹ کے لیے کوئی طالب علم نہیں۔'}</p>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => navigate('/students')}>
          {L.back}
        </button>
      </div>
    )
  }

  return (
    <div className="students-bulk-print-page">
      <div className="no-print students-bulk-print-page__bar">
        <div className="students-bulk-print-page__meta">
          <strong>{en ? 'Student cards' : 'طلباء کارڈز'}</strong>
          <span>
            {en
              ? `${total} card${total === 1 ? '' : 's'} — table is not printed`
              : `${total} کارڈ — ٹیبل پرنٹ نہیں ہوگا`}
          </span>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="btn btn-sm btn-success" onClick={() => window.print()}>
            {L.printBtn}
          </button>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => navigate('/students')}>
            {L.back}
          </button>
        </div>
      </div>

      <div className="students-bulk-print-page__stack">
        {students.map((s) => (
          <StudentRegistrationPrint
            key={s._id}
            student={s}
            lng={lng}
            calendarMode={mode}
            tenantName={tenantName}
            collegeAff={collegeAff}
            instituteLogo={instituteLogo}
            className="students-bulk-print-page__card"
          />
        ))}
      </div>
    </div>
  )
}
