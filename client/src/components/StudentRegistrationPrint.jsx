import { loc } from '../shared/localized'
import { absoluteAssetUrl, isStoredAssetUrl } from '../shared/assetUrl'
import { formatDisplayDate } from '../shared/formatDisplayDate'
import {
  ageFromDob,
  addrLine,
  studentClassLabel,
  studentPrintLabels,
} from '../shared/studentPrintUtils'

/**
 * One printable student registration card (page-break friendly when stacked).
 */
export default function StudentRegistrationPrint({
  student,
  lng,
  calendarMode,
  tenantName,
  collegeAff = '',
  instituteLogo = '',
  className = '',
}) {
  const L = studentPrintLabels(lng, tenantName)
  const ageY = ageFromDob(student.dateOfBirth)
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

  return (
    <div className={['student-registration-print', className].filter(Boolean).join(' ')} lang={L.lang} dir="rtl">
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
            <div className="student-registration-print__photo-placeholder">{L.photo}</div>
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
              <td>{studentClassLabel(student, lng)}</td>
              <th>{L.reg}</th>
              <td>{student.studentId || '—'}</td>
            </tr>
            <tr>
              <th>{L.cnic}</th>
              <td>{student.idCard || '—'}</td>
              <th>{L.dob}</th>
              <td>{formatDisplayDate(student.dateOfBirth, lng, calendarMode)}</td>
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
              <td>{formatDisplayDate(student.enrollmentDate, lng, calendarMode)}</td>
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
              <th>{L.address}</th>
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
              <td>{studentClassLabel(student, lng)}</td>
              <td>{student.classTypeLabel || '—'}</td>
              <td>{student.rollNumber || '—'}</td>
              <td>{formatDisplayDate(student.enrollmentDate, lng, calendarMode)}</td>
              <td>{student.exitDate ? formatDisplayDate(student.exitDate, lng, calendarMode) : L.ongoing}</td>
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
          {L.officeNotes} ________________________________________________
        </p>
        <div className="student-registration-print__sign-row">
          <span>{L.examiner}: _____________</span>
          <span>
            {L.principal}: _____________
          </span>
          <span>{L.seal}: _____________</span>
        </div>
      </section>

      <footer className="student-registration-print__footer">
        <span>{formatDisplayDate(new Date(), lng, calendarMode)}</span>
        <span>
          {tenantName || 'E-Jamia Pro'} — {L.footer}
        </span>
      </footer>
    </div>
  )
}
