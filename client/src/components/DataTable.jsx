import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { BilingualThContent } from './BilingualLabel'

const VIRTUALIZE_THRESHOLD = 40
const ESTIMATED_ROW_HEIGHT = 48
const VIRTUAL_VIEWPORT_MAX = 420

/**
 * Reusable data table — centered columns for RTL/LTR, dashboard-style shell.
 * Large row sets window with @tanstack/react-virtual.
 * @param columns {Array<{ key: string, headerKey?: string, header?: React.ReactNode, cell: Function, numeric?: boolean, hidePrint?: boolean, thClassName?: string, tdClassName?: string }>}
 * @param fillScroll When true, table body scrolls inside the shell and thead stays sticky.
 */
export default function DataTable({
  columns,
  rows,
  getRowKey = (row, i) => row._id ?? row.id ?? i,
  emptyText,
  isLoading,
  loadingText = '…',
  className = '',
  virtualizeThreshold = VIRTUALIZE_THRESHOLD,
  fillScroll = false,
}) {
  const parentRef = useRef(null)
  const useVirtual = !isLoading && rows.length > virtualizeThreshold

  const virtualizer = useVirtualizer({
    count: useVirtual ? rows.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 8,
  })

  if (isLoading) {
    return (
      <div
        className={`data-table-shell content-panel ${fillScroll ? 'data-table-shell--fill-scroll' : ''} ${className}`.trim()}
        role="status"
        aria-busy="true"
      >
        <div className="data-table__loading text-secondary">{loadingText}</div>
      </div>
    )
  }

  function renderCells(row, i) {
    return columns.map((col) => (
      <td
        key={col.key}
        className={`data-table__td ${col.numeric ? 'data-table__td--num' : ''} ${col.tdClassName || ''} ${col.hidePrint ? 'no-print' : ''}`.trim()}
      >
        {col.numeric ? <span className="table-num">{col.cell(row, i)}</span> : col.cell(row, i)}
      </td>
    ))
  }

  const head = (
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
  )

  const shellClass =
    `data-table-shell content-panel overflow-hidden print-block ${fillScroll ? 'data-table-shell--fill-scroll' : ''} ${className}`.trim()

  if (rows.length === 0) {
    return (
      <div className={shellClass}>
        <div className={`table-responsive${fillScroll ? ' data-table__body-scroll' : ''}`}>
          <table className="table data-table mb-0 align-middle">
            {head}
            <tbody>
              <tr>
                <td colSpan={columns.length} className="data-table__empty">
                  {emptyText}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const scrollClass = [
    'table-responsive',
    useVirtual ? 'data-table__virtual-scroll' : '',
    fillScroll ? 'data-table__body-scroll' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const scrollStyle =
    fillScroll || !useVirtual
      ? undefined
      : { maxHeight: VIRTUAL_VIEWPORT_MAX, overflow: 'auto' }

  if (!useVirtual) {
    return (
      <div className={shellClass}>
        <div ref={fillScroll ? parentRef : undefined} className={scrollClass} style={scrollStyle}>
          <table className="table data-table mb-0 align-middle">
            {head}
            <tbody>
              {rows.map((row, i) => (
                <tr key={String(getRowKey(row, i))} className="data-table__row">
                  {renderCells(row, i)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const virtualRows = virtualizer.getVirtualItems()
  const totalSize = virtualizer.getTotalSize()
  const paddingTop = virtualRows.length ? virtualRows[0].start : 0
  const paddingBottom = virtualRows.length ? totalSize - virtualRows[virtualRows.length - 1].end : 0

  return (
    <div className={shellClass}>
      <div ref={parentRef} className={scrollClass} style={scrollStyle}>
        <table className="table data-table mb-0 align-middle">
          {head}
          <tbody>
            {paddingTop > 0 ? (
              <tr aria-hidden="true">
                <td colSpan={columns.length} style={{ height: paddingTop, padding: 0, border: 'none' }} />
              </tr>
            ) : null}
            {virtualRows.map((vRow) => {
              const row = rows[vRow.index]
              return (
                <tr
                  key={String(getRowKey(row, vRow.index))}
                  className="data-table__row"
                  data-index={vRow.index}
                  ref={virtualizer.measureElement}
                >
                  {renderCells(row, vRow.index)}
                </tr>
              )
            })}
            {paddingBottom > 0 ? (
              <tr aria-hidden="true">
                <td colSpan={columns.length} style={{ height: paddingBottom, padding: 0, border: 'none' }} />
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
