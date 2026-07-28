import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import {
  useGetFeeBalancesQuery,
  useGetFeeItemsQuery,
  useCreateFeeItemMutation,
  useDeleteFeeItemMutation,
  useCollectFeeBalanceMutation,
  useApplyFeeItemMutation,
  useUpsertStudentFeeDueMutation,
  useApplyFeeMaafiMutation,
  useApplyFeeBalanceToDueMutation,
  useGetFeeAuditLogQuery,
  useDeleteFeeBalanceMutation,
  useGetFinanceAccountsQuery,
  useGetDarajatQuery,
  useGetStudentsQuery,
} from '../services/api'
import { loc } from '../shared/localized'
import DataTable from '../components/DataTable'
import PageHeading from '../components/PageHeading'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import AppModalShell from '../components/AppModalShell'
import { AppInput, AppSelect, FormField, FormRow } from '../components/ui'
import { useFormValidation } from '../shared/validation'
import { feeItemSchema, feeCollectSchema } from '../shared/validation/formSchemas'

const FREQ = [
  { id: 'monthly', ur: 'ماہانہ', en: 'Monthly' },
  { id: 'annual', ur: 'سالانہ', en: 'Annual' },
  { id: 'one_time', ur: 'ایک بار', en: 'One-time' },
]

const HOWTO_DISMISS_KEY = 'fees-howto-dismissed'

const ADJUST_FIELD_IDS = {
  maafi: { amount: 'fee-maafi-amt', reason: 'fee-maafi-reason' },
  balance: { amount: 'fee-bal-amt', reason: 'fee-bal-reason' },
}

const adjustSchema = {
  amount: (value, values, t) => {
    if (values.mode !== 'maafi') return ''
    const amt = Number(value)
    if (value === '' || value == null || !Number.isFinite(amt) || amt <= 0) {
      return t('finance.validationAmount')
    }
    const due = Number(values.due) || 0
    if (due <= 0) return t('fees.maafiNoDue')
    if (amt > due + 0.001) return t('fees.maafiExceedsDue', { due })
    return ''
  },
  reason: (value, values, t) => {
    if (values.mode !== 'maafi' && values.mode !== 'balance') return ''
    return String(value || '').trim().length < 3 ? t('fees.reasonRequired') : ''
  },
}

const deleteBalanceSchema = {
  reason: (value, _values, t) =>
    String(value || '').trim().length < 5 ? t('fees.deleteBalanceReasonShort') : '',
}

export default function FeesPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const en = lng?.startsWith('en')
  const activeSessionId = useSelector((s) => s.session.activeSessionId)

  const feeParams = useMemo(
    () => (activeSessionId ? { sessionId: activeSessionId } : {}),
    [activeSessionId]
  )
  const balanceParams = useMemo(
    () => (activeSessionId ? { sessionId: activeSessionId } : undefined),
    [activeSessionId]
  )
  const auditParams = useMemo(
    () => (activeSessionId ? { sessionId: activeSessionId, limit: 30 } : { limit: 30 }),
    [activeSessionId]
  )

  const { data: balances = [], isLoading: balancesLoading, refetch: refetchBalances } =
    useGetFeeBalancesQuery(balanceParams)
  const { data: rawItems = [], isLoading: itemsLoading, refetch } = useGetFeeItemsQuery(feeParams)
  const { data: auditLogs = [], isLoading: auditLoading, refetch: refetchAudit } =
    useGetFeeAuditLogQuery(auditParams)
  const { data: darajat = [] } = useGetDarajatQuery(
    activeSessionId ? { sessionId: activeSessionId } : undefined,
    { skip: !activeSessionId }
  )
  const { data: students = [] } = useGetStudentsQuery(
    activeSessionId ? { sessionId: activeSessionId } : undefined,
    { skip: !activeSessionId }
  )
  const [createItem] = useCreateFeeItemMutation()
  const [deleteItem] = useDeleteFeeItemMutation()
  const [collectFee, { isLoading: collecting }] = useCollectFeeBalanceMutation()
  const [applyFee, { isLoading: applying }] = useApplyFeeItemMutation()
  const [upsertDue] = useUpsertStudentFeeDueMutation()
  const [applyMaafi, { isLoading: maafiSaving }] = useApplyFeeMaafiMutation()
  const [applyBalanceToDue, { isLoading: balanceSaving }] = useApplyFeeBalanceToDueMutation()
  const [deleteFeeBalance, { isLoading: deletingBalance }] = useDeleteFeeBalanceMutation()
  const { data: financeAccounts = [] } = useGetFinanceAccountsQuery()

  const items = useMemo(() => {
    const withClass = rawItems.filter((it) => it.darjahId)
    if (withClass.length) return withClass
    return rawItems.filter((it) => it.tab === 'class' || !it.tab)
  }, [rawItems])

  const [howtoOpen, setHowtoOpen] = useState(() => {
    try {
      return localStorage.getItem(HOWTO_DISMISS_KEY) !== '1'
    } catch {
      return true
    }
  })
  const [title, setTitle] = useState({ ur: '', en: '' })
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState('monthly')
  const [darjahId, setDarjahId] = useState('')
  const [deleteFeeItemTarget, setDeleteFeeItemTarget] = useState(null)
  const [deleteBalanceTarget, setDeleteBalanceTarget] = useState(null)
  const [deleteBalanceReason, setDeleteBalanceReason] = useState('')
  const [collectOpen, setCollectOpen] = useState(null)
  const [collectAmount, setCollectAmount] = useState('')
  const [collectRef, setCollectRef] = useState('')
  const [collectMonth, setCollectMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [collectAccountId, setCollectAccountId] = useState('')
  const [collectMethod, setCollectMethod] = useState('cash')
  const [adjustOpen, setAdjustOpen] = useState(null)
  const [adjustMode, setAdjustMode] = useState('due') // due | maafi | balance
  const [adjustDue, setAdjustDue] = useState('')
  const [adjustCustom, setAdjustCustom] = useState('')
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [applyStudentId, setApplyStudentId] = useState('')
  const [msg, setMsg] = useState('')
  const [msgTone, setMsgTone] = useState('success')

  const {
    errors: addItemErrors,
    setErrors: setAddItemErrors,
    onBlurField: onBlurAddItem,
    revalidateIfError: revalidateAddItem,
    validateAll: validateAddItemAll,
    focusInvalid: focusInvalidAddItem,
  } = useFormValidation({
    schema: feeItemSchema,
    t,
    fieldIds: { 'title.ur': 'fee-tu', amount: 'fee-amt' },
    order: ['title.ur', 'amount'],
  })

  const {
    errors: collectErrors,
    setErrors: setCollectErrors,
    onBlurField: onBlurCollect,
    revalidateIfError: revalidateCollect,
    validateAll: validateCollectAll,
    focusInvalid: focusInvalidCollect,
  } = useFormValidation({
    schema: feeCollectSchema,
    t,
    fieldIds: { amount: 'fee-collect-amt', accountId: 'fee-collect-acc' },
    order: ['amount', 'accountId'],
  })

  const adjustFieldIds = ADJUST_FIELD_IDS[adjustMode] || {}
  const {
    errors: adjustErrors,
    setErrors: setAdjustErrors,
    revalidateIfError: revalidateAdjust,
    validateAll: validateAdjustAll,
    focusInvalid: focusInvalidAdjust,
  } = useFormValidation({
    schema: adjustSchema,
    t,
    fieldIds: adjustFieldIds,
    order: ['amount', 'reason'],
  })

  const {
    errors: deleteBalanceErrors,
    setErrors: setDeleteBalanceErrors,
    onBlurField: onBlurDeleteBalance,
    revalidateIfError: revalidateDeleteBalance,
    validateAll: validateDeleteBalanceAll,
    focusInvalid: focusInvalidDeleteBalance,
  } = useFormValidation({
    schema: deleteBalanceSchema,
    t,
    fieldIds: { reason: 'delete-balance-reason' },
  })

  function dismissHowto() {
    setHowtoOpen(false)
    try {
      localStorage.setItem(HOWTO_DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  function flash(text, tone = 'success') {
    setMsg(text)
    setMsgTone(tone)
    setTimeout(() => {
      setMsg('')
      setMsgTone('success')
    }, tone === 'danger' || tone === 'warning' ? 6000 : 4000)
  }

  function openAdjust(b, mode = 'due') {
    setAdjustOpen(b)
    setAdjustMode(mode)
    setAdjustDue(String(Number(b.due) || 0))
    setAdjustCustom(b.customMonthlyAmount != null ? String(b.customMonthlyAmount) : '')
    const due = Number(b.due) || 0
    const credit = Number(b.balance) || 0
    if (mode === 'maafi') setAdjustAmount(String(due > 0 ? due : ''))
    else if (mode === 'balance') setAdjustAmount(String(Math.min(credit, due) || ''))
    else setAdjustAmount('')
    setAdjustReason('')
    setAdjustErrors({})
  }

  async function handleApply(it) {
    if (!it.darjahId && !applyStudentId) {
      flash(t('fees.applyNeedClass'), 'warning')
      return
    }
    try {
      const res = await applyFee({
        id: it._id,
        ...(applyStudentId ? { studentId: applyStudentId } : {}),
      }).unwrap()
      flash(t('fees.appliedTo', { count: res.applied }))
      refetchBalances()
      refetchAudit()
    } catch (err) {
      flash(err?.data?.message || err?.error || t('common.error'), 'danger')
    }
  }

  const balanceColumns = useMemo(
    () => [
      {
        key: 'stu',
        headerKey: 'feeStudentCol',
        cell: (b) => (b.studentId ? loc(b.studentId.name, lng) : '—'),
      },
      {
        key: 'cls',
        header: t('fees.classCol'),
        cell: (b) => loc(b.studentId?.darjahId?.name, lng) || '—',
      },
      { key: 'bal', headerKey: 'balance', numeric: true, cell: (b) => b.balance },
      { key: 'adv', headerKey: 'advance', numeric: true, cell: (b) => b.advance },
      {
        key: 'due',
        headerKey: 'due',
        numeric: true,
        cell: (b) => (
          <span className={(Number(b.due) || 0) > 0 ? 'text-danger fw-semibold' : ''}>
            {b.due}
          </span>
        ),
      },
      {
        key: 'maafi',
        header: t('fees.maafiCol'),
        numeric: true,
        cell: (b) => (
          <span className={(Number(b.maafi) || 0) > 0 ? 'text-success fw-semibold' : ''}>
            {Number(b.maafi) || 0}
          </span>
        ),
      },
      {
        key: 'custom',
        header: t('fees.customPerMonth'),
        numeric: true,
        cell: (b) => (b.customMonthlyAmount != null ? b.customMonthlyAmount : '—'),
      },
      {
        key: 'act',
        headerKey: 'actions',
        hidePrint: true,
        cell: (b) => (
          <div className="data-table__actions">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => openAdjust(b, 'due')}
            >
              {t('fees.adjust')}
            </button>
            {(Number(b.due) || 0) > 0 ? (
              <button
                type="button"
                className="btn btn-sm btn-outline-warning"
                onClick={() => openAdjust(b, 'maafi')}
              >
                {t('fees.maafi')}
              </button>
            ) : null}
            {(Number(b.balance) || 0) > 0 && (Number(b.due) || 0) > 0 ? (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => openAdjust(b, 'balance')}
              >
                {t('fees.applyBalance')}
              </button>
            ) : null}
            {(Number(b.due) || 0) > 0 ? (
              <button
                type="button"
                className="btn btn-sm btn-outline-success"
                onClick={() => {
                  setCollectOpen(b)
                  setCollectAmount(String(Number(b.due) || 0))
                  setCollectRef(`RCP-${Date.now().toString().slice(-8)}`)
                  setCollectMonth(new Date().toISOString().slice(0, 7))
                  setCollectAccountId(financeAccounts[0]?._id ? String(financeAccounts[0]._id) : '')
                  setCollectMethod('cash')
                  setCollectErrors({})
                }}
              >
                {t('fees.collectButton')}
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => {
                setDeleteBalanceReason('')
                setDeleteBalanceErrors({})
                setDeleteBalanceTarget(b)
              }}
            >
              {t('fees.deleteBalance')}
            </button>
          </div>
        ),
      },
    ],
    [lng, t, financeAccounts, setCollectErrors, setDeleteBalanceErrors]
  )

  const itemColumns = useMemo(
    () => [
      { key: 'tit', headerKey: 'transactionColTitle', cell: (it) => loc(it.title, lng) },
      {
        key: 'cls',
        header: t('fees.classCol'),
        cell: (it) => loc(it.darjahId?.name, lng) || '—',
      },
      {
        key: 'freq',
        header: t('fees.cycle'),
        cell: (it) => {
          const f = FREQ.find((x) => x.id === it.frequency) || FREQ[0]
          return en ? f.en : f.ur
        },
      },
      { key: 'amt', headerKey: 'amount', numeric: true, cell: (it) => it.amount },
      {
        key: 'act',
        headerKey: 'actions',
        hidePrint: true,
        cell: (it) => (
          <div className="data-table__actions">
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={applying || (!it.darjahId && !applyStudentId)}
              title={!it.darjahId && !applyStudentId ? t('fees.applyNeedClass') : t('fees.stepApply')}
              onClick={() => handleApply(it)}
            >
              {t('fees.applyButton')}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() =>
                setDeleteFeeItemTarget({ id: it._id, name: loc(it.title, lng) || String(it.amount ?? '') })
              }
            >
              {t('common.delete')}
            </button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleApply uses current applyStudentId/applying
    [lng, t, en, applying, applyStudentId]
  )

  async function addItem(e) {
    e.preventDefault()
    if (!darjahId) {
      flash(t('fees.classRequired'), 'warning')
      return
    }
    const nextErrors = validateAddItemAll({ title, amount })
    if (Object.keys(nextErrors).length) {
      focusInvalidAddItem(nextErrors)
      return
    }
    try {
      await createItem({
        tab: 'class',
        title,
        amount: Number(amount) || 0,
        frequency,
        darjahId,
        ...(activeSessionId ? { sessionId: activeSessionId } : {}),
      }).unwrap()
      setTitle({ ur: '', en: '' })
      setAmount('')
      setDarjahId('')
      setFrequency('monthly')
      setAddItemErrors({})
      refetch()
      flash(t('fees.afterAddHint'), 'warning')
    } catch (err) {
      flash(err?.data?.message || t('common.error'), 'danger')
    }
  }

  async function submitCollect(e) {
    e.preventDefault()
    if (!collectOpen) return
    const acc = collectAccountId || financeAccounts[0]?._id
    const values = { amount: collectAmount, accountId: acc ? String(acc) : '' }
    const nextErrors = validateCollectAll(values)
    if (Object.keys(nextErrors).length) {
      focusInvalidCollect(nextErrors)
      return
    }
    const amt = Number(collectAmount)
    const due = Number(collectOpen.due) || 0
    if (amt > due + 0.001) {
      flash(t('fees.amountExceedsDue'), 'danger')
      return
    }
    try {
      await collectFee({
        id: collectOpen._id,
        body: {
          amount: amt,
          accountId: String(acc),
          paymentMethod: collectMethod,
          referenceNo: collectRef,
          periodMonth: collectMonth,
          ...(activeSessionId ? { sessionId: String(activeSessionId) } : {}),
        },
      }).unwrap()
      setCollectOpen(null)
      setCollectErrors({})
      refetchBalances()
      refetchAudit()
      flash(t('fees.collected'))
    } catch (err) {
      flash(err?.data?.message || err?.error || t('common.error'), 'danger')
    }
  }

  async function submitAdjust(e) {
    e.preventDefault()
    if (!adjustOpen) return

    if (adjustMode === 'maafi') {
      const dueNow = Number(adjustOpen.due) || 0
      const nextErrors = validateAdjustAll({ mode: 'maafi', amount: adjustAmount, reason: adjustReason, due: dueNow })
      if (Object.keys(nextErrors).length) {
        focusInvalidAdjust(nextErrors)
        return
      }
      try {
        await applyMaafi({
          id: adjustOpen._id,
          amount: Number(adjustAmount),
          reason: adjustReason.trim(),
          ...(activeSessionId ? { sessionId: activeSessionId } : {}),
        }).unwrap()
        setAdjustOpen(null)
        setAdjustErrors({})
        refetchBalances()
        refetchAudit()
        flash(t('fees.maafiDone'))
      } catch (err) {
        flash(err?.data?.message || t('common.error'), 'danger')
      }
      return
    }

    if (adjustMode === 'balance') {
      const nextErrors = validateAdjustAll({
        mode: 'balance',
        amount: adjustAmount,
        reason: adjustReason,
        due: Number(adjustOpen.due) || 0,
      })
      if (Object.keys(nextErrors).length) {
        focusInvalidAdjust(nextErrors)
        return
      }
      try {
        await applyBalanceToDue({
          id: adjustOpen._id,
          ...(adjustAmount !== '' ? { amount: Number(adjustAmount) } : {}),
          reason: adjustReason.trim(),
          ...(activeSessionId ? { sessionId: activeSessionId } : {}),
        }).unwrap()
        setAdjustOpen(null)
        setAdjustErrors({})
        refetchBalances()
        refetchAudit()
        flash(t('fees.applyBalanceDone'))
      } catch (err) {
        flash(err?.data?.message || t('common.error'), 'danger')
      }
      return
    }

    if (!adjustOpen?.studentId?._id && !adjustOpen?.studentId) return
    const sid = adjustOpen.studentId._id || adjustOpen.studentId
    try {
      await upsertDue({
        studentId: sid,
        due: Number(adjustDue) || 0,
        customMonthlyAmount: adjustCustom === '' ? null : Number(adjustCustom),
        reason: adjustReason.trim() || 'Due adjusted',
        ...(activeSessionId ? { sessionId: activeSessionId } : {}),
      }).unwrap()
      setAdjustOpen(null)
      refetchBalances()
      refetchAudit()
      flash(t('fees.dueUpdated'))
    } catch (err) {
      flash(err?.data?.message || t('common.error'), 'danger')
    }
  }

  async function submitDeleteBalance(e) {
    e.preventDefault()
    if (!deleteBalanceTarget?._id) return
    const reason = deleteBalanceReason.trim()
    const nextErrors = validateDeleteBalanceAll({ reason })
    if (Object.keys(nextErrors).length) {
      focusInvalidDeleteBalance(nextErrors)
      return
    }
    try {
      await deleteFeeBalance({
        id: deleteBalanceTarget._id,
        reason,
        sessionId: activeSessionId || undefined,
      }).unwrap()
      setDeleteBalanceTarget(null)
      setDeleteBalanceReason('')
      setDeleteBalanceErrors({})
      flash(t('fees.deleteBalanceDone'))
      refetchBalances()
      refetchAudit()
    } catch (err) {
      flash(err?.data?.message || err?.error || t('common.error'), 'danger')
    }
  }

  const classStudents = useMemo(() => {
    if (!darjahId) return students
    return students.filter((s) => String(s.darjahId?._id || s.darjahId) === String(darjahId))
  }, [students, darjahId])

  const auditColumns = useMemo(
    () => [
      {
        key: 'when',
        header: t('fees.auditWhen'),
        cell: (r) =>
          r.changedAt
            ? new Date(r.changedAt).toLocaleString(en ? 'en-GB' : 'ur-PK')
            : '—',
      },
      {
        key: 'stu',
        headerKey: 'feeStudentCol',
        cell: (r) => (r.studentId ? loc(r.studentId.name, lng) : '—'),
      },
      {
        key: 'act',
        header: t('fees.auditAction'),
        cell: (r) => t(`fees.audit.${r.action}`, { defaultValue: r.action }),
      },
      {
        key: 'amt',
        header: t('fees.auditAmount'),
        numeric: true,
        cell: (r) => r.amount,
      },
      {
        key: 'reason',
        header: t('fees.auditReason'),
        cell: (r) => r.reason || '—',
      },
    ],
    [t, lng, en]
  )

  const alertClass =
    msgTone === 'danger' ? 'alert-danger' : msgTone === 'warning' ? 'alert-warning' : 'alert-success'

  return (
    <div className="fees-module">
      <PageHeading navKey="navFees" subtitle={t('fees.subtitle')} />

      {howtoOpen ? (
        <div className="alert alert-info fees-howto-alert d-flex gap-2 align-items-start mb-3" role="status">
          <div className="flex-grow-1">
            <strong className="d-block mb-1">{t('fees.howItWorks')}</strong>
            <ol className="fees-howto__steps mb-0 ps-3">
              <li>{t('fees.stepDefine')}</li>
              <li>{t('fees.stepApply')}</li>
              <li>{t('fees.stepCollect')}</li>
            </ol>
          </div>
          <button
            type="button"
            className="btn-close fees-howto-alert__close"
            aria-label={t('fees.howItWorksDismiss')}
            onClick={dismissHowto}
          />
        </div>
      ) : null}

      {msg ? (
        <div className={`alert ${alertClass} py-2 mb-3`} role="alert">
          {msg}
        </div>
      ) : null}

      <h2 className="h5 mb-2">{t('fees.balancesHeading')}</h2>
      <DataTable
        className="mb-4"
        columns={balanceColumns}
        rows={balances}
        getRowKey={(b) => b._id}
        isLoading={balancesLoading}
        loadingText={t('common.loading')}
        emptyText={t('fees.emptyBalances')}
      />

      <h2 className="h5 mb-1">{t('fees.setupHeading')}</h2>
      <p className="small text-secondary mb-3">{t('fees.setupHint')}</p>

      <form className="content-panel p-3 mb-4 fees-add-form" onSubmit={addItem}>
        <div
          className="exam-toolbar exam-toolbar--form"
          style={{ background: 'transparent', border: 'none', padding: 0, margin: 0 }}
        >
          <div className="exam-toolbar__field" data-lang-field="ur">
            <FormField k="feeTitleUr" htmlFor="fee-tu" langField="ur" error={addItemErrors['title.ur']}>
              <AppInput
                id="fee-tu"
                value={title.ur}
                onChange={(e) => {
                  const next = { ...title, ur: e.target.value }
                  setTitle(next)
                  revalidateAddItem('title.ur', { title: next, amount })
                }}
                onBlur={() => onBlurAddItem('title.ur', { title, amount })}
              />
            </FormField>
          </div>
          <div className="exam-toolbar__field" data-lang-field="en">
            <FormField k="feeTitleEn" htmlFor="fee-te" langField="en">
              <AppInput
                id="fee-te"
                latin
                value={title.en}
                onChange={(e) => {
                  const next = { ...title, en: e.target.value }
                  setTitle(next)
                  revalidateAddItem('title.ur', { title: next, amount })
                }}
                onBlur={() => onBlurAddItem('title.ur', { title, amount })}
              />
            </FormField>
          </div>
          <div className="exam-toolbar__field exam-toolbar__field--narrow">
            <FormField k="amount" htmlFor="fee-amt" error={addItemErrors.amount}>
              <AppInput
                id="fee-amt"
                type="number"
                latin
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                  revalidateAddItem('amount', { title, amount: e.target.value })
                }}
                onBlur={() => onBlurAddItem('amount', { title, amount })}
              />
            </FormField>
          </div>
          <div className="exam-toolbar__field">
            <label className="exam-toolbar__label" htmlFor="fee-freq">
              {t('fees.cycle')}
            </label>
            <AppSelect id="fee-freq" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
              {FREQ.map((f) => (
                <option key={f.id} value={f.id}>
                  {en ? f.en : f.ur}
                </option>
              ))}
            </AppSelect>
          </div>
          <div className="exam-toolbar__field">
            <label className="exam-toolbar__label" htmlFor="fee-darjah">
              {t('fees.classCol')}
            </label>
            <AppSelect
              id="fee-darjah"
              value={darjahId}
              onChange={(e) => {
                setDarjahId(e.target.value)
                setApplyStudentId('')
              }}
              required
            >
              <option value="">{t('fees.selectClass')}</option>
              {darajat.map((d) => (
                <option key={d._id} value={d._id}>
                  {loc(d.name, lng)}
                </option>
              ))}
            </AppSelect>
          </div>
          <div className="exam-toolbar__actions">
            <button type="submit" className="btn btn-success btn-sm">
              {t('common.add')}
            </button>
          </div>
        </div>

        <div className="mt-3 d-flex flex-wrap gap-2 align-items-end">
          <div className="flex-grow-1" style={{ minWidth: '12rem' }}>
            <label className="exam-toolbar__label" htmlFor="fee-apply-stu">
              {t('fees.applyOneStudent')}
            </label>
            <AppSelect
              id="fee-apply-stu"
              value={applyStudentId}
              onChange={(e) => setApplyStudentId(e.target.value)}
            >
              <option value="">{t('fees.wholeClass')}</option>
              {classStudents.map((s) => (
                <option key={s._id} value={s._id}>
                  {loc(s.name, lng)}
                  {s.studentId ? ` (${s.studentId})` : ''}
                </option>
              ))}
            </AppSelect>
          </div>
        </div>
      </form>

      <DataTable
        columns={itemColumns}
        rows={items}
        getRowKey={(it) => it._id}
        isLoading={itemsLoading}
        loadingText={t('common.loading')}
        emptyText={t('fees.emptyItems')}
      />

      <h2 className="h5 mb-2 mt-4">{t('fees.auditHeading')}</h2>
      <DataTable
        className="mb-4"
        columns={auditColumns}
        rows={auditLogs}
        getRowKey={(r) => r._id}
        isLoading={auditLoading}
        loadingText={t('common.loading')}
        emptyText={t('fees.auditEmpty')}
      />

      <ConfirmDeleteModal
        open={!!deleteFeeItemTarget}
        title={t('common.confirmDeleteTitle')}
        message={
          deleteFeeItemTarget
            ? t('common.confirmDeleteBody', { name: deleteFeeItemTarget.name })
            : ''
        }
        onClose={() => setDeleteFeeItemTarget(null)}
        onConfirm={async () => {
          await deleteItem(deleteFeeItemTarget.id).unwrap()
          refetch()
        }}
      />

      {deleteBalanceTarget ? (
        <AppModalShell
          title={t('fees.deleteBalanceTitle')}
          onClose={() => {
            setDeleteBalanceTarget(null)
            setDeleteBalanceReason('')
            setDeleteBalanceErrors({})
          }}
          size="md"
          dir={lng.split('-')[0] === 'ur' ? 'rtl' : 'ltr'}
        >
          <form className="modal-app-form" onSubmit={submitDeleteBalance}>
            <div className="modal-app-body">
              <p className="small text-secondary mb-2">
                {deleteBalanceTarget.studentId
                  ? loc(deleteBalanceTarget.studentId.name, lng)
                  : '—'}
              </p>
              <p className="small text-danger mb-2">{t('fees.deleteBalanceNote')}</p>
              <FormField
                label={t('fees.deleteBalanceReason')}
                htmlFor="delete-balance-reason"
                error={deleteBalanceErrors.reason}
              >
                <AppInput
                  id="delete-balance-reason"
                  type="text"
                  value={deleteBalanceReason}
                  onChange={(e) => {
                    setDeleteBalanceReason(e.target.value)
                    revalidateDeleteBalance('reason', { reason: e.target.value })
                  }}
                  onBlur={() => onBlurDeleteBalance('reason', { reason: deleteBalanceReason })}
                  placeholder={t('fees.deleteBalanceReasonPlaceholder')}
                  autoFocus
                />
              </FormField>
            </div>
            <div className="modal-app-footer d-flex flex-wrap gap-2 justify-content-end">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => {
                  setDeleteBalanceTarget(null)
                  setDeleteBalanceReason('')
                  setDeleteBalanceErrors({})
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="btn btn-danger"
                disabled={deletingBalance || deleteBalanceReason.trim().length < 5}
              >
                {t('fees.deleteBalance')}
              </button>
            </div>
          </form>
        </AppModalShell>
      ) : null}

      {collectOpen ? (
        <AppModalShell
          title={t('fees.collectTitle')}
          onClose={() => setCollectOpen(null)}
          size="md"
          dir={lng.split('-')[0] === 'ur' ? 'rtl' : 'ltr'}
          dialogClassName="modal-app-dialog--fee-collect"
        >
          <form className="modal-app-form" onSubmit={submitCollect}>
            <div className="modal-app-body">
              <div className="fee-collect-summary">
                <div className="fee-collect-summary__name">
                  {collectOpen.studentId ? loc(collectOpen.studentId.name, lng) : '—'}
                </div>
                <div className="fee-collect-summary__meta">
                  <span>{t('fees.outstandingDue')}</span>
                  <strong dir="ltr">{Number(collectOpen.due) || 0}</strong>
                </div>
              </div>

              <FormRow>
                <FormField label={t('fees.collectAmount')} htmlFor="fee-collect-amt" col={4} error={collectErrors.amount}>
                  <AppInput
                    id="fee-collect-amt"
                    type="number"
                    latin
                    step="1"
                    value={collectAmount}
                    onChange={(e) => {
                      setCollectAmount(e.target.value)
                      revalidateCollect('amount', { amount: e.target.value, accountId: collectAccountId })
                    }}
                    onBlur={() => onBlurCollect('amount', { amount: collectAmount, accountId: collectAccountId })}
                  />
                </FormField>

                <FormField label={t('fees.collectMonth')} htmlFor="fee-collect-month" col={4}>
                  <AppInput
                    id="fee-collect-month"
                    type="month"
                    latin
                    value={collectMonth}
                    onChange={(e) => setCollectMonth(e.target.value)}
                  />
                </FormField>

                <FormField label={t('fees.accountLabel')} htmlFor="fee-collect-acc" col={4} error={collectErrors.accountId}>
                  <AppSelect
                    id="fee-collect-acc"
                    value={collectAccountId}
                    onChange={(e) => {
                      setCollectAccountId(e.target.value)
                      revalidateCollect('accountId', { amount: collectAmount, accountId: e.target.value })
                    }}
                    onBlur={() => onBlurCollect('accountId', { amount: collectAmount, accountId: collectAccountId })}
                  >
                    <option value="">{t('fees.selectAccount')}</option>
                    {financeAccounts.map((a) => (
                      <option key={a._id} value={a._id}>
                        {loc(a.name, lng) || a.code || a._id}
                        {a.currentAmount != null ? ` (${a.currentAmount})` : ''}
                      </option>
                    ))}
                  </AppSelect>
                </FormField>

                <FormField label={t('fees.paymentMethod')} htmlFor="fee-collect-method" col={4}>
                  <AppSelect
                    id="fee-collect-method"
                    value={collectMethod}
                    onChange={(e) => setCollectMethod(e.target.value)}
                  >
                    <option value="cash">{t('fees.methodCash')}</option>
                    <option value="bank">{t('fees.methodBank')}</option>
                    <option value="online">{t('fees.methodOnline')}</option>
                  </AppSelect>
                </FormField>

                <FormField label={t('fees.collectReceiptNo')} htmlFor="fee-collect-ref" col={8}>
                  <AppInput
                    id="fee-collect-ref"
                    latin
                    value={collectRef}
                    onChange={(e) => setCollectRef(e.target.value)}
                  />
                </FormField>
              </FormRow>

              {!financeAccounts.length ? (
                <p className="alert alert-warning py-2 small mb-0 mt-1">{t('fees.collectNeedAccount')}</p>
              ) : (
                <p className="small text-secondary mb-0 mt-1">{t('fees.collectHint')}</p>
              )}
            </div>
            <div className="modal-app-footer d-flex flex-wrap gap-2 justify-content-end">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setCollectOpen(null)}>
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={collecting || !financeAccounts.length}
              >
                {collecting ? t('fees.saving') : t('fees.collectSubmit')}
              </button>
            </div>
          </form>
        </AppModalShell>
      ) : null}

      {adjustOpen ? (
        <AppModalShell
          title={
            adjustMode === 'maafi'
              ? t('fees.maafi')
              : adjustMode === 'balance'
                ? t('fees.applyBalance')
                : t('fees.adjustTitle')
          }
          onClose={() => setAdjustOpen(null)}
          size="md"
          dir={lng.split('-')[0] === 'ur' ? 'rtl' : 'ltr'}
        >
          <form className="modal-app-form" onSubmit={submitAdjust}>
            <div className="modal-app-body">
              <p className="small text-secondary mb-2">
                {adjustOpen.studentId ? loc(adjustOpen.studentId.name, lng) : '—'}
                {' · '}
                {t('fees.outstandingDue')}: <strong dir="ltr">{Number(adjustOpen.due) || 0}</strong>
                {' · '}
                {en ? 'Balance' : 'بیلنس'}: <strong dir="ltr">{Number(adjustOpen.balance) || 0}</strong>
                {' · '}
                {t('fees.maafiCol')}: <strong dir="ltr">{Number(adjustOpen.maafi) || 0}</strong>
              </p>

              <div className="btn-group mb-3 flex-wrap" role="group">
                <button
                  type="button"
                  className={`btn btn-sm ${adjustMode === 'due' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => openAdjust(adjustOpen, 'due')}
                >
                  {t('fees.adjustModeDue')}
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${adjustMode === 'maafi' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => openAdjust(adjustOpen, 'maafi')}
                >
                  {t('fees.adjustModeMaafi')}
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${adjustMode === 'balance' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => openAdjust(adjustOpen, 'balance')}
                  disabled={(Number(adjustOpen.balance) || 0) <= 0}
                >
                  {t('fees.adjustModeBalance')}
                </button>
              </div>

              {adjustMode === 'due' ? (
                <FormRow>
                  <FormField label={t('fees.dueAmount')} htmlFor="fee-adj-due" col={4}>
                    <AppInput
                      id="fee-adj-due"
                      type="number"
                      latin
                      min={0}
                      value={adjustDue}
                      onChange={(e) => setAdjustDue(e.target.value)}
                    />
                  </FormField>
                  <FormField label={t('fees.customMonthly')} htmlFor="fee-adj-custom" col={8}>
                    <AppInput
                      id="fee-adj-custom"
                      type="number"
                      latin
                      min={0}
                      value={adjustCustom}
                      onChange={(e) => setAdjustCustom(e.target.value)}
                      placeholder={t('fees.customMonthlyPlaceholder')}
                    />
                  </FormField>
                  <FormField label={t('fees.auditReason')} htmlFor="fee-adj-reason" col={12}>
                    <AppInput
                      id="fee-adj-reason"
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      placeholder={t('fees.maafiReasonPlaceholder')}
                    />
                  </FormField>
                </FormRow>
              ) : null}

              {adjustMode === 'maafi' ? (
                <>
                  <p className="small text-secondary mb-2">{t('fees.maafiHint')}</p>
                  <p className="small text-secondary mb-2" dir="ltr">
                    {t('fees.maafiMaxDue', { due: Number(adjustOpen.due) || 0 })}
                  </p>
                  <FormRow>
                    <FormField label={t('fees.maafiAmount')} htmlFor="fee-maafi-amt" col={4} error={adjustErrors.amount}>
                      <AppInput
                        id="fee-maafi-amt"
                        type="number"
                        latin
                        value={adjustAmount}
                        onChange={(e) => {
                          const dueCap = Number(adjustOpen.due) || 0
                          const raw = e.target.value
                          let next = raw
                          if (raw !== '') {
                            const n = Number(raw)
                            if (Number.isFinite(n)) next = String(Math.min(Math.max(0, n), dueCap))
                          }
                          setAdjustAmount(next)
                          revalidateAdjust('amount', { mode: 'maafi', amount: next, reason: adjustReason, due: dueCap })
                        }}
                        onBlur={() =>
                          revalidateAdjust('amount', {
                            mode: 'maafi',
                            amount: adjustAmount,
                            reason: adjustReason,
                            due: Number(adjustOpen.due) || 0,
                          })
                        }
                      />
                    </FormField>
                    <FormField label={t('fees.maafiReason')} htmlFor="fee-maafi-reason" col={8} error={adjustErrors.reason}>
                      <AppInput
                        id="fee-maafi-reason"
                        value={adjustReason}
                        onChange={(e) => {
                          setAdjustReason(e.target.value)
                          revalidateAdjust('reason', {
                            mode: 'maafi',
                            amount: adjustAmount,
                            reason: e.target.value,
                            due: Number(adjustOpen.due) || 0,
                          })
                        }}
                        placeholder={t('fees.maafiReasonPlaceholder')}
                      />
                    </FormField>
                  </FormRow>
                </>
              ) : null}

              {adjustMode === 'balance' ? (
                <>
                  <p className="small text-secondary mb-2">{t('fees.applyBalanceHint')}</p>
                  <FormRow>
                    <FormField label={t('fees.applyBalanceAmount')} htmlFor="fee-bal-amt" col={4}>
                      <AppInput
                        id="fee-bal-amt"
                        type="number"
                        latin
                        min={1}
                        max={Math.min(Number(adjustOpen.balance) || 0, Number(adjustOpen.due) || 0) || undefined}
                        value={adjustAmount}
                        onChange={(e) => setAdjustAmount(e.target.value)}
                      />
                    </FormField>
                    <FormField label={t('fees.applyBalanceReason')} htmlFor="fee-bal-reason" col={8} error={adjustErrors.reason}>
                      <AppInput
                        id="fee-bal-reason"
                        value={adjustReason}
                        onChange={(e) => {
                          setAdjustReason(e.target.value)
                          revalidateAdjust('reason', {
                            mode: 'balance',
                            amount: adjustAmount,
                            reason: e.target.value,
                            due: Number(adjustOpen.due) || 0,
                          })
                        }}
                      />
                    </FormField>
                  </FormRow>
                </>
              ) : null}
            </div>
            <div className="modal-app-footer d-flex flex-wrap gap-2 justify-content-end">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setAdjustOpen(null)}>
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={
                  maafiSaving ||
                  balanceSaving ||
                  (adjustMode === 'maafi' &&
                    (!(Number(adjustAmount) > 0) ||
                      Number(adjustAmount) > (Number(adjustOpen.due) || 0) + 0.001))
                }
              >
                {adjustMode === 'maafi'
                  ? t('fees.maafiSubmit')
                  : adjustMode === 'balance'
                    ? t('fees.applyBalanceSubmit')
                    : t('common.save')}
              </button>
            </div>
          </form>
        </AppModalShell>
      ) : null}
    </div>
  )
}
