import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGetStudentQuery, useGetMeQuery, useGetSettingsQuery } from '../services/api'
import { loc } from '../shared/localized'
import { getInstitutionName } from '../shared/institutionBrand'
import { absoluteAssetUrl } from '../shared/assetUrl'
import { useCalendarMode } from '../app/calendarMode'
import StudentRegistrationPrint from '../components/StudentRegistrationPrint'
import { studentPrintLabels } from '../shared/studentPrintUtils'

export default function StudentPrintPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const { mode } = useCalendarMode()
  const en = lng?.toLowerCase().startsWith('en')

  const { data: student, isLoading, isError } = useGetStudentQuery(id)
  const { data: me } = useGetMeQuery()
  const { data: settings } = useGetSettingsQuery()

  const tenantName = getInstitutionName(me, lng)
  const collegeAff = settings?.collegeAffiliation ? loc(settings.collegeAffiliation, lng) : ''
  const instituteLogo = absoluteAssetUrl(settings?.logoUrl)
  const L = studentPrintLabels(lng, tenantName)

  useEffect(() => {
    const pageTitle = en ? 'Student registration print' : 'طالب علم پرنٹ'
    document.title = tenantName ? `${tenantName} · ${pageTitle}` : pageTitle
    return () => {
      document.title = tenantName || 'E-Jamia Pro'
    }
  }, [en, tenantName])

  if (isLoading) {
    return (
      <div className="content-panel p-4">
        <p className="text-muted mb-0">{t('common.loading')}</p>
      </div>
    )
  }

  if (isError || !student) {
    return (
      <div className="content-panel p-4">
        <p className="text-danger mb-2">{en ? 'Student not found.' : 'طالب علم نہیں ملا۔'}</p>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => navigate('/students')}>
          {L.back}
        </button>
      </div>
    )
  }

  return (
    <div className="student-print-page">
      <div className="no-print d-flex flex-wrap gap-2 mb-3">
        <button type="button" className="btn btn-sm btn-success" onClick={() => window.print()}>
          {L.printBtn}
        </button>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => navigate('/students')}>
          {L.back}
        </button>
        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => navigate(`/students/${id}/edit`)}>
          {t('common.edit')}
        </button>
      </div>

      <StudentRegistrationPrint
        student={student}
        lng={lng}
        calendarMode={mode}
        tenantName={tenantName}
        collegeAff={collegeAff}
        instituteLogo={instituteLogo}
      />
    </div>
  )
}
