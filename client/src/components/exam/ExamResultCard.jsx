import { useTranslation } from 'react-i18next'
import DateObject from 'react-date-object'
import hijriPakistan from '../../shared/hijriPakistanCalendar.js'
import { loc, uiLang } from '../../shared/localized'
import { formatDisplayDate, parseAppDate } from '../../shared/formatDisplayDate'
import { useCalendarMode } from '../../app/calendarMode'
import hijriUrduLocale from '../../shared/hijriUrduLocale'
import { classRankOrdinal, divisionLabel } from '../../shared/examEnums'
import { absoluteAssetUrl, isStoredAssetUrl } from '../../shared/assetUrl'
import './examResultCard.css'

function InstitutionLogo({ logoUrl }) {
  if (logoUrl) {
    return (
      <img src={logoUrl} alt="" className="sanad-card__logo-img" />
    )
  }
  return (
    <svg className="sanad-card__logo-svg" viewBox="0 0 120 120" aria-hidden>
      <circle cx="60" cy="60" r="56" fill="#f0fdf9" stroke="#0f8f5f" strokeWidth="2" />
      <path
        d="M36 78V42c0-2 1.5-3.5 3.5-3.5h41c2 0 3.5 1.5 3.5 3.5v36"
        fill="none"
        stroke="#0b6e49"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M42 42c8-10 28-10 36 0" fill="none" stroke="#0b6e49" strokeWidth="2" />
      <line x1="60" y1="18" x2="60" y2="34" stroke="#c9a227" strokeWidth="2" strokeLinecap="round" />
      <line x1="48" y1="22" x2="54" y2="36" stroke="#c9a227" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="72" y1="22" x2="66" y2="36" stroke="#c9a227" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="38" y1="30" x2="48" y2="40" stroke="#c9a227" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="82" y1="30" x2="72" y2="40" stroke="#c9a227" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M44 58h32M44 66h24M44 74h28" stroke="#0f8f5f" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function examSubtitle(exam, lng, mode) {
  if (!exam) return ''
  const en = lng?.startsWith('en')
  if (en) return loc(exam.name, lng)

  const namePart = loc(exam.examType, lng) || loc(exam.name, lng) || 'امتحان سالانہ'
  const d = parseAppDate(exam.startDate || exam.resultPublicationDate)
  if (!d) return `بابت ${namePart}`
  try {
    const h = new DateObject({ date: d, calendar: hijriPakistan, locale: hijriUrduLocale })
    return `بابت ${namePart} ${h.year}`
  } catch {
    return `بابت ${namePart}`
  }
}

function formatPct(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return `${Number(n).toFixed(2)}%`
}

function darjahLine(row, lng) {
  const parts = [loc(row.sectionName, lng), loc(row.darjahName, lng)].filter(Boolean)
  return parts.join(' — ') || '—'
}

/** Printable Sanad-e-In'am style result certificate */
export default function ExamResultCard({
  row,
  exam,
  institution,
  collegeAffiliation,
  logoUrl,
  lng,
  showWatermark,
}) {
  const { t } = useTranslation()
  const { mode } = useCalendarMode()
  const en = lng?.startsWith('en')
  const lang = uiLang(lng)
  const subjects = row.subjects || []
  const today = formatDisplayDate(new Date(), lng, mode)
  const refNo = row.admissionNumber || row.rollNumber || '—'
  const divisionText = divisionLabel(row.division, lng)
  const rankText = classRankOrdinal(row.classRank, lng)
  const photoAbs = isStoredAssetUrl(row.photoUrl) ? absoluteAssetUrl(row.photoUrl) : ''

  return (
    <article
      className={`sanad-card ${showWatermark && !row.isPublished ? 'sanad-card--draft' : ''}`}
      lang={lang}
      dir={en ? 'ltr' : 'rtl'}
    >
      {showWatermark && !row.isPublished && (
        <div className="sanad-card__watermark">{t('exam.unpublished')}</div>
      )}

      <header className="sanad-card__header">
        <div className="sanad-card__logo-wrap">
          <InstitutionLogo logoUrl={logoUrl} />
        </div>

        <div className="sanad-card__title-block">
          {!en && <p className="sanad-card__bismillah">بسم اللہ الرحمن الرحیم</p>}
          <h1 className="sanad-card__title">{en ? t('exam.sanadTitleEn') : t('exam.sanadTitle')}</h1>
          <p className="sanad-card__subtitle">{examSubtitle(exam, lng, mode)}</p>
        </div>

        <div className="sanad-card__inst-block">
          <div className="sanad-card__inst-name">{institution || t('exam.institution')}</div>
          {collegeAffiliation ? (
            <div className="sanad-card__inst-aff">{collegeAffiliation}</div>
          ) : null}
          <div className="sanad-card__meta-line">
            <span>{t('exam.sanadDate')}:</span>
            <strong dir="ltr">{today}</strong>
          </div>
          <div className="sanad-card__meta-line">
            <span>{t('exam.sanadRef')}:</span>
            <strong dir="ltr">{refNo}</strong>
          </div>
        </div>
      </header>

      <section className="sanad-card__student-block">
        <div className="sanad-card__student-grid">
          <div className="sanad-card__field">
            <span className="sanad-card__label">{t('exam.sanadStudentName')}</span>
            <span className="sanad-card__value sanad-card__value--name">{loc(row.studentName, lng) || '—'}</span>
          </div>
          <div className="sanad-card__field">
            <span className="sanad-card__label">{t('exam.sanadDarjah')}</span>
            <span className="sanad-card__value">{darjahLine(row, lng)}</span>
          </div>
          <div className="sanad-card__field">
            <span className="sanad-card__label">{t('exam.sanadFather')}</span>
            <span className="sanad-card__value">{loc(row.fatherName, lng) || '—'}</span>
          </div>
          <div className="sanad-card__field">
            <span className="sanad-card__label">{t('exam.sanadSuccess')}</span>
            <span className="sanad-card__value sanad-card__value--emph">{rankText}</span>
          </div>
          <div className="sanad-card__field sanad-card__field--wide">
            <span className="sanad-card__label">{t('exam.col.admission')}</span>
            <span className="sanad-card__value" dir="ltr">{row.admissionNumber || '—'}</span>
          </div>
        </div>
        <div className="sanad-card__photo-wrap">
          {photoAbs ? (
            <img src={photoAbs} alt="" className="sanad-card__photo" />
          ) : (
            <div className="sanad-card__photo sanad-card__photo--empty" aria-hidden>
              {en ? 'Photo' : 'تصویر'}
            </div>
          )}
        </div>
      </section>

      <div className="sanad-card__table-wrap">
        <table className="sanad-card__table">
          <thead>
            <tr>
              <th className="sanad-card__th-num">{t('exam.sanadColNo')}</th>
              <th>{t('exam.col.subject')}</th>
              <th>{t('exam.sanadColTotal')}</th>
              <th>{t('exam.sanadColObtained')}</th>
              <th>{t('exam.sanadColPrize')}</th>
              <th>{t('exam.sanadColOther')}</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((s, idx) => (
              <tr key={s.subjectMappingId || idx}>
                <td className="sanad-card__td-num" dir="ltr">{idx + 1}</td>
                <td>{loc(s.subjectName, lng) || '—'}</td>
                <td className="sanad-card__td-marks" dir="ltr">{s.maxMarks ?? '—'}</td>
                <td className={`sanad-card__td-marks ${s.isPassed ? '' : 'sanad-card__td-fail'}`} dir="ltr">
                  {s.obtained != null ? s.obtained : '—'}
                </td>
                <td>{s.prizeBook ? loc(s.prizeBook, lng) : ''}</td>
                <td>{s.notes || ''}</td>
              </tr>
            ))}
            {subjects.length < 4 &&
              Array.from({ length: 4 - subjects.length }).map((_, i) => (
                <tr key={`pad-${i}`} className="sanad-card__row-pad">
                  <td className="sanad-card__td-num" dir="ltr">{subjects.length + i + 1}</td>
                  <td colSpan={5}>&nbsp;</td>
                </tr>
              ))}
          </tbody>
          <tfoot>
            <tr className="sanad-card__totals">
              <td colSpan={2} className="sanad-card__totals-label">{t('exam.sanadTotals')}</td>
              <td dir="ltr">{row.maxAggregate ?? '—'}</td>
              <td dir="ltr">{row.aggregateTotal ?? '—'}</td>
              <td colSpan={2} className="sanad-card__totals-summary">
                <span>{t('exam.col.percentage')}: <strong dir="ltr">{formatPct(row.percentage)}</strong></span>
                <span className="sanad-card__division">
                  {t('exam.col.division')}: <strong>{divisionText}</strong>
                  {row.classRank ? (
                    <span className="sanad-card__rank-note">
                      {' '}({t('exam.col.classRank')}: {rankText})
                    </span>
                  ) : null}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <footer className="sanad-card__footer">
        <div className="sanad-card__sign">
          <div className="sanad-card__sign-line" />
          <p className="sanad-card__sign-label">{t('exam.sanadSign')}</p>
        </div>
        <div className="sanad-card__stamp" aria-hidden>
          <div className="sanad-card__stamp-inner">
            <span>{institution || t('exam.institution')}</span>
          </div>
        </div>
      </footer>
    </article>
  )
}
