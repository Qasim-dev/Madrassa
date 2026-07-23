/**
 * Calendar-day helpers for attendance (store/query using local midnight for a given YYYY-MM-DD).
 */

/** @param {string} dateStr - YYYY-MM-DD */
export function dayBoundsFromDateInput(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const m = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const start = new Date(y, mo - 1, d, 0, 0, 0, 0)
  const end = new Date(y, mo - 1, d, 23, 59, 59, 999)
  return { start, end }
}

/**
 * Normalize date from API body (prefer YYYY-MM-DD) to local start-of-day Date for consistent storage.
 * @param {string|Date} input
 */
export function normalizeAttendanceDate(input) {
  if (input == null) {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return t
  }
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}/.test(input.trim())) {
    const bounds = dayBoundsFromDateInput(input.trim().slice(0, 10))
    return bounds ? bounds.start : new Date(input)
  }
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return t
  }
  d.setHours(0, 0, 0, 0)
  return d
}

export function todayLocalBounds() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

/**
 * Calendar-day bounds for an attendance POST body (string or Date).
 * Used to find/update a single row per day (avoids duplicates when legacy rows used UTC midnight).
 */
export function dayBoundsFromAttendanceBody(dateInput) {
  if (dateInput == null) {
    return todayLocalBounds()
  }
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateInput.trim())) {
    const b = dayBoundsFromDateInput(dateInput.trim().slice(0, 10))
    if (b) return b
  }
  const n = normalizeAttendanceDate(dateInput)
  const y = n.getFullYear()
  const mo = n.getMonth()
  const d = n.getDate()
  const start = new Date(y, mo, d, 0, 0, 0, 0)
  const end = new Date(y, mo, d, 23, 59, 59, 999)
  return { start, end }
}

/** Map YYYY-MM-DD to timetable day id (sat–fri). */
export function timetableDayFromDateInput(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null
  const m = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  if (Number.isNaN(d.getTime())) return null
  const map = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  return map[d.getDay()]
}
