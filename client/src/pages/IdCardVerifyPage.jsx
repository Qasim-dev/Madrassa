import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useVerifyIdCardQuery } from '../services/api'
import { loc } from '../shared/localized'
import { absoluteAssetUrl, isStoredAssetUrl } from '../shared/assetUrl'
import { formatDisplayDate } from '../shared/formatDisplayDate'
import { CalendarModeProvider, useCalendarMode } from '../app/calendarMode'
import './idCardsPage.css'

function IdCardVerifyInner() {
  const { token } = useParams()
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const en = lng?.toLowerCase().startsWith('en')
  const { mode } = useCalendarMode()
  const { data, isLoading, isError, error } = useVerifyIdCardQuery(token, { skip: !token })

  if (isLoading) {
    return (
      <div className="id-cards-verify">
        <p className="text-secondary mb-0">{t('common.loading')}</p>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="id-cards-verify">
        <p className="text-danger mb-2">
          {error?.data?.message || (en ? 'Invalid or unknown card.' : 'کارڈ درست نہیں یا نہیں ملا۔')}
        </p>
        <Link to="/login" className="btn btn-sm btn-outline-secondary">
          {en ? 'Home' : 'ہوم'}
        </Link>
      </div>
    )
  }

  const s = data.student
  const inactive = data.status !== 'active'
  const rawPhoto = s?.photoUrl ? String(s.photoUrl).trim() : ''
  const photo = isStoredAssetUrl(rawPhoto) ? absoluteAssetUrl(rawPhoto) : rawPhoto
  const className = s?.darjah?.name
    ? loc(s.darjah.name, lng)
    : s?.grade?.name
      ? loc(s.grade.name, lng)
      : '—'
  const section = s?.subject?.name ? loc(s.subject.name, lng) : '—'

  return (
    <div className="id-cards-verify">
      {inactive ? (
        <div className="id-cards-verify__inactive" role="alert">
          {en ? 'Inactive Student' : 'غیر فعال طالب علم'}
        </div>
      ) : null}

      {photo ? <img src={photo} alt="" className="id-cards-verify__photo" /> : <div className="id-cards-verify__photo" />}

      <h1 className="h4 mb-1">{loc(s.name, lng) || '—'}</h1>
      <p className="text-secondary small mb-0" dir="ltr">
        {data.cardNumber} · {s.studentId}
      </p>

      <div className="id-cards-verify__grid">
        <div className="id-cards-verify__row">
          <span>{en ? 'Section' : 'شعبہ'}</span>
          <strong>{section}</strong>
        </div>
        <div className="id-cards-verify__row">
          <span>{en ? 'Class' : 'درجہ'}</span>
          <strong>{className}</strong>
        </div>
        <div className="id-cards-verify__row">
          <span>{en ? 'Session' : 'سیشن'}</span>
          <strong>{s.session?.title || '—'}</strong>
        </div>
        <div className="id-cards-verify__row">
          <span>{en ? 'Admission No' : 'رجسٹر نمبر'}</span>
          <strong dir="ltr">{s.studentId || '—'}</strong>
        </div>
        <div className="id-cards-verify__row">
          <span>{en ? 'Status' : 'حالت'}</span>
          <strong>{inactive ? (en ? 'Inactive' : 'غیر فعال') : en ? 'Active' : 'فعال'}</strong>
        </div>
        <div className="id-cards-verify__row">
          <span>{en ? 'Guardian' : 'سرپرست'}</span>
          <strong>{loc(s.guardianName, lng) || '—'}</strong>
        </div>
        <div className="id-cards-verify__row">
          <span>{en ? 'Valid until' : 'میعاد'}</span>
          <strong>{formatDisplayDate(data.expiryDate, lng, mode) || '—'}</strong>
        </div>
      </div>
    </div>
  )
}

export default function IdCardVerifyPage() {
  return (
    <CalendarModeProvider>
      <IdCardVerifyInner />
    </CalendarModeProvider>
  )
}
