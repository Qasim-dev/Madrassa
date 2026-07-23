import { useMemo, useRef, useState, useCallback } from 'react'
import { flushSync } from 'react-dom'
import DatePickerImport from 'react-multi-date-picker'
import ToolbarImport from 'react-multi-date-picker/plugins/toolbar'
import DateObject from 'react-date-object'
import hijriPakistan from '../shared/hijriPakistanCalendar.js'
import gregorian from 'react-date-object/calendars/gregorian'
import gregorian_en from 'react-date-object/locales/gregorian_en'
import hijriUrduLocale from '../shared/hijriUrduLocale.js'
import gregorianUrduLocale from '../shared/gregorianUrduLocale.js'
import { DATE_DISPLAY_FORMAT, parseAppDate, toInputDate } from '../shared/formatDisplayDate.js'
import { useCalendarMode } from '../app/calendarMode.jsx'

/** Vite/CJS interop sometimes yields `{ default: Component }` (or nested); React needs the component itself. */
function unwrapDefault(mod) {
  let x = mod
  for (let i = 0; i < 2 && x && typeof x === 'object' && 'default' in x; i += 1) {
    x = x.default
  }
  return x
}

const DatePicker = unwrapDefault(DatePickerImport)
const Toolbar = unwrapDefault(ToolbarImport)

const MIN_SELECTABLE_YEAR = 1926
const MAX_SELECTABLE_YEAR = 2126
/** Approximate open calendar height (header + weeks + toolbar). */
const CALENDAR_ESTIMATE_PX = 390

const MIN_SELECTABLE_DATE = new Date(MIN_SELECTABLE_YEAR, 0, 1)
const MAX_SELECTABLE_DATE = new Date(MAX_SELECTABLE_YEAR, 11, 31, 23, 59, 59, 999)

/** Build a picker DateObject in the active calendar (Gregorian anchor → convert). */
function toPickerDateObject(jsDate, cal, locale) {
  if (!jsDate) return null
  try {
    const obj = new DateObject({ date: jsDate, calendar: gregorian, locale: gregorian_en })
    if (cal?.name && cal.name !== gregorian.name) {
      obj.convert(cal)
    }
    if (locale) obj.setLocale(locale)
    return obj
  } catch {
    return null
  }
}

function pickerDateToIso(dateObj) {
  if (!dateObj) return ''
  try {
    const clone = new DateObject(dateObj)
    clone.convert(gregorian, gregorian_en)
    return toInputDate(clone.toDate())
  } catch {
    return ''
  }
}

function defaultPosition(isUr) {
  return isUr ? 'bottom-right' : 'bottom-left'
}

/**
 * Prefer opening above the field when there is not enough viewport space below.
 */
function pickCalendarPosition(anchorEl, isUr) {
  if (!anchorEl || typeof window === 'undefined') return defaultPosition(isUr)
  const rect = anchorEl.getBoundingClientRect()
  const gap = 12
  const spaceBelow = window.innerHeight - rect.bottom - gap
  const spaceAbove = rect.top - gap
  const inModal = Boolean(
    anchorEl.closest(
      '.modal, .modal-dialog, .modal-app-dialog, .modal-app-card, [role="dialog"], .app-modal'
    )
  )
  // Prefer above when below is tight (common in modals near the viewport bottom).
  const openUp =
    (spaceBelow < CALENDAR_ESTIMATE_PX && spaceAbove > spaceBelow) ||
    (inModal && spaceAbove >= 260 && spaceBelow < CALENDAR_ESTIMATE_PX)
  if (openUp) return isUr ? 'top-right' : 'top-left'
  return defaultPosition(isUr)
}

/**
 * App-wide date input — day → month → year display; stores Gregorian yyyy-mm-dd.
 */
export default function AppDateInput({
  id,
  value,
  onChange,
  lng,
  className = '',
  disabled,
  emptyCalendarYear,
}) {
  const isUr = (lng || 'ur').split('-')[0] === 'ur'
  const { mode } = useCalendarMode()
  const wrapRef = useRef(null)
  const [calendarPosition, setCalendarPosition] = useState(() => defaultPosition(isUr))

  const minD = MIN_SELECTABLE_DATE
  const maxD = MAX_SELECTABLE_DATE

  const cal = isUr ? (mode === 'hijri' ? hijriPakistan : gregorian) : gregorian
  const locale = isUr ? (mode === 'hijri' ? hijriUrduLocale : gregorianUrduLocale) : gregorian_en
  const pickerKey = `${isUr ? mode : 'en'}-${locale.name}-${cal.name || 'g'}`

  const minDateObj = useMemo(() => toPickerDateObject(minD, cal, locale), [cal, locale])

  const maxDateObj = useMemo(() => toPickerDateObject(maxD, cal, locale), [cal, locale])

  const pickerValue = useMemo(() => {
    const parsed = parseAppDate(value)
    return parsed ? toPickerDateObject(parsed, cal, locale) : null
  }, [value, cal, locale])

  const hasValue = Boolean(pickerValue)

  const currentDateWhenEmpty = useMemo(() => {
    if (pickerValue != null) return undefined
    const y = Number(emptyCalendarYear)
    const anchor = Number.isFinite(y) ? y : new Date().getFullYear()
    return toPickerDateObject(new Date(anchor, 5, 15), cal, locale) ?? undefined
  }, [pickerValue, emptyCalendarYear, cal, locale])

  const toolbarPlugin = useMemo(
    () => (
      <Toolbar
        key="date-toolbar"
        position="bottom"
        sort={['close', 'today']}
        names={
          isUr
            ? { today: 'آج', close: 'منتخب کریں' }
            : { today: 'Today', close: 'Select' }
        }
      />
    ),
    [isUr]
  )

  const prepareOpen = useCallback(() => {
    const next = pickCalendarPosition(wrapRef.current, isUr)
    flushSync(() => {
      setCalendarPosition(next)
    })
  }, [isUr])

  /**
   * Popper uses transform (top:0), so we only clamp max-height to the space
   * from the panel’s current top down to the viewport. That keeps the box on
   * screen; overflow-y:auto then scrolls only when content is taller.
   */
  const fitCalendarInViewport = useCallback(() => {
    const run = () => {
      const all = document.querySelectorAll('.rmdp-wrapper')
      const wrap = all[all.length - 1]
      if (!(wrap instanceof HTMLElement) || typeof window === 'undefined') return

      const margin = 8
      const maxCap = 420
      const vh = window.innerHeight
      const rect = wrap.getBoundingClientRect()
      const top = Math.max(margin, rect.top)
      const available = Math.max(160, vh - top - margin)
      const maxH = Math.min(maxCap, available)

      wrap.style.setProperty('max-height', `${maxH}px`, 'important')
      wrap.style.overflowX = 'hidden'
      wrap.style.overflowY = 'auto'
    }
    requestAnimationFrame(() => requestAnimationFrame(run))
  }, [])

  const inputClass = [
    'app-field__control',
    'app-field__control--sm',
    'w-100',
    className.includes('latin-input') || !isUr ? 'app-field__control--latin' : '',
    hasValue && !disabled ? 'app-date-input__field--has-clear' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  const calendarClass = [
    !isUr ? 'gregorian-calendar' : mode === 'hijri' ? 'islamic-urdu-calendar' : 'gregorian-calendar gregorian-urdu-calendar',
    'app-rmdp-calendar',
  ].join(' ')

  function clearDate(e) {
    e.preventDefault()
    e.stopPropagation()
    onChange?.('')
  }

  return (
    <div
      ref={wrapRef}
      className={`app-date-input-wrap${hasValue && !disabled ? ' app-date-input-wrap--clearable' : ''}`}
      onPointerDownCapture={prepareOpen}
      onFocusCapture={prepareOpen}
    >
      <DatePicker
        key={pickerKey}
        id={id}
        calendar={cal}
        locale={locale}
        minDate={minDateObj}
        maxDate={maxDateObj}
        {...(currentDateWhenEmpty ? { currentDate: currentDateWhenEmpty } : {})}
        value={pickerValue}
        onChange={(picked) => {
          if (!picked) {
            onChange?.('')
            return
          }
          const d = Array.isArray(picked) ? picked[picked.length - 1] : picked
          const iso = pickerDateToIso(d)
          if (iso) onChange?.(iso)
        }}
        inputClass={inputClass}
        containerClassName={`app-date-input w-100${isUr ? ' app-date-input--ur' : ' app-date-input--en'}`}
        calendarPosition={calendarPosition}
        disabled={disabled}
        editable={false}
        portal
        portalTarget={typeof document !== 'undefined' ? document.body : undefined}
        zIndex={12050}
        fixMainPosition={false}
        scrollSensitive
        onOpen={() => {
          prepareOpen()
          fitCalendarInViewport()
        }}
        onPositionChange={() => {
          // Re-clamp after the library places the popper (once per open/move).
          fitCalendarInViewport()
        }}
        format={DATE_DISPLAY_FORMAT}
        digits={['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']}
        weekStartDayIndex={0}
        plugins={[toolbarPlugin]}
        className={calendarClass}
      />
      {hasValue && !disabled ? (
        <button
          type="button"
          className="app-date-input__clear"
          onClick={clearDate}
          onMouseDown={(e) => e.preventDefault()}
          aria-label={isUr ? 'تاریخ ہٹائیں' : 'Clear date'}
          title={isUr ? 'تاریخ ہٹائیں' : 'Clear date'}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M3.5 3.5l7 7M10.5 3.5l-7 7"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </button>
      ) : null}
    </div>
  )
}
