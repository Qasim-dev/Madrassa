export const READING_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
}

export const READING_STATUS_LABELS = {
  NOT_STARTED: { en: 'Not started', ur: 'شروع نہیں' },
  IN_PROGRESS: { en: 'In progress', ur: 'جاری' },
  COMPLETED: { en: 'Completed', ur: 'مکمل' },
}

export function statusLabel(status, lng) {
  const key = lng?.startsWith('en') ? 'en' : 'ur'
  return READING_STATUS_LABELS[status]?.[key] || status
}
