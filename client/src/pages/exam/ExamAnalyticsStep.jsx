import { useTranslation } from 'react-i18next'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts'
import { loc } from '../../shared/localized'
import ExamStepHeader from '../../components/exam/ExamStepHeader'
import AppKpiCards from '../../components/ui/AppKpiCards'

const CHART_COL = ['#0f8f5f', '#12a873', '#26ba99', '#5eead4', '#0b6e49', '#99f6e4']

export default function ExamAnalyticsStep({ lng, analytics, darajat, subjects }) {
  const { t } = useTranslation()

  return (
    <div className="exam-step-box">
      <ExamStepHeader title={t('exam.step.analytics')} />
      <AppKpiCards
        items={[
          { key: 'students', value: analytics.summary?.totalStudents ?? 0, label: t('exam.analytics.students'), tone: 'teal' },
          { key: 'avg', value: `${analytics.summary?.avgPercentage ?? 0}%`, label: t('exam.analytics.avgPct'), tone: 'blue' },
          { key: 'pass', value: `${analytics.summary?.passRate ?? 0}%`, label: t('exam.analytics.passRate'), tone: 'emerald' },
          { key: 'fail', value: analytics.summary?.failCount ?? 0, label: t('exam.analytics.failures'), tone: 'rose' },
        ]}
      />
      {analytics.classPerformance?.length > 0 && (
        <div className="exam-analytics-chart mb-4" style={{ height: '16rem' }}>
          <h3 className="exam-analytics-chart__title">{t('exam.analytics.classPerf')}</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={analytics.classPerformance.map((c) => ({
              name: darajat.find((d) => String(d._id) === String(c.darjahId))?.code || c.darjahId?.slice(-4),
              avg: c.avgPercentage,
              pass: c.passRate,
            }))}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="avg" fill={CHART_COL[0]} name={t('exam.analytics.avgPct')} />
              <Bar dataKey="pass" fill={CHART_COL[1]} name={t('exam.analytics.passRate')} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {analytics.weakSubjects?.length > 0 && (
        <div className="exam-analytics-list">
          <h3 className="exam-analytics-chart__title">{t('exam.analytics.weakSubjects')}</h3>
          <ul>
            {analytics.weakSubjects.map((ws) => (
              <li key={ws.subjectId}>
                {loc(subjects.find((s) => String(s._id) === String(ws.subjectId))?.name, lng) || ws.subjectId}
                {' — '}{t('exam.analytics.passRate')}: {ws.passRate}%
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
