import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { loc } from '../shared/localized'

function ChartSummaryPills({ items }) {
  return (
    <div className="dashboard-chart-summary d-flex flex-wrap gap-2 mb-3">
      {items.map((item) => (
        <span
          key={item.label}
          className={`dashboard-chart-summary__pill dashboard-chart-summary__pill--${item.tone}`}
        >
          <span className="dashboard-chart-summary__pill-label">{item.label}</span>
          <span className="dashboard-chart-summary__pill-value table-num">{item.value}</span>
        </span>
      ))}
    </div>
  )
}

function AttendanceChartCard({ title, subtitle, rows, emptyLabel, summaryItems, children }) {
  return (
    <div className="dashboard-chart-card h-100">
      <div className="dashboard-chart-card__head">
        <h3 className="dashboard-chart-card__title h6 fw-semibold">{title}</h3>
        {subtitle ? <p className="dashboard-chart-card__subtitle small mb-0">{subtitle}</p> : null}
      </div>
      {summaryItems?.length > 0 ? <ChartSummaryPills items={summaryItems} /> : null}
      <div className="dashboard-chart-card__canvas">
        {rows.length > 0 ? children : (
          <div className="dashboard-chart-card__empty d-flex align-items-center justify-content-center text-secondary small">
            {emptyLabel}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Visual summary of today's per–class attendance (student + teacher charts side by side).
 */
export default function DashboardAttendanceCharts({ byDarja, lng, t }) {
  const studentRows = useMemo(
    () =>
      (byDarja || []).map((g) => ({
        code: g.code || '—',
        full: [loc(g.name, lng), g.section].filter(Boolean).join(' · '),
        present: g.student?.present ?? 0,
        absent: g.student?.absent ?? 0,
        sick: g.student?.sick ?? 0,
        sheets: g.student?.sheets ?? 0,
      })),
    [byDarja, lng]
  )

  const teacherRows = useMemo(
    () =>
      (byDarja || []).map((g) => ({
        code: g.code || '—',
        full: [loc(g.name, lng), g.section].filter(Boolean).join(' · '),
        present: g.teacher?.present ?? 0,
        absent: g.teacher?.absent ?? 0,
        records: g.teacher?.records ?? 0,
      })),
    [byDarja, lng]
  )

  const studentTotals = useMemo(
    () =>
      studentRows.reduce(
        (acc, row) => ({
          present: acc.present + row.present,
          absent: acc.absent + row.absent,
          sick: acc.sick + row.sick,
          sheets: acc.sheets + row.sheets,
        }),
        { present: 0, absent: 0, sick: 0, sheets: 0 }
      ),
    [studentRows]
  )

  const teacherTotals = useMemo(
    () =>
      teacherRows.reduce(
        (acc, row) => ({
          present: acc.present + row.present,
          absent: acc.absent + row.absent,
          records: acc.records + row.records,
        }),
        { present: 0, absent: 0, records: 0 }
      ),
    [teacherRows]
  )

  return (
    <div className="dashboard-attendance-charts px-2 px-md-3 pb-3">
      <div className="row g-3">
        <div className="col-lg-6">
          <AttendanceChartCard
            title={t('dashboard.chartStudentsTitle')}
            subtitle={t('dashboard.chartStudentsSubtitle')}
            rows={studentRows}
            emptyLabel={t('dashboard.chartEmpty')}
            summaryItems={[
              { label: t('dashboard.legendPresent'), value: studentTotals.present, tone: 'teal' },
              { label: t('dashboard.legendAbsent'), value: studentTotals.absent, tone: 'orange' },
              { label: t('dashboard.legendSick'), value: studentTotals.sick, tone: 'violet' },
              { label: t('dashboard.chartSheetsShort'), value: studentTotals.sheets, tone: 'slate' },
            ]}
          >
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={studentRows} margin={{ top: 8, right: 8, left: 0, bottom: 4 }} barCategoryGap="18%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="code" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(38, 186, 153, 0.06)' }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    const row = studentRows.find((r) => r.code === label)
                    return (
                      <div className="rounded-3 border border-slate-200 bg-white px-3 py-2 shadow-sm small">
                        <div className="fw-semibold text-slate-800 mb-1">{row?.full || label}</div>
                        {payload.map((p) => (
                          <div key={String(p.dataKey)} className="d-flex justify-content-between gap-4 table-num">
                            <span style={{ color: p.color }}>{p.name}</span>
                            <span>{p.value}</span>
                          </div>
                        ))}
                        {row?.sheets ? (
                          <div className="text-slate-500 mt-1 pt-1 border-top border-slate-100 table-num">
                            {t('dashboard.chartSheetsSaved', { n: row.sheets })}
                          </div>
                        ) : null}
                      </div>
                    )
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="present" name={t('dashboard.legendPresent')} stackId="a" fill="#0f8f5f" />
                <Bar dataKey="absent" name={t('dashboard.legendAbsent')} stackId="a" fill="#d97706" />
                <Bar dataKey="sick" name={t('dashboard.legendSick')} stackId="a" fill="#6f7480" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </AttendanceChartCard>
        </div>

        <div className="col-lg-6">
          <AttendanceChartCard
            title={t('dashboard.chartTeachersTitle')}
            subtitle={t('dashboard.chartTeachersSubtitle')}
            rows={teacherRows}
            emptyLabel={t('dashboard.chartEmpty')}
            summaryItems={[
              { label: t('dashboard.legendPresent'), value: teacherTotals.present, tone: 'teal' },
              { label: t('dashboard.legendAbsent'), value: teacherTotals.absent, tone: 'slate' },
              { label: t('dashboard.chartMarksShort'), value: teacherTotals.records, tone: 'cyan' },
            ]}
          >
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={teacherRows} margin={{ top: 8, right: 8, left: 0, bottom: 4 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="code" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(38, 186, 153, 0.06)' }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    const row = teacherRows.find((r) => r.code === label)
                    return (
                      <div className="rounded-3 border border-slate-200 bg-white px-3 py-2 shadow-sm small">
                        <div className="fw-semibold text-slate-800 mb-1">{row?.full || label}</div>
                        {payload.map((p) => (
                          <div key={String(p.dataKey)} className="d-flex justify-content-between gap-4 table-num">
                            <span style={{ color: p.color }}>{p.name}</span>
                            <span>{p.value}</span>
                          </div>
                        ))}
                        {row?.records != null ? (
                          <div className="text-slate-500 mt-1 pt-1 border-top border-slate-100 table-num">
                            {t('dashboard.chartTeacherMarks', { n: row.records })}
                          </div>
                        ) : null}
                      </div>
                    )
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="present" name={t('dashboard.legendPresent')} fill="#0f8f5f" radius={[6, 6, 0, 0]} maxBarSize={36} />
                <Bar dataKey="absent" name={t('dashboard.legendAbsent')} fill="#6f7480" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </AttendanceChartCard>
        </div>
      </div>
    </div>
  )
}
