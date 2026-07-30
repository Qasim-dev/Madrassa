/**
 * Live attendance KPI strip — updates as marks change.
 */
export default function AttendanceSummaryCards({
  counts,
  t,
  filterStatus,
  onFilterStatus,
  totalLabel,
}) {
  const items = [
    {
      key: 'total',
      label: totalLabel || t('attendance.statTotal'),
      value: counts.total,
      tone: 'neutral',
      filter: '',
    },
    { key: 'present', label: t('attendance.statusPresent'), value: counts.present, tone: 'present', filter: 'present' },
    { key: 'absent', label: t('attendance.statusAbsent'), value: counts.absent, tone: 'absent', filter: 'absent' },
    { key: 'sick', label: t('attendance.statusSick'), value: counts.sick, tone: 'leave', filter: 'sick' },
    { key: 'late', label: t('attendance.statusLate'), value: counts.late, tone: 'late', filter: 'late' },
  ]

  return (
    <div className="att-summary" role="group" aria-label={t('attendance.liveStats')}>
      {items.map((item) => {
        const active = filterStatus === item.filter || (item.filter === '' && !filterStatus)
        return (
          <button
            key={item.key}
            type="button"
            className={`att-summary__card att-summary__card--${item.tone}${active ? ' is-active' : ''}`}
            onClick={() => onFilterStatus?.(item.filter)}
            aria-pressed={active}
          >
            <span className="att-summary__value table-num">{item.value}</span>
            <span className="att-summary__label">{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
