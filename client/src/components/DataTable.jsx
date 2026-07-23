import { BilingualThContent } from './BilingualLabel'

/**
 * Reusable data table — centered columns for RTL/LTR, dashboard-style shell.
 * @param columns {Array<{ key: string, headerKey?: string, header?: React.ReactNode, cell: Function, numeric?: boolean, hidePrint?: boolean, thClassName?: string, tdClassName?: string }>}
 */
export default function DataTable({
  columns,
  rows,
  getRowKey = (row, i) => row._id ?? row.id ?? i,
  emptyText,
  isLoading,
  loadingText = '…',
  className = '',
}) {
  if (isLoading) {
    return (
      <div className={`data-table-shell content-panel ${className}`.trim()}>
        <div className="data-table__loading text-secondary">{loadingText}</div>
      </div>
    )
  }

  return (
    <div className={`data-table-shell content-panel overflow-hidden print-block ${className}`.trim()}>
      <div className="table-responsive">
        <table className="table data-table mb-0 align-middle">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`data-table__th ${col.thClassName || ''} ${col.hidePrint ? 'no-print' : ''}`.trim()}
                >
                  {col.headerKey != null ? <BilingualThContent k={col.headerKey} /> : col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="data-table__empty">
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={String(getRowKey(row, i))} className="data-table__row">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`data-table__td ${col.numeric ? 'data-table__td--num' : ''} ${col.tdClassName || ''} ${col.hidePrint ? 'no-print' : ''}`.trim()}
                    >
                      {col.numeric ? (
                        <span className="table-num">{col.cell(row, i)}</span>
                      ) : (
                        col.cell(row, i)
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
