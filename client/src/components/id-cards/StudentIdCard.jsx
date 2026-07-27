import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { loc } from '../../shared/localized'
import { absoluteAssetUrl, isStoredAssetUrl } from '../../shared/assetUrl'
import { formatDisplayDate } from '../../shared/formatDisplayDate'
import './studentIdCard.css'

function classLabel(student, lng) {
  if (student?.darjahId?.name) {
    const n = loc(student.darjahId.name, lng)
    const code = student.darjahId.code ? ` (${student.darjahId.code})` : ''
    return n + code
  }
  const g = student?.currentGradeId || student?.gradeId
  if (g?.name) return [loc(g.name, lng), g.section].filter(Boolean).join(' — ')
  return '—'
}

function sectionLabel(student, lng) {
  if (student?.subjectId?.name) return loc(student.subjectId.name, lng)
  return '—'
}

function addrLine(v, lng) {
  if (!v) return '—'
  return loc(v, lng) || '—'
}

function photoSrc(student) {
  const raw = student?.photoUrl ? String(student.photoUrl).trim() : ''
  if (!raw) return ''
  return isStoredAssetUrl(raw) ? absoluteAssetUrl(raw) : raw
}

/**
 * CR80 PVC-style student ID card (front and/or back).
 */
export default function StudentIdCardFace({
  side = 'front',
  student,
  card,
  lng = 'ur',
  calendarMode = 'gregorian',
  institutionName = '',
  institutionNameUr = '',
  logoUrl = '',
  instituteAddress = '',
  templateKey = 'pvc-prestige',
  showQr = true,
  showBloodGroup = true,
  showAddress = true,
  verifyBaseUrl = '',
}) {
  const [qrDataUrl, setQrDataUrl] = useState('')
  const en = String(lng).toLowerCase().startsWith('en')
  const photo = photoSrc(student)
  const logo = logoUrl ? absoluteAssetUrl(logoUrl) : ''
  const sessionTitle = student?.sessionId?.title || '—'
  const name = loc(student?.name, lng) || '—'
  const father = loc(student?.fatherName, lng) || '—'
  const admission = student?.studentId || '—'
  const roll = student?.rollNumber || card?.cardNumber || '—'
  const blood = card?.bloodGroup || '—'
  const phone = student?.phone || student?.guardian?.phone || '—'
  const address = showAddress ? addrLine(student?.addressCurrent, lng) : ''
  const variant = templateKey === 'pvc-classic' ? 'classic' : 'prestige'

  useEffect(() => {
    if (side !== 'front' || !showQr || !card?.qrToken) {
      setQrDataUrl('')
      return undefined
    }
    const origin = verifyBaseUrl || (typeof window !== 'undefined' ? window.location.origin : '')
    const url = `${origin}/id-cards/verify/${card.qrToken}`
    let cancelled = false
    QRCode.toDataURL(url, {
      width: 120,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((data) => {
        if (!cancelled) setQrDataUrl(data)
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('')
      })
    return () => {
      cancelled = true
    }
  }, [side, showQr, card?.qrToken, verifyBaseUrl])

  if (side === 'back') {
    return (
      <article
        className={`sid-card sid-card--back sid-card--${variant}`}
        aria-label={en ? 'Student ID card back' : 'طالب علم آئی ڈی کارڈ — پشت'}
      >
        <header className="sid-card__back-head">
          {logo ? <img src={logo} alt="" className="sid-card__back-logo" /> : <div className="sid-card__back-logo sid-card__back-logo--empty" />}
          <div className="sid-card__back-titles">
            {institutionNameUr ? <div className="sid-card__back-ur" lang="ur">{institutionNameUr}</div> : null}
            <div className="sid-card__back-en">{institutionName || 'E-Jamia Pro'}</div>
          </div>
        </header>

        <div className="sid-card__rows">
          <div className="sid-card__row">
            <span className="sid-card__row-icon" aria-hidden>F</span>
            <span className="sid-card__row-label">{en ? 'Father' : 'والد'}</span>
            <span className="sid-card__row-value">{father}</span>
          </div>
          <div className="sid-card__row">
            <span className="sid-card__row-icon" aria-hidden>D</span>
            <span className="sid-card__row-label">{en ? 'DOB' : 'پیدائش'}</span>
            <span className="sid-card__row-value">{formatDisplayDate(student?.dateOfBirth, lng, calendarMode)}</span>
          </div>
          <div className="sid-card__row">
            <span className="sid-card__row-icon" aria-hidden>C</span>
            <span className="sid-card__row-label">{en ? 'Class' : 'درجہ'}</span>
            <span className="sid-card__row-value">{classLabel(student, lng)}</span>
          </div>
          <div className="sid-card__row">
            <span className="sid-card__row-icon" aria-hidden>#</span>
            <span className="sid-card__row-label">{en ? 'GR #' : 'رجسٹر #'}</span>
            <span className="sid-card__row-value" dir="ltr">{admission}</span>
          </div>
          {showBloodGroup ? (
            <div className="sid-card__row">
              <span className="sid-card__row-icon" aria-hidden>B</span>
              <span className="sid-card__row-label">{en ? 'Blood' : 'خون'}</span>
              <span className="sid-card__row-value" dir="ltr">{blood}</span>
            </div>
          ) : null}
          <div className="sid-card__row">
            <span className="sid-card__row-icon" aria-hidden>P</span>
            <span className="sid-card__row-label">{en ? 'Contact' : 'رابطہ'}</span>
            <span className="sid-card__row-value" dir="ltr">{phone}</span>
          </div>
          {showAddress && address ? (
            <div className="sid-card__row sid-card__row--addr">
              <span className="sid-card__row-icon" aria-hidden>A</span>
              <span className="sid-card__row-label">{en ? 'Address' : 'پتہ'}</span>
              <span className="sid-card__row-value">{address}</span>
            </div>
          ) : null}
        </div>

        <footer className="sid-card__back-foot">
          <div className="sid-card__validity">
            {en ? 'Valid upto:' : 'میعاد:'}{' '}
            <strong>{formatDisplayDate(card?.expiryDate, lng, calendarMode) || '—'}</strong>
          </div>
          <div className="sid-card__authority">
            {en ? 'Issuing Authority' : 'اجازت دہندہ'}
            <span className="sid-card__sign-line" />
          </div>
          {instituteAddress ? <div className="sid-card__inst-addr">{instituteAddress}</div> : null}
        </footer>
      </article>
    )
  }

  return (
    <article
      className={`sid-card sid-card--front sid-card--${variant}`}
      aria-label={en ? 'Student ID card front' : 'طالب علم آئی ڈی کارڈ — سامنے'}
    >
      <div className="sid-card__punch" aria-hidden />
      <header className="sid-card__front-head">
        <div className="sid-card__inst-name">{institutionName || 'E-Jamia Pro'}</div>
        <div className="sid-card__inst-sub">{en ? 'Education System' : 'نظام تعلیم'}</div>
        <div className="sid-card__session" dir="ltr">
          {sessionTitle}
        </div>
      </header>
      <div className="sid-card__title-bar">{en ? 'STUDENT ID CARD' : 'طالب علم شناختی کارڈ'}</div>

      <div className="sid-card__body">
        <div className="sid-card__stripes" aria-hidden />
        <div className="sid-card__photo-wrap">
          {photo ? (
            <img src={photo} alt="" className="sid-card__photo" />
          ) : (
            <div className="sid-card__photo sid-card__photo--empty">{en ? 'Photo' : 'تصویر'}</div>
          )}
        </div>
        <div className="sid-card__name-plate">{name}</div>
        <div className="sid-card__meta">
          <span dir="ltr">ID: {admission}</span>
          <span>{classLabel(student, lng)}</span>
          <span>{sectionLabel(student, lng)}</span>
        </div>
        {showQr && qrDataUrl ? (
          <img src={qrDataUrl} alt="" className="sid-card__qr" />
        ) : showQr ? (
          <div className="sid-card__qr sid-card__qr--empty" aria-hidden />
        ) : null}
      </div>
      <div className="sid-card__front-wash" aria-hidden />
    </article>
  )
}

/** Pair wrapper for front + optional back */
export function StudentIdCardPair({
  showBack = true,
  cropMarks = false,
  ...faceProps
}) {
  return (
    <div className={`sid-card-pair${cropMarks ? ' sid-card-pair--crop' : ''}`}>
      <StudentIdCardFace side="front" {...faceProps} />
      {showBack ? <StudentIdCardFace side="back" {...faceProps} /> : null}
    </div>
  )
}
