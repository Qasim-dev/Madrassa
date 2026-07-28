import { formatDisplayDate } from '../../shared/formatDisplayDate'
import { loc } from '../../shared/localized'
import AppDateInput from '../AppDateInput'
import { AppInput, AppSelect } from '../ui'
import FilterDrawer, { FilterToolbar } from '../FilterDrawer'
import { EXPENSE_CATEGORIES, FUND_TYPES, TX_STATUSES } from '../../shared/financeEnums.js'
import {
  formatAmount,
  expenseCatLabel,
  fundSourceLabel,
  TX_EXPENSE_CATEGORY_MAX,
  resolveExpenseCategoryToCanonical,
} from '../../shared/financeDisplay'
import { BtnIconLabel, IconFileSpreadsheet, IconPrint, IconPencil, IconTrash } from '../ListToolbarIcons'

export default function FinanceLedgerPanel({
  t,
  lng,
  mode,
  isUr,
  searchInput,
  onSearchChange,
  ledgerFilterOpen,
  onOpenFilters,
  ledgerFilterActiveCount,
  onDownloadExcel,
  onPrintLedger,
  onOpenNewTxModal,
  ledgerDraft,
  setLedgerDraft,
  onApplyFilters,
  onResetFilters,
  onCloseFilters,
  studentsPick,
  teachersPick,
  txsLoading,
  txs,
  onEditTx,
  onDeleteTx,
  page,
  totalPages,
  totalTx,
  isFetching,
  onPrevPage,
  onNextPage,
}) {
  return (
    <div className="finance-dash__panel">
      <div className="finance-dash__panel-head d-flex flex-wrap justify-content-between align-items-center gap-2">
        <span>{t('finance.ledgerTitle')}</span>
        <button type="button" className="btn btn-sm finance-dash__cta" onClick={onOpenNewTxModal}>
          {t('finance.newEntry')}
        </button>
      </div>
      <div className="finance-dash__toolbar finance-dash__toolbar--filters">
        <FilterToolbar
          search={searchInput}
          onSearchChange={onSearchChange}
          searchPlaceholder={t('common.search')}
          searchId="finance-ledger-search"
          onOpenFilters={onOpenFilters}
          activeCount={ledgerFilterActiveCount}
        >
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onDownloadExcel}>
            <BtnIconLabel icon={<IconFileSpreadsheet />}>{t('finance.exportExcel')}</BtnIconLabel>
          </button>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onPrintLedger}>
            <BtnIconLabel icon={<IconPrint />}>{t('finance.printPdf')}</BtnIconLabel>
          </button>
        </FilterToolbar>
        <FilterDrawer
          open={ledgerFilterOpen}
          onClose={onCloseFilters}
          onApply={onApplyFilters}
          onReset={onResetFilters}
        >
          <div className="filter-drawer__field">
            <label className="filter-drawer__label">{t('finance.filterDateFrom')}</label>
            <AppDateInput
              lng={lng}
              value={ledgerDraft.dateFrom}
              onChange={(v) => setLedgerDraft((d) => ({ ...d, dateFrom: v }))}
            />
          </div>
          <div className="filter-drawer__field">
            <label className="filter-drawer__label">{t('finance.filterDateTo')}</label>
            <AppDateInput
              lng={lng}
              value={ledgerDraft.dateTo}
              onChange={(v) => setLedgerDraft((d) => ({ ...d, dateTo: v }))}
            />
          </div>
          <div className="filter-drawer__field">
            <label className="filter-drawer__label" htmlFor="finance-ledger-type">
              {t('finance.colType')}
            </label>
            <AppSelect
              id="finance-ledger-type"
              className="w-100"
              value={ledgerDraft.tableType}
              onChange={(e) =>
                setLedgerDraft((d) => ({
                  ...d,
                  tableType: e.target.value,
                  expenseCategory: e.target.value === 'expense' ? d.expenseCategory : '',
                }))
              }
            >
              <option value="">{t('finance.filterAll')}</option>
              <option value="income">{t('finance.typeIncome')}</option>
              <option value="expense">{t('finance.typeExpense')}</option>
            </AppSelect>
          </div>
          <div className="filter-drawer__field">
            <label className="filter-drawer__label" htmlFor="finance-ledger-fund">
              {t('finance.colFund')}
            </label>
            <AppSelect
              id="finance-ledger-fund"
              className="w-100"
              value={ledgerDraft.ledgerFund}
              onChange={(e) => setLedgerDraft((d) => ({ ...d, ledgerFund: e.target.value }))}
            >
              <option value="">{t('finance.filterAll')}</option>
              {FUND_TYPES.filter((x) => x !== 'general').map((f) => (
                <option key={f} value={f}>
                  {t(`finance.fund.${f}`)}
                </option>
              ))}
            </AppSelect>
          </div>
          {ledgerDraft.tableType === 'expense' ? (
            <div className="filter-drawer__field">
              <label className="filter-drawer__label" htmlFor="finance-ledger-exp-cat-filter">
                {t('finance.expenseCategory')}
              </label>
              <AppInput
                id="finance-ledger-exp-cat-filter"
                list="finance-datalist-ledger-exp-cat"
                autoComplete="off"
                placeholder={t('finance.filterAll')}
                dir={isUr ? 'rtl' : 'ltr'}
                spellCheck={false}
                value={ledgerDraft.expenseCategory}
                maxLength={TX_EXPENSE_CATEGORY_MAX}
                onChange={(e) =>
                  setLedgerDraft((d) => ({
                    ...d,
                    expenseCategory: e.target.value.slice(0, TX_EXPENSE_CATEGORY_MAX),
                  }))
                }
                onBlur={() =>
                  setLedgerDraft((d) => ({
                    ...d,
                    expenseCategory: resolveExpenseCategoryToCanonical(d.expenseCategory, t),
                  }))
                }
              />
            </div>
          ) : null}
          <div className="filter-drawer__field">
            <label className="filter-drawer__label" htmlFor="finance-ledger-student">
              {t('finance.filterStudent')}
            </label>
            <AppSelect
              id="finance-ledger-student"
              className="w-100"
              value={ledgerDraft.filterStudentId}
              onChange={(e) => setLedgerDraft((d) => ({ ...d, filterStudentId: e.target.value }))}
            >
              <option value="">{t('finance.filterAll')}</option>
              {(studentsPick || []).map((s) => (
                <option key={s._id} value={s._id}>
                  {loc(s.name, lng)}
                </option>
              ))}
            </AppSelect>
          </div>
          <div className="filter-drawer__field">
            <label className="filter-drawer__label" htmlFor="finance-ledger-teacher">
              {t('finance.filterTeacher')}
            </label>
            <AppSelect
              id="finance-ledger-teacher"
              className="w-100"
              value={ledgerDraft.filterTeacherId}
              onChange={(e) => setLedgerDraft((d) => ({ ...d, filterTeacherId: e.target.value }))}
            >
              <option value="">{t('finance.filterAll')}</option>
              {(teachersPick || []).map((te) => (
                <option key={te._id} value={te._id}>
                  {loc(te.name, lng)}
                </option>
              ))}
            </AppSelect>
          </div>
          <div className="filter-drawer__field">
            <label className="filter-drawer__label" htmlFor="finance-ledger-status">
              {t('finance.status')}
            </label>
            <AppSelect
              id="finance-ledger-status"
              className="w-100"
              value={ledgerDraft.tableStatus}
              onChange={(e) => setLedgerDraft((d) => ({ ...d, tableStatus: e.target.value }))}
            >
              <option value="">{t('finance.filterAll')}</option>
              {TX_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`finance.txStatus.${s}`)}
                </option>
              ))}
            </AppSelect>
          </div>
        </FilterDrawer>
      </div>
      <datalist id="finance-datalist-ledger-exp-cat">
        {EXPENSE_CATEGORIES.map((f) => (
          <option key={f} value={f}>
            {t(`finance.expenseCat.${f}`)}
          </option>
        ))}
      </datalist>
      <div className="finance-dash__table-wrap">
        {txsLoading ? (
          <div className="p-4 text-secondary">{t('common.loading')}</div>
        ) : (
          <table className="finance-dash__table">
            <thead>
              <tr>
                <th>{t('finance.colRelated')}</th>
                <th>{t('finance.colTitle')}</th>
                <th>{t('finance.colType')}</th>
                <th>{t('finance.colFund')}</th>
                <th>{t('finance.colAmount')}</th>
                <th>{t('finance.colDate')}</th>
                <th>{t('finance.colUsage')}</th>
                <th>{t('finance.colStatus')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {txs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center text-secondary py-4">
                    {t('common.noRecords')}
                  </td>
                </tr>
              ) : (
                txs.map((x) => (
                  <tr key={x._id}>
                    <td className="small">
                      {x.studentId
                        ? loc(x.studentId.name, lng)
                        : x.teacherId
                          ? loc(x.teacherId.name, lng)
                          : x.inventoryItemId
                            ? loc(x.inventoryItemId.name, lng)
                            : '—'}
                    </td>
                    <td>
                      <div className="fw-medium">{loc(x.title, lng)}</div>
                      {x.linkedTeacherSalaryId ? (
                        <span className="finance-dash__link-chip">{t('finance.tagSalary')}</span>
                      ) : null}
                      {x.linkedFeeBalanceId ? (
                        <span className="finance-dash__link-chip finance-dash__link-chip--fee">{t('finance.tagFee')}</span>
                      ) : null}
                    </td>
                    <td>
                      <span className={`finance-dash__badge ${x.type === 'income' ? 'finance-dash__badge--income' : 'finance-dash__badge--expense'}`}>
                        {x.type === 'income' ? t('finance.typeIncome') : t('finance.typeExpense')}
                      </span>
                    </td>
                    <td className="small">
                      {x.type === 'income'
                        ? t(`finance.fund.${x.fundType || 'general'}`)
                        : `${expenseCatLabel(t, x.expenseCategory)} / ${fundSourceLabel(t, x.fundSource)}`}
                    </td>
                    <td className="table-num fw-semibold">{formatAmount(x.amount)}</td>
                    <td className="small">{formatDisplayDate(x.date, lng, mode)}</td>
                    <td className="small">{loc(x.usageFor, lng) || '—'}</td>
                    <td>
                      <span className={`finance-dash__badge ${x.status === 'posted' ? 'finance-dash__badge--posted' : 'finance-dash__badge--pending'}`}>
                        {t(`finance.txStatus.${x.status || 'posted'}`)}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex flex-wrap gap-1 align-items-center">
                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => onEditTx(x)}>
                          <BtnIconLabel icon={<IconPencil />}>{t('common.edit')}</BtnIconLabel>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => onDeleteTx(x)}
                        >
                          <BtnIconLabel icon={<IconTrash />}>{t('common.delete')}</BtnIconLabel>
                        </button>
                        {x.receiptUrl ? (
                          <a href={x.receiptUrl} target="_blank" rel="noopener noreferrer" className="btn btn-link btn-sm p-0">
                            {t('finance.viewReceipt')}
                          </a>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
      <div className="finance-dash__pagination">
        <span className="small text-secondary">
          {t('finance.pageOf', { page, totalPages, total: totalTx })}
          {isFetching ? ` ${t('common.loading')}` : ''}
        </span>
        <div className="btn-group">
          <button type="button" className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={onPrevPage}>
            {t('finance.prev')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            disabled={page >= totalPages}
            onClick={onNextPage}
          >
            {t('finance.next')}
          </button>
        </div>
      </div>
    </div>
  )
}
