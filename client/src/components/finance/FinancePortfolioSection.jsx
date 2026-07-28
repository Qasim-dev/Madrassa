import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
  ReferenceLine,
} from 'recharts'
import { formatAmount } from '../../shared/financeDisplay'

export default function FinancePortfolioSection({
  t,
  isUr,
  chartGradId,
  fundCategoryChartRows,
  hasCategoryFlowData,
  portfolioYAxisW,
  portfolioChartMargin,
}) {
  return (
    <section className="finance-dash__portfolio" lang={isUr ? 'ur' : 'en'}>
      <header className="finance-dash__portfolio-head">
        <h2 className="finance-dash__portfolio-title">{t('finance.portfolioTitle')}</h2>
        <p className="finance-dash__portfolio-sub">{t('finance.portfolioSub')}</p>
      </header>

      <div className="finance-dash__portfolio-bento">
        <div className="finance-dash__glass-chart">
          <div className="finance-dash__glass-chart__head">
            <span className="finance-dash__glass-chart__kicker">{t('finance.chartCategoryFlow')}</span>
          </div>
          <div className="finance-dash__glass-chart__body">
            {hasCategoryFlowData ? (
              <div className="finance-dash__glass-chart__chart">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    layout="vertical"
                    data={fundCategoryChartRows}
                    margin={portfolioChartMargin}
                  >
                    <defs>
                      <linearGradient id={`${chartGradId}-recv`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#34d399" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                      <linearGradient id={`${chartGradId}-spent`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#f87171" />
                        <stop offset="100%" stopColor="#dc2626" />
                      </linearGradient>
                    </defs>
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => formatAmount(v)} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={portfolioYAxisW}
                      tick={{ fontSize: 10, fill: '#475569' }}
                      interval={0}
                    />
                    <Tooltip formatter={(v) => formatAmount(v)} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 12px 40px rgba(15,23,42,0.12)' }} />
                    <Legend verticalAlign="bottom" align="center" layout="horizontal" wrapperStyle={{ fontSize: 12 }} />
                    <Bar
                      dataKey="received"
                      fill={`url(#${chartGradId}-recv)`}
                      name={t('finance.received')}
                      radius={[0, 6, 6, 0]}
                      maxBarSize={28}
                    />
                    <Bar
                      dataKey="spent"
                      fill={`url(#${chartGradId}-spent)`}
                      name={t('finance.used')}
                      radius={[0, 6, 6, 0]}
                      maxBarSize={28}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="finance-dash__glass-chart__empty text-secondary small" dir={isUr ? 'rtl' : 'ltr'}>
                {t('finance.chartEmpty')}
              </div>
            )}
          </div>
        </div>

        <div className="finance-dash__glass-chart finance-dash__glass-chart--balance">
          <div className="finance-dash__glass-chart__head">
            <span className="finance-dash__glass-chart__kicker">{t('finance.chartCategoryBalance')}</span>
          </div>
          <div className="finance-dash__glass-chart__body">
            {fundCategoryChartRows.length ? (
              <div className="finance-dash__glass-chart__chart">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    layout="vertical"
                    data={fundCategoryChartRows}
                    margin={portfolioChartMargin}
                  >
                    <defs>
                      <linearGradient id={`${chartGradId}-pos`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#2dd4bf" />
                        <stop offset="100%" stopColor="#0f8f5f" />
                      </linearGradient>
                      <linearGradient id={`${chartGradId}-neg`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#fca5a5" />
                        <stop offset="100%" stopColor="#dc2626" />
                      </linearGradient>
                    </defs>
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => formatAmount(v)} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={portfolioYAxisW}
                      tick={{ fontSize: 10, fill: '#475569' }}
                      interval={0}
                    />
                    <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="5 5" />
                    <Tooltip formatter={(v) => formatAmount(v)} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 12px 40px rgba(15,23,42,0.12)' }} />
                    <Bar dataKey="remaining" name={t('finance.remaining')} radius={[0, 6, 6, 0]} maxBarSize={32}>
                      {fundCategoryChartRows.map((row, i) => (
                        <Cell
                          key={i}
                          fill={(row.remaining || 0) >= 0 ? `url(#${chartGradId}-pos)` : `url(#${chartGradId}-neg)`}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="finance-dash__glass-chart__empty text-secondary small" dir={isUr ? 'rtl' : 'ltr'}>
                {t('finance.chartEmpty')}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
