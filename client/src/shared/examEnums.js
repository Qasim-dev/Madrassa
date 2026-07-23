/** Client-side exam enums mirroring server constants */

export const EXAM_CONTAINER_STATUS = [
  'draft',
  'configured',
  'active',
  'marks_entry',
  'processing',
  'published',
  'closed',
]

export const EXAM_PIPELINE_STATUS = [
  'pending',
  'configured',
  'snapshot_taken',
  'active',
  'locked',
]

export const EXAM_ATTENDANCE_STATUS = ['present', 'absent', 'leave', 'medical_leave']

export const EXAM_MARKS_STATUS = ['draft', 'submitted', 'locked']

export const EXAM_SUBJECT_TYPES = ['written', 'oral', 'practical', 'hifz', 'other']

const EXAM_SUBJECT_TYPE_LABELS = {
  written: { ur: 'تحریری', en: 'Written' },
  oral: { ur: 'زبانی', en: 'Oral' },
  practical: { ur: 'عملی', en: 'Practical' },
  hifz: { ur: 'حفظ', en: 'Hifz' },
  other: { ur: 'دیگر', en: 'Other' },
}

export function examSubjectTypeLabel(type, lng = 'ur') {
  const lang = lng?.startsWith('en') ? 'en' : 'ur'
  return EXAM_SUBJECT_TYPE_LABELS[type]?.[lang] || EXAM_SUBJECT_TYPE_LABELS[type]?.en || type
}

export const EXAM_PUBLICATION_LEVELS = ['student', 'section', 'class', 'exam']

export const SEMINARY_DIVISIONS = [
  { key: 'mumtaz', min: 80, label: { ur: 'ممتاز', en: 'Mumtaz' } },
  { key: 'jayyid_jiddan', min: 70, label: { ur: 'جید جداً', en: 'Jayyid Jiddan' } },
  { key: 'jayyid', min: 60, label: { ur: 'جید', en: 'Jayyid' } },
  { key: 'maqbool', min: 50, label: { ur: 'مقبول', en: 'Maqbool' } },
  { key: 'rasib', min: 0, label: { ur: 'راسب', en: 'Rasib' } },
  { key: 'fail', min: -1, label: { ur: 'ناکام', en: 'Fail' } },
  { key: 'absent', min: -2, label: { ur: 'غائب', en: 'Absent' } },
]

export const EXAM_WORKFLOW_STEPS = [
  'containers',
  'classes',
  'subjects',
  'snapshot',
  'schedule',
  'attendance',
  'marks',
  'results',
  'announce',
  'analytics',
  'audit',
]

const EXAM_STATUS_RANK = {
  draft: 0,
  configured: 1,
  active: 2,
  marks_entry: 3,
  processing: 4,
  published: 5,
  closed: 5,
}

/**
 * Progressive workflow gate: a step is enabled only when every previous step is complete.
 * View-only trailing steps (analytics, audit) do not block each other once announce is done.
 */
export function getExamWorkflowGate({
  selectedExamId,
  examCount = 0,
  examStatus,
  pipelineCount = 0,
  pipelinesConfigured = false,
  pipelinesSnapshotTaken = false,
  subjectMappingCount = 0,
  snapshotCount = 0,
  scheduleCount = 0,
  attendanceCount = 0,
  marksReady = false,
  resultsProcessed = false,
  hasPublished = false,
} = {}) {
  const rank = EXAM_STATUS_RANK[examStatus] ?? 0

  const completed = {
    containers: Boolean(selectedExamId) || examCount > 0,
    classes: pipelineCount > 0,
    subjects: subjectMappingCount > 0 || pipelinesConfigured || rank >= 3,
    snapshot: snapshotCount > 0 || pipelinesSnapshotTaken || rank >= 3,
    schedule: scheduleCount > 0 || rank >= 3,
    attendance: attendanceCount > 0 || rank >= 3,
    marks: marksReady || rank >= 3,
    results: resultsProcessed || rank >= 4,
    announce: hasPublished || rank >= 5,
    analytics: true,
    audit: true,
  }

  const enabled = {}
  const done = {}
  let allPreviousComplete = true

  for (const step of EXAM_WORKFLOW_STEPS) {
    enabled[step] = allPreviousComplete
    done[step] = Boolean(completed[step])
    if (!completed[step]) allPreviousComplete = false
  }

  // Always allow the current furthest reachable step to stay usable.
  const firstLocked = EXAM_WORKFLOW_STEPS.find((s) => !enabled[s])
  const maxEnabledIndex = firstLocked
    ? EXAM_WORKFLOW_STEPS.indexOf(firstLocked) - 1
    : EXAM_WORKFLOW_STEPS.length - 1

  return {
    completed,
    enabled,
    done,
    maxEnabledStep: EXAM_WORKFLOW_STEPS[Math.max(0, maxEnabledIndex)] || 'containers',
  }
}

/** User-friendly phases grouping workflow steps */
export const EXAM_PHASES = [
  {
    id: 'setup',
    steps: ['containers', 'classes', 'subjects'],
  },
  {
    id: 'roster',
    steps: ['snapshot', 'schedule'],
  },
  {
    id: 'exam',
    steps: ['attendance', 'marks'],
  },
  {
    id: 'results',
    steps: ['results', 'announce', 'analytics', 'audit'],
  },
]

export function stepPhase(step) {
  for (const p of EXAM_PHASES) {
    if (p.steps.includes(step)) return p.id
  }
  return 'setup'
}

export function divisionLabel(key, lng = 'ur') {
  const d = SEMINARY_DIVISIONS.find((x) => x.key === key)
  return d ? d.label[lng] || d.label.en : key
}

/** Class rank ordinal for certificate — 1 → اول، 2 → دوم، … */
export function classRankOrdinal(rank, lng = 'ur') {
  if (rank == null || rank === '') return '—'
  const n = Number(rank)
  if (!Number.isFinite(n) || n < 1) return String(rank)
  if (lng?.startsWith('en')) {
    const en = ['', '1st', '2nd', '3rd']
    if (n <= 3) return en[n]
    return `${n}th`
  }
  const ur = ['', 'اول', 'دوم', 'سوم', 'چہارم', 'پنجم', 'ششم', 'ہفتم', 'ہشتم', 'نهم', 'دہم']
  if (n < ur.length) return ur[n]
  return String(n)
}

export function statusLabel(status, lng = 'ur') {
  const map = {
    draft: { ur: 'مسودہ', en: 'Draft' },
    configured: { ur: 'ترتیب شدہ', en: 'Configured' },
    active: { ur: 'فعال', en: 'Active' },
    marks_entry: { ur: 'نمبر داخل', en: 'Marks Entry' },
    processing: { ur: 'نتائج تیار', en: 'Processing' },
    published: { ur: 'شائع', en: 'Published' },
    closed: { ur: 'بند', en: 'Closed' },
    pending: { ur: 'زیر التوا', en: 'Pending' },
    snapshot_taken: { ur: 'رجسٹر بنایا', en: 'Snapshot Taken' },
    locked: { ur: 'مقفل', en: 'Locked' },
    present: { ur: 'حاضر', en: 'Present' },
    absent: { ur: 'غائب', en: 'Absent' },
    leave: { ur: 'رخصت', en: 'Leave' },
    medical_leave: { ur: 'طبی رخصت', en: 'Medical Leave' },
  }
  return map[status]?.[lng] || map[status]?.en || status
}
