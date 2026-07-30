export const DAILY_PERIOD = 'daily'

export const STATUS_LABEL_KEYS = {
  present: 'attendance.statusPresent',
  absent: 'attendance.statusAbsent',
  sick: 'attendance.statusSick',
  late: 'attendance.statusLate',
}

export const ATTENDANCE_STATUSES = ['present', 'absent', 'sick', 'late']

export const STATUS_TONES = {
  present: 'present',
  absent: 'absent',
  sick: 'leave',
  late: 'late',
}

export function monthBounds(ym) {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) {
    const d = new Date()
    ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  const [y, m] = ym.split('-').map(Number)
  const from = `${ym}-01`
  const last = new Date(y, m, 0).getDate()
  const to = `${ym}-${String(last).padStart(2, '0')}`
  return { from, to, ym }
}

export function statusLabel(t, status) {
  return STATUS_LABEL_KEYS[status] ? t(STATUS_LABEL_KEYS[status]) : status
}

export function countByStatus(ids, entries, defaultStatus = 'present') {
  const counts = { present: 0, absent: 0, sick: 0, late: 0, total: ids.length }
  for (const id of ids) {
    const st = entries[id] || defaultStatus
    if (counts[st] != null) counts[st] += 1
    else counts.present += 1
  }
  return counts
}
