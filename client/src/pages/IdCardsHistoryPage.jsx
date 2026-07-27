import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGetIdCardPrintHistoryQuery } from '../services/api'
import PageHeading from '../components/PageHeading'
import { formatDisplayDate } from '../shared/formatDisplayDate'
import { useCalendarMode } from '../app/calendarMode'
import './idCardsPage.css'
import './studentsPage.css'

export default function IdCardsHistoryPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const en = lng?.toLowerCase().startsWith('en')
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { mode } = useCalendarMode()
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)

  const { data, isLoading } = useGetIdCardPrintHistoryQuery({ page, limit: 20 })
  const items = data?.items ?? []
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 }

  const typeLabel = useMemo(
    () => ({
      single: en ? 'Single' : 'اکیلا',
      selected: en ? 'Selected' : 'منتخب',
      class: en ? 'Class' : 'کلاس',
      session: en ? 'Session' : 'سیشن',
      bulk: en ? 'Bulk' : 'بلک',
    }),
    [en]
  )

  return (
    <div>
      <PageHeading navKey="navIdCardsHistory">
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => navigate('/id-cards')}>
          {t('idCards.backToHub')}
        </button>
      </PageHeading>

      <div className="id-cards-table-wrap">
        {isLoading ? (
          <p className="p-3 text-secondary mb-0">{t('common.loading')}</p>
        ) : items.length === 0 ? (
          <p className="p-3 text-secondary mb-0">{t('common.noRecords')}</p>
        ) : (
          <table className="id-cards-table">
            <thead>
              <tr>
                <th>{en ? 'Printed on' : 'پرنٹ تاریخ'}</th>
                <th>{en ? 'By' : 'از طرف'}</th>
                <th>{en ? 'Template' : 'ٹیمپلیٹ'}</th>
                <th>{en ? 'Type' : 'قسم'}</th>
                <th>{en ? 'Students' : 'طلباء'}</th>
                <th>{en ? 'Copies' : 'کاپیاں'}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row._id}>
                  <td>{formatDisplayDate(row.printedAt, lng, mode)}</td>
                  <td>{row.printedBy?.username || row.printedBy?.name || '—'}</td>
                  <td dir="ltr">{row.templateKey}</td>
                  <td>{typeLabel[row.printType] || row.printType}</td>
                  <td dir="ltr">{Array.isArray(row.studentIds) ? row.studentIds.length : 0}</td>
                  <td dir="ltr">{row.copies || 1}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination.totalPages > 1 ? (
        <div className="d-flex gap-2 mt-3">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            disabled={page <= 1}
            onClick={() => setSearchParams({ page: String(page - 1) })}
          >
            {en ? 'Prev' : 'پچھلا'}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            disabled={page >= pagination.totalPages}
            onClick={() => setSearchParams({ page: String(page + 1) })}
          >
            {en ? 'Next' : 'اگلا'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
