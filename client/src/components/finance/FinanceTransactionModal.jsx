import AppDateInput from '../AppDateInput'
import { AppInput, AppSelect, AppTextarea, AppButton, FormField, AppFileInput } from '../ui'
import { EXPENSE_CATEGORIES, FUND_SOURCES, FUND_TYPES, TX_STATUSES } from '../../shared/financeEnums.js'
import AppModalShell from '../AppModalShell'
import { loc } from '../../shared/localized'
import {
  formatAmount,
  TX_EXPENSE_CATEGORY_MAX,
  TX_FUND_SOURCE_MAX,
  resolveExpenseCategoryToCanonical,
  resolveFundSourceToCanonical,
} from '../../shared/financeDisplay'

export default function FinanceTransactionModal({
  open,
  editingTxId,
  t,
  lng,
  isUr,
  form,
  setForm,
  txModalErrors,
  setTxModalErrors,
  expenseCategoryInputValue,
  fundSourceInputValue,
  salaryPicklist,
  feeBalancesWithDue,
  receiptFile,
  setReceiptFile,
  saving,
  updating,
  onClose,
  onSubmit,
}) {
  if (!open) return null

  return (
    <AppModalShell
      title={editingTxId ? t('finance.modalEditEntry') : t('finance.modalNewEntry')}
      onClose={onClose}
      size="lg"
      dialogClassName="finance-dash__modal-dialog"
      dir={isUr ? 'rtl' : 'ltr'}
    >
      <form className="modal-app-form" onSubmit={onSubmit}>
        <div className="modal-app-body">
          <div className="row g-3">
            <div className="col-12 col-md-4" data-lang-field="ur">
              <FormField k="titleUr" htmlFor="fx-tu" langField="ur" error={txModalErrors.title}>
                <AppInput
                  id="fx-tu"
                  invalid={!!txModalErrors.title}
                  value={form.title.ur}
                  onChange={(e) => {
                    setTxModalErrors((er) => {
                      if (!er.title) return er
                      const n = { ...er }
                      delete n.title
                      return n
                    })
                    setForm({ ...form, title: { ...form.title, ur: e.target.value } })
                  }}
                />
              </FormField>
            </div>
            <div className="col-12 col-md-4" data-lang-field="en">
              <FormField k="titleEn" htmlFor="fx-te" langField="en" error={txModalErrors.title}>
                <AppInput
                  id="fx-te"
                  invalid={!!txModalErrors.title}
                  value={form.title.en}
                  onChange={(e) => {
                    setTxModalErrors((er) => {
                      if (!er.title) return er
                      const n = { ...er }
                      delete n.title
                      return n
                    })
                    setForm({ ...form, title: { ...form.title, en: e.target.value } })
                  }}
                />
              </FormField>
            </div>
            <div className="col-12 col-md-4">
              <FormField k="amount" htmlFor="fx-amt" error={txModalErrors.amount}>
                <AppInput
                  id="fx-amt"
                  type="number"
                  latin
                  invalid={!!txModalErrors.amount}
                  value={form.amount}
                  onChange={(e) => {
                    setTxModalErrors((er) => {
                      if (!er.amount) return er
                      const n = { ...er }
                      delete n.amount
                      return n
                    })
                    setForm({ ...form, amount: e.target.value })
                  }}
                  min={0}
                  step="0.01"
                />
              </FormField>
            </div>
            <div className="col-12 col-md-4">
              <FormField k="date" htmlFor="fx-dt">
                <AppDateInput id="fx-dt" lng={lng} value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
              </FormField>
            </div>
            <div className="col-12 col-md-4">
              <FormField k="txType" htmlFor="fx-ty" labelClassName="small text-secondary">
                <AppSelect
                  id="fx-ty"
                  value={form.type}
                  onChange={(e) => {
                    const type = e.target.value
                    setTxModalErrors({})
                    setForm((f) => ({
                      ...f,
                      type,
                      linkTeacherSalaryId: type !== 'expense' ? '' : f.linkTeacherSalaryId,
                      linkFeeBalanceId: type !== 'income' ? '' : f.linkFeeBalanceId,
                    }))
                  }}
                >
                  <option value="income">{t('finance.typeIncome')}</option>
                  <option value="expense">{t('finance.typeExpense')}</option>
                </AppSelect>
              </FormField>
            </div>
            {form.type === 'income' ? (
              <div className="col-12 col-md-4">
                <FormField label={t('finance.fundType')} htmlFor="fx-fund-type-inc" labelClassName="small text-secondary">
                  <AppSelect
                    id="fx-fund-type-inc"
                    value={form.fundType}
                    onChange={(e) => {
                      const fundType = e.target.value
                      setForm((f) => ({
                        ...f,
                        fundType,
                        linkFeeBalanceId: fundType !== 'fees' ? '' : f.linkFeeBalanceId,
                      }))
                    }}
                  >
                    {FUND_TYPES.map((f) => (
                      <option key={f} value={f}>
                        {t(`finance.fund.${f}`)}
                      </option>
                    ))}
                  </AppSelect>
                </FormField>
              </div>
            ) : (
              <div className="col-12 col-md-4">
                <FormField
                  label={t('finance.expenseCategory')}
                  htmlFor="fx-exp-cat"
                  required
                  labelClassName="small text-secondary"
                  error={txModalErrors.expenseCategory}
                >
                  <AppInput
                    id="fx-exp-cat"
                    className="finance-dash__modal-combo"
                    list="finance-datalist-modal-exp-cat"
                    autoComplete="off"
                    dir={isUr ? 'rtl' : 'ltr'}
                    spellCheck={false}
                    maxLength={TX_EXPENSE_CATEGORY_MAX}
                    invalid={!!txModalErrors.expenseCategory}
                    value={expenseCategoryInputValue}
                    onChange={(e) => {
                      const raw = e.target.value.slice(0, TX_EXPENSE_CATEGORY_MAX)
                      const canonical = resolveExpenseCategoryToCanonical(raw, t)
                      setTxModalErrors((err) => {
                        if (!err.expenseCategory) return err
                        const next = { ...err }
                        delete next.expenseCategory
                        return next
                      })
                      setForm((f) => ({
                        ...f,
                        expenseCategory: canonical,
                        linkTeacherSalaryId: canonical !== 'salary' ? '' : f.linkTeacherSalaryId,
                      }))
                    }}
                    onBlur={() =>
                      setForm((f) => ({
                        ...f,
                        expenseCategory: resolveExpenseCategoryToCanonical(f.expenseCategory, t),
                      }))
                    }
                  />
                </FormField>
              </div>
            )}
            {form.type === 'expense' ? (
              <>
                <div className="col-12 col-md-4">
                  <FormField label={t('finance.expenseFundSource')} htmlFor="fx-fund-src" labelClassName="small text-secondary">
                    <AppInput
                      id="fx-fund-src"
                      className="finance-dash__modal-combo"
                      list="finance-datalist-modal-fund-src"
                      autoComplete="off"
                      dir={isUr ? 'rtl' : 'ltr'}
                      spellCheck={false}
                      maxLength={TX_FUND_SOURCE_MAX}
                      value={fundSourceInputValue}
                      onChange={(e) => {
                        const raw = e.target.value.slice(0, TX_FUND_SOURCE_MAX)
                        const canonical = resolveFundSourceToCanonical(raw, t)
                        setForm((f) => ({ ...f, fundSource: canonical }))
                      }}
                      onBlur={() =>
                        setForm((f) => ({
                          ...f,
                          fundSource: resolveFundSourceToCanonical(f.fundSource, t) || 'general',
                        }))
                      }
                    />
                  </FormField>
                </div>
                <div className="col-12 col-md-4">
                  <FormField label={t('finance.status')} htmlFor="fx-st-exp" labelClassName="small text-secondary">
                    <AppSelect id="fx-st-exp" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      {TX_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {t(`finance.txStatus.${s}`)}
                        </option>
                      ))}
                    </AppSelect>
                  </FormField>
                </div>
                <div className="col-12 col-md-4" data-lang-field="ur">
                  <FormField k="usageForUr" htmlFor="fx-uu" langField="ur">
                    <AppInput
                      id="fx-uu"
                      dir="rtl"
                      value={form.usageFor.ur}
                      onChange={(e) => setForm({ ...form, usageFor: { ...form.usageFor, ur: e.target.value } })}
                    />
                  </FormField>
                </div>
                <div className="col-12 col-md-4" data-lang-field="en">
                  <FormField k="usageForEn" htmlFor="fx-ue" langField="en">
                    <AppInput
                      id="fx-ue"
                      dir="ltr"
                      value={form.usageFor.en}
                      onChange={(e) => setForm({ ...form, usageFor: { ...form.usageFor, en: e.target.value } })}
                    />
                  </FormField>
                </div>
              </>
            ) : (
              <>
                <div className="col-12 col-md-4">
                  <FormField label={t('finance.status')} htmlFor="fx-st-inc" labelClassName="small text-secondary">
                    <AppSelect id="fx-st-inc" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      {TX_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {t(`finance.txStatus.${s}`)}
                        </option>
                      ))}
                    </AppSelect>
                  </FormField>
                </div>
                <div className="col-12 col-md-4" data-lang-field="ur">
                  <FormField k="usageForUr" htmlFor="fx-uu" langField="ur">
                    <AppInput
                      id="fx-uu"
                      dir="rtl"
                      value={form.usageFor.ur}
                      onChange={(e) => setForm({ ...form, usageFor: { ...form.usageFor, ur: e.target.value } })}
                    />
                  </FormField>
                </div>
                <div className="col-12 col-md-4" data-lang-field="en">
                  <FormField k="usageForEn" htmlFor="fx-ue" langField="en">
                    <AppInput
                      id="fx-ue"
                      dir="ltr"
                      value={form.usageFor.en}
                      onChange={(e) => setForm({ ...form, usageFor: { ...form.usageFor, en: e.target.value } })}
                    />
                  </FormField>
                </div>
              </>
            )}
            {!editingTxId && form.type === 'expense' && resolveExpenseCategoryToCanonical(form.expenseCategory, t) === 'salary' ? (
              <div className="col-12">
                <div className="finance-dash__link-panel">
                  <FormField label={t('finance.linkSalaryTitle')} labelClassName="fw-semibold text-secondary mb-1">
                    <AppSelect
                      value={form.linkTeacherSalaryId}
                      onChange={(e) => {
                        const id = e.target.value
                        setForm((f) => {
                          const next = { ...f, linkTeacherSalaryId: id }
                          if (id) {
                            const sal = salaryPicklist.find((s) => String(s._id) === id)
                            const net = Math.round(Number(sal?.netSalary) || 0)
                            if (sal && (!f.amount || Number(f.amount) === 0)) next.amount = String(net)
                          }
                          return next
                        })
                      }}
                    >
                      <option value="">{t('finance.linkSalaryNone')}</option>
                      {salaryPicklist.map((s) => (
                        <option key={s._id} value={String(s._id)}>
                          {loc(s.teacherId?.name || {}, lng)} — {formatAmount(s.netSalary)}
                          {s.invoiceNumber ? ` (${s.invoiceNumber})` : ''}
                        </option>
                      ))}
                    </AppSelect>
                  </FormField>
                  <div className="small text-secondary mt-1">{t('finance.linkSalaryHint')}</div>
                </div>
              </div>
            ) : null}
            {!editingTxId && form.type === 'income' && form.fundType === 'fees' ? (
              <div className="col-12">
                <div className="finance-dash__link-panel">
                  <FormField label={t('finance.linkFeeTitle')} labelClassName="fw-semibold text-secondary mb-1">
                    <AppSelect
                      value={form.linkFeeBalanceId}
                      onChange={(e) => {
                        const id = e.target.value
                        setForm((f) => {
                          const next = { ...f, linkFeeBalanceId: id }
                          if (id) {
                            const row = feeBalancesWithDue.find((b) => String(b._id) === id)
                            const due = Math.round(Number(row?.due) || 0)
                            if (row && (!f.amount || Number(f.amount) === 0)) next.amount = String(due)
                          }
                          return next
                        })
                      }}
                    >
                      <option value="">{t('finance.linkFeeNone')}</option>
                      {feeBalancesWithDue.map((b) => (
                        <option key={b._id} value={String(b._id)}>
                          {loc(b.studentId?.name || {}, lng)} — {t('finance.feesDueShort')} {formatAmount(b.due)}
                        </option>
                      ))}
                    </AppSelect>
                  </FormField>
                  <div className="small text-secondary mt-1">{t('finance.linkFeeHint')}</div>
                </div>
              </div>
            ) : null}
            {editingTxId && (form.linkTeacherSalaryId || form.linkFeeBalanceId) ? (
              <div className="col-12">
                <div className="alert alert-light border small mb-0 py-2">
                  {form.linkTeacherSalaryId ? <div>{t('finance.editLinkedSalary')}</div> : null}
                  {form.linkFeeBalanceId ? <div>{t('finance.editLinkedFee')}</div> : null}
                </div>
              </div>
            ) : null}
            <div className="col-12">
              <FormField k="notes" htmlFor="fx-notes">
                <AppTextarea
                  id="fx-notes"
                  dir={isUr ? 'rtl' : 'ltr'}
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </FormField>
            </div>
            <div className="col-12">
              <FormField label={t('finance.receipt')} htmlFor="fx-receipt" labelClassName="small text-secondary">
                <AppFileInput
                  id="fx-receipt"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  valueName={receiptFile?.name}
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                />
              </FormField>
            </div>
          </div>
          <datalist id="finance-datalist-modal-exp-cat">
            {EXPENSE_CATEGORIES.map((f) => (
              <option key={f} value={f}>
                {t(`finance.expenseCat.${f}`)}
              </option>
            ))}
          </datalist>
          <datalist id="finance-datalist-modal-fund-src">
            {FUND_SOURCES.map((f) => (
              <option key={f} value={f}>
                {t(`finance.fundSource.${f}`)}
              </option>
            ))}
          </datalist>
        </div>
        <div className="modal-app-footer finance-dash__modal-footer d-flex flex-wrap gap-2 justify-content-start align-items-center">
          <AppButton type="submit" className="finance-dash__cta" disabled={saving || updating}>
            {t('common.save')}
          </AppButton>
          <AppButton type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </AppButton>
        </div>
      </form>
    </AppModalShell>
  )
}
