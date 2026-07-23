/** Exam container lifecycle statuses */
export const EXAM_CONTAINER_STATUS = [
  'draft',
  'configured',
  'active',
  'marks_entry',
  'processing',
  'published',
  'closed',
];

/** Class pipeline statuses within an exam */
export const EXAM_PIPELINE_STATUS = [
  'pending',
  'configured',
  'snapshot_taken',
  'active',
  'locked',
];

export const EXAM_ATTENDANCE_STATUS = ['present', 'absent', 'leave', 'medical_leave'];

export const EXAM_MARKS_STATUS = ['draft', 'submitted', 'locked'];

export const EXAM_SUBJECT_TYPES = ['written', 'oral', 'practical', 'hifz', 'other'];

export const EXAM_PUBLICATION_LEVELS = ['student', 'section', 'class', 'exam'];

/** Islamic seminary division thresholds (percentage-based) */
export const SEMINARY_DIVISIONS = [
  { key: 'mumtaz', min: 80, label: { ur: 'ممتاز', en: 'Mumtaz' } },
  { key: 'jayyid_jiddan', min: 70, label: { ur: 'جید جداً', en: 'Jayyid Jiddan' } },
  { key: 'jayyid', min: 60, label: { ur: 'جید', en: 'Jayyid' } },
  { key: 'maqbool', min: 50, label: { ur: 'مقبول', en: 'Maqbool' } },
  { key: 'rasib', min: 0, label: { ur: 'راسب', en: 'Rasib' } },
];

export function computeDivision(percentage, passingPercentage = 50) {
  if (percentage < passingPercentage) return 'fail';
  for (const d of SEMINARY_DIVISIONS) {
    if (percentage >= d.min) return d.key;
  }
  return 'rasib';
}
