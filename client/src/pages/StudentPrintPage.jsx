import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  useGetStudentQuery,
  useGetMeQuery,
  useGetSettingsQuery,
} from '../services/api'
import { loc, uiLang } from '../shared/localized'
import { getInstitutionName } from '../shared/institutionBrand'
import { absoluteAssetUrl, isStoredAssetUrl } from '../shared/assetUrl'
import { formatDisplayDate } from '../shared/formatDisplayDate'
import { useCalendarMode } from '../app/calendarMode'

function ageFromDob(dob) {
  if (!dob) return null
  const d = dob instanceof Date ? dob : new Date(dob)
  if (Number.isNaN(d.getTime())) return null
  const today = new Date()
  let years = today.getFullYear() - d.getFullYear()
  const m = today.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) years -= 1
  return years
}

/** Current class: prefer tartibat درجہ + شعبہ جات (not legacy Grade). */
function classLabel(student, lng) {
  const darjah = student.darjahId
  const subject = student.subjectId

  if (darjah?.name) {
    const darjahName = loc(darjah.name, lng)
    const code = darjah.code ? String(darjah.code).trim() : ''
    const darjahLine =
      code && code !== darjahName ? `${darjahName} (${code})` : darjahName
    const subjectName = subject?.name ? loc(subject.name, lng) : ''
    return subjectName ? `${darjahLine} — ${subjectName}` : darjahLine
  }

  // Legacy Grade only when student has no darjah
  const grade = student.currentGradeId || student.gradeId
  if (grade?.name) {
    const sep = lng?.toLowerCase().startsWith('en') ? ' — ' : ' - '
    return [loc(grade.name, lng), grade.section].filter(Boolean).join(sep)
  }
  return '—'
}

function addrLine(v, lng) {
  if (!v) return '—'
  const a = loc(v, lng)
  return a || '—'
}

export default function StudentPrintPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const { mode } = useCalendarMode()
  const lang = uiLang(lng)
  const en = lng?.toLowerCase().startsWith('en')

  const { data: student, isLoading, isError } = useGetStudentQuery(id)
  const { data: me } = useGetMeQuery()
  const { data: settings } = useGetSettingsQuery()

  const tenantName = getInstitutionName(me, lng)
  const collegeAff = settings?.collegeAffiliation ? loc(settings.collegeAffiliation, lng) : ''
  const instituteLogo = absoluteAssetUrl(settings?.logoUrl)

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
          {en ? 'Back' : 'واپس'}
        </button>
      </div>
    )
  }

  const rawPhoto = student.photoUrl ? String(student.photoUrl).trim() : ''
  const photoAbs = isStoredAssetUrl(rawPhoto) ? absoluteAssetUrl(rawPhoto) : ''

  const guardiansRows =
    Array.isArray(student.guardians) && student.guardians.length > 0
      ? student.guardians
      : student.guardian &&
          (student.guardian.name?.ur ||
            student.guardian.name?.en ||
            student.guardian.phone ||
            student.guardian.relation?.ur)
        ? [student.guardian]
        : []

  const prevSchools = Array.isArray(student.previousSchools) ? student.previousSchools : []

  const L = {
    title: en ? 'Student registration' : 'طالب علم کا داخلہ فارم',
    institution: tenantName || (en ? 'Institution' : 'جامعہ / مدرسہ'),
    basic: en ? 'Basic information' : 'بنیادی معلومات',
    guardian: en ? "Guardian's information" : 'سرپرست کی معلومات',
    prevSchools: en ? 'Previous schools' : 'سابقہ مدارس',
    classHist: en ? 'Class history' : 'کلاس کی تاریخ',
    office: en ? 'For office use' : 'دفتری استعمال کے لئے',
    name: en ? 'Student name' : 'نام طالب علم',
    father: en ? "Father's name" : 'ولدیت',
    reg: en ? 'Registration no.' : 'رجسٹریشن نمبر',
    cnic: en ? 'CNIC' : 'شناختی کارڈ نمبر',
    dob: en ? 'Date of birth' : 'تاریخ پیدائش',
    age: en ? 'Age (years)' : 'عمر',
    class: en ? 'Current class' : 'موجودہ درجہ',
    addrCur: en ? 'Current address' : 'موجودہ پتہ',
    addrPerm: en ? 'Permanent address' : 'مستقل پتہ',
    enroll: en ? 'Admission date' : 'تاریخ داخلہ',
    phone: en ? 'Phone' : 'فون نمبر',
    secular: en ? 'Secular education' : 'عصری تعلیم',
    affiliation: en ? 'Affiliation' : 'الحاق',
    roll: en ? 'Roll no.' : 'رول نمبر',
    entry: en ? 'Entry date' : 'اندراج کی تاریخ',
    exit: en ? 'Exit date' : 'اخراج کی تاریخ',
    exitReason: en ? 'Reason for exit' : 'اخراج کی وجہ',
    ongoing: en ? 'Ongoing' : 'جاری',
    studentSign: en ? 'Student signature' : 'دستخط طالب علم',
    guardianSign: en ? 'Guardian signature' : 'دستخط سرپرست',
    principal: en ? 'Principal' : 'مہتمم',
    footer: en ? 'Madrasa management system' : 'مدرسہ مینجمنٹ سسٹم',
    printBtn: en ? 'Print' : 'پرنٹ کریں',
    back: en ? 'Back' : 'واپس',
    rel: en ? 'Relation' : 'رشتہ',
    profession: en ? 'Profession' : 'پیشہ',
    year: en ? 'Year' : 'سال',
    gradeCol: en ? 'Class' : 'درجہ',
    institute: en ? 'Institute' : 'جامعہ/مدرسہ',
    marks: en ? 'Marks' : 'نمبرات',
    result: en ? 'Result' : 'تقدیر',
    classCol: en ? 'Class' : 'کلاس',
    type: en ? 'Type' : 'قسم',
  }

  const ageY = ageFromDob(student.dateOfBirth)

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

      <div className="student-registration-print" lang={lang} dir="rtl">
        <header className="student-registration-print__banner">
          {instituteLogo ? (
            <div className="student-registration-print__logo-wrap">
              <img src={instituteLogo} alt="" className="student-registration-print__logo" />
            </div>
          ) : (
            <div className="student-registration-print__logo-wrap student-registration-print__logo-wrap--empty" aria-hidden />
          )}
          <div className="student-registration-print__banner-text">{L.institution}</div>
          <div className="student-registration-print__photo-wrap">
            {photoAbs ? (
              <img src={photoAbs} alt="" className="student-registration-print__photo" />
            ) : (
              <div className="student-registration-print__photo-placeholder">{en ? 'Photo' : 'تصویر'}</div>
            )}
          </div>
        </header>

        <section className="student-registration-print__section">
          <h2 className="student-registration-print__section-title">{L.basic}</h2>
          <table className="student-registration-print__grid">
            <tbody>
              <tr>
                <th>{L.name}</th>
                <td>{loc(student.name, lng) || '—'}</td>
                <th>{L.father}</th>
                <td>{loc(student.fatherName, lng) || '—'}</td>
              </tr>
              <tr>
                <th>{L.class}</th>
                <td>{classLabel(student, lng)}</td>
                <th>{L.reg}</th>
                <td>{student.studentId || '—'}</td>
              </tr>
              <tr>
                <th>{L.cnic}</th>
                <td>{student.idCard || '—'}</td>
                <th>{L.dob}</th>
                <td>{formatDisplayDate(student.dateOfBirth, lng, mode)}</td>
              </tr>
              <tr>
                <th>{L.age}</th>
                <td>{ageY != null ? `${ageY}` : '—'}</td>
                <th>{L.phone}</th>
                <td>{student.phone || '—'}</td>
              </tr>
              <tr>
                <th>{L.addrCur}</th>
                <td colSpan={3}>{addrLine(student.addressCurrent, lng)}</td>
              </tr>
              <tr>
                <th>{L.addrPerm}</th>
                <td colSpan={3}>{addrLine(student.addressPermanent, lng)}</td>
              </tr>
              <tr>
                <th>{L.enroll}</th>
                <td>{formatDisplayDate(student.enrollmentDate, lng, mode)}</td>
                <th>{L.secular}</th>
                <td>{loc(student.degree, lng) || '—'}</td>
              </tr>
              <tr>
                <th>{L.affiliation}</th>
                <td colSpan={3}>{collegeAff || '—'}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="student-registration-print__section">
          <h2 className="student-registration-print__section-title">{L.guardian}</h2>
          <table className="student-registration-print__data-table">
            <thead>
              <tr>
                <th>{L.name}</th>
                <th>{L.rel}</th>
                <th>{L.profession}</th>
                <th>{L.phone}</th>
                <th>{en ? 'Address' : 'پتہ'}</th>
              </tr>
            </thead>
            <tbody>
              {guardiansRows.length === 0 ? (
                <tr>
                  <td colSpan={5}>—</td>
                </tr>
              ) : (
                guardiansRows.map((g, i) => (
                  <tr key={g._id || i}>
                    <td>{loc(g.name, lng) || '—'}</td>
                    <td>{loc(g.relation, lng) || '—'}</td>
                    <td>{g.profession || '—'}</td>
                    <td>{g.phone || '—'}</td>
                    <td>{loc(g.address, lng) || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <section className="student-registration-print__section">
          <h2 className="student-registration-print__section-title">{L.prevSchools}</h2>
          <table className="student-registration-print__data-table">
            <thead>
              <tr>
                <th>{L.year}</th>
                <th>{L.gradeCol}</th>
                <th>{L.institute}</th>
                <th>{L.marks}</th>
                <th>{L.result}</th>
              </tr>
            </thead>
            <tbody>
              {prevSchools.length === 0 ? (
                <tr>
                  <td colSpan={5}>—</td>
                </tr>
              ) : (
                prevSchools.map((r, i) => (
                  <tr key={r._id || i}>
                    <td>{r.year || '—'}</td>
                    <td>{r.grade || '—'}</td>
                    <td>{r.institute || '—'}</td>
                    <td>{r.marks || '—'}</td>
                    <td>{r.result || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <section className="student-registration-print__section">
          <h2 className="student-registration-print__section-title">{L.classHist}</h2>
          <table className="student-registration-print__data-table">
            <thead>
              <tr>
                <th>{L.classCol}</th>
                <th>{L.type}</th>
                <th>{L.roll}</th>
                <th>{L.entry}</th>
                <th>{L.exit}</th>
                <th>{L.exitReason}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{classLabel(student, lng)}</td>
                <td>{student.classTypeLabel || '—'}</td>
                <td>{student.rollNumber || '—'}</td>
                <td>{formatDisplayDate(student.enrollmentDate, lng, mode)}</td>
                <td>{student.exitDate ? formatDisplayDate(student.exitDate, lng, mode) : L.ongoing}</td>
                <td>{loc(student.exitReason, lng) || '—'}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="student-registration-print__section student-registration-print__signatures">
          <div className="student-registration-print__sign-row">
            <span>{L.studentSign}: ______________________</span>
            <span>{L.guardianSign}: ______________________</span>
          </div>
        </section>

        <section className="student-registration-print__section">
          <h2 className="student-registration-print__section-title">{L.office}</h2>
          <p className="student-registration-print__office-lines mb-2">
            {en ? 'Admission / exam notes:' : 'داخلہ / امتحان کی نوٹس:'} ________________________________________________
          </p>
          <div className="student-registration-print__sign-row">
            <span>{en ? 'Examiner' : 'ممتحن'}: _____________</span>
            <span>
              {L.principal}: _____________
            </span>
            <span>{en ? 'Seal' : 'مہر'}: _____________</span>
          </div>
        </section>

        <footer className="student-registration-print__footer">
          <span>{formatDisplayDate(new Date(), lng, mode)}</span>
          <span>{tenantName || 'E-Jamia Pro'} — {L.footer}</span>
        </footer>
      </div>
    </div>
  )
}
