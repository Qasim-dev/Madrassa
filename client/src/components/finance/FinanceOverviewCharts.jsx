import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { CHART_COLORS, formatAmount } from '../../shared/financeDisplay'

export default function FinanceOverviewCharts({ barData, barDataHasData, pieData, expPie, t, isUr }) {
  return (
    <div className="finance-dash__charts">
      <div className="finance-dash__chart-card">
        <div className="finance-dash__chart-title">{t('finance.chartMonthly')}</div>
        <div className="finance-dash__chart-body">
          {barDataHasData ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} margin={{ top: 8, right: 8, left: 4, bottom: 8 }}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatAmount(v)} />
                <Legend verticalAlign="bottom" align="center" layout="horizontal" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="income" fill="#10b981" name={t('finance.typeIncome')} radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="#f87171" name={t('finance.typeExpense')} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="finance-dash__chart-empty text-secondary small" dir={isUr ? 'rtl' : 'ltr'}>
              {t('finance.chartEmpty')}
            </div>
          )}
        </div>
      </div>
      <div className="finance-dash__chart-card">
        <div className="finance-dash__chart-title">{t('finance.chartFundPie')}</div>
        <div className="finance-dash__chart-body">
          {pieData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="42%"
                  outerRadius={78}
                  paddingAngle={1}
                  label={false}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatAmount(v)} />
                <Legend verticalAlign="bottom" align="center" layout="horizontal" wrapperStyle={{ fontSize: '0.78rem' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="finance-dash__chart-empty text-secondary small" dir={isUr ? 'rtl' : 'ltr'}>
              {t('finance.chartEmpty')}
            </div>
          )}
        </div>
      </div>
      <div className="finance-dash__chart-card">
        <div className="finance-dash__chart-title">{t('finance.chartExpense')}</div>
        <div className="finance-dash__chart-body">
          {expPie.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <Pie
                  data={expPie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="42%"
                  outerRadius={78}
                  paddingAngle={1}
                  label={false}
                >
                  {expPie.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatAmount(v)} />
                <Legend verticalAlign="bottom" align="center" layout="horizontal" wrapperStyle={{ fontSize: '0.78rem' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="finance-dash__chart-empty text-secondary small" dir={isUr ? 'rtl' : 'ltr'}>
              {t('finance.chartEmpty')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
