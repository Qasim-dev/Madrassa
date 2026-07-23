import { useTranslation } from 'react-i18next'

function fmtWhen(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString()
}

function fmtValue(val) {
  if (val == null || val === '') return '—'
  if (typeof val !== 'object') return String(val)
  const parts = Object.entries(val)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
  return parts.length ? parts.join(' · ') : '—'
}

const ACTION_TONES = {
  publish: 'success',
  marks_changed: 'warning',
  unlock_reevaluation: 'info',
  grace_marks: 'purple',
  exam_deleted: 'danger',
  marks_submitted: 'teal',
}

export default function ExamAuditPanel({ logs, loading }) {
  const { t } = useTranslation()

  if (loading) {
    return (
      <div className="exam-panel exam-panel--audit">
        <p className="text-secondary small mb-0">{t('common.loading')}</p>
      </div>
    )
  }

  if (!logs?.length) {
    return (
      <div className="exam-panel exam-panel--empty">
        <p className="mb-0 text-secondary">{t('common.noRecords')}</p>
      </div>
    )
  }

  return (
    <div className="exam-audit">
      {logs.map((log) => {
        const tone = ACTION_TONES[log.action] || 'neutral'
        const actionLabel = t(`exam.audit.actions.${log.action}`, { defaultValue: log.action })

        return (
          <article key={log._id} className="exam-audit__item">
            <div className="exam-audit__head">
              <span className={`exam-audit__badge exam-audit__badge--${tone}`}>{actionLabel}</span>
              <span className="exam-audit__entity">{log.entityType}</span>
              <time className="exam-audit__time">{fmtWhen(log.changedAt || log.createdAt)}</time>
            </div>
            <div className="exam-audit__body">
              {(log.beforeValue != null || log.afterValue != null) && (
                <div className="exam-audit__diff">
                  {log.beforeValue != null && (
                    <div className="exam-audit__diff-col exam-audit__diff-col--before">
                      <span className="exam-audit__diff-label">{t('exam.audit.before')}</span>
                      <span className="exam-audit__diff-value">{fmtValue(log.beforeValue)}</span>
                    </div>
                  )}
                  {log.afterValue != null && (
                    <div className="exam-audit__diff-col exam-audit__diff-col--after">
                      <span className="exam-audit__diff-label">{t('exam.audit.after')}</span>
                      <span className="exam-audit__diff-value">{fmtValue(log.afterValue)}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="exam-audit__meta">
                {log.reason ? (
                  <span className="exam-audit__reason">
                    <strong>{t('exam.audit.reason')}:</strong> {log.reason}
                  </span>
                ) : null}
                <span className="exam-audit__user">{log.changedBy?.username || log.changedBy?.email || '—'}</span>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
