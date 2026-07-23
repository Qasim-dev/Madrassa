import DateObject from 'react-date-object'
import hijriPakistan from './hijriPakistanCalendar.js'
import gregorian from 'react-date-object/calendars/gregorian'
import gregorian_en from 'react-date-object/locales/gregorian_en'
import hijriUrduLocale from './hijriUrduLocale.js'
import gregorianUrduLocale from './gregorianUrduLocale.js'

export const CALENDAR_MODE_KEY = 'calendarMode'

/** react-multi-date-picker input format — day → month name → year */
export const DATE_DISPLAY_FORMAT = 'D MMMM YYYY'
export const URDU_DATE_DISPLAY_FORMAT = DATE_DISPLAY_FORMAT

const LRI = '\u2066'
const PDI = '\u2069'

/**
 * Always **day → month → year** with bidi isolates on numbers so order stays correct
 * inside LTR `.table-num` cells and RTL pages alike.
 * e.g. `9 مئی 2026` or `5 محرم 1448`
 */
export function formatDayMonthYear(day, monthLabel, year) {
  const d = Number(day)
  const y = Number(year)
  const month = String(monthLabel || '').trim()
  if (!Number.isFinite(d) || !month || !Number.isFinite(y)) return '—'
  return `${LRI}${d}${PDI} ${month} ${LRI}${y}${PDI}`
}

function monthLabelFromObject(obj) {
  if (!obj?.month) return ''
  if (typeof obj.month === 'string') return obj.month
  return obj.month.name || obj.month.toString?.() || ''
}

function formatFromDateObject(obj) {
  return formatDayMonthYear(obj.day, monthLabelFromObject(obj), obj.year)
}

export function getStoredCalendarMode() {
  try {
    const m = localStorage.getItem(CALENDAR_MODE_KEY)
    return m === 'gregorian' ? 'gregorian' : 'hijri'
  } catch {
    return 'hijri'
  }
}

export function parseAppDate(value) {
  if (!value) return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  const s = String(value).trim()
  if (!s) return null
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
    return Number.isNaN(d.getTime()) ? null : d
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Gregorian yyyy-mm-dd for form values and API payloads only (not for display). */
export function toInputDate(d) {
  const parsed = parseAppDate(d)
  if (!parsed) return ''
  const y = parsed.getFullYear()
  const m = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * App-wide display date — day → month name → year.
 * - Urdu + اسلامی: `5 محرم 1448`
 * - Urdu + عیسوی: `9 مئی 2026`
 * - English + hijri mode: `3 Safar 1448`
 * - English + gregorian: `21 June 2026`
 */
export function formatDisplayDate(value, lng = 'ur', calendarMode) {
  const d = parseAppDate(value)
  if (!d) return '—'

  const isEn = (lng || 'ur').split('-')[0] === 'en'
  const mode = calendarMode || getStoredCalendarMode()

  try {
    if (mode === 'hijri') {
      const h = new DateObject({ date: d, calendar: hijriPakistan, locale: hijriUrduLocale })
      if (!isEn) return formatFromDateObject(h)
      const monthsEn = [
        'Muharram',
        'Safar',
        'Rabi al-Awwal',
        'Rabi al-Thani',
        'Jumada al-Awwal',
        'Jumada al-Thani',
        'Rajab',
        'Shaban',
        'Ramadan',
        'Shawwal',
        'Dhul Qadah',
        'Dhul Hijjah',
      ]
      const mi = (h.month?.number || 1) - 1
      return formatDayMonthYear(h.day, monthsEn[mi] || '', h.year)
    }
    if (isEn) {
      const g = new DateObject({ date: d, calendar: gregorian, locale: gregorian_en })
      return formatFromDateObject(g)
    }
    const g = new DateObject({ date: d, calendar: gregorian, locale: gregorianUrduLocale })
    return formatFromDateObject(g)
  } catch {
    const day = d.getDate()
    const month = d.getMonth()
    const year = d.getFullYear()
    if (isEn) {
      const months = gregorian_en.months.map((m) => m[0])
      return formatDayMonthYear(day, months[month], year)
    }
    const months =
      mode === 'hijri'
        ? hijriUrduLocale.months.map((m) => m[0])
        : gregorianUrduLocale.months.map((m) => m[0])
    return formatDayMonthYear(day, months[month], year)
  }
}
