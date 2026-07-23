import { useTranslation } from 'react-i18next'
import AppKpiCards from '../ui/AppKpiCards.jsx'

const ICONS = {
  active: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
    </svg>
  ),
  pending: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  published: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <path d="M22 4L12 14.01l-3-3" />
    </svg>
  ),
  pass: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  ),
}

/** Maps each KPI card to an exam workflow step. */
export const EXAM_DASH_CARD_STEPS = {
  active: 'containers',
  pending: 'marks',
  published: 'announce',
  pass: 'analytics',
}

export default function ExamDashboardCards({ stats, loading, onCardClick }) {
  const { t } = useTranslation()

  if (!loading && !stats) return null

  const cards = stats
    ? [
        {
          key: 'active',
          step: EXAM_DASH_CARD_STEPS.active,
          value: stats.activeExams ?? 0,
          label: t('exam.dash.activeExams'),
          tone: 'teal',
          icon: ICONS.active,
        },
        {
          key: 'pending',
          step: EXAM_DASH_CARD_STEPS.pending,
          value: stats.pendingMarks ?? 0,
          label: t('exam.dash.pendingMarks'),
          tone: 'amber',
          icon: ICONS.pending,
        },
        {
          key: 'published',
          step: EXAM_DASH_CARD_STEPS.published,
          value: stats.publishedExams ?? 0,
          label: t('exam.dash.resultsPublished'),
          tone: 'blue',
          icon: ICONS.published,
        },
        {
          key: 'pass',
          step: EXAM_DASH_CARD_STEPS.pass,
          value: `${stats.passRate ?? 0}%`,
          label: t('exam.dash.passPercentage'),
          tone: 'rose',
          icon: ICONS.pass,
        },
      ]
    : []

  return (
    <AppKpiCards
      loading={loading}
      items={cards}
      onCardClick={(item) => onCardClick?.(item.step, item.key)}
    />
  )
}
