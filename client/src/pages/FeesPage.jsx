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

const FREQ = [
  { id: 'monthly', ur: 'ماہانہ', en: 'Monthly' },
  { id: 'annual', ur: 'سالانہ', en: 'Annual' },
  { id: 'one_time', ur: 'ایک بار', en: 'One-time' },
]

const HOWTO_DISMISS_KEY = 'fees-howto-dismissed'

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
                setDeleteBalanceTarget(b)
              }}
            >
              {t('fees.deleteBalance')}
            </button>
          </div>
        ),
      },
    ],
    [lng, t, financeAccounts]
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
    if (!title.ur?.trim() && !title.en?.trim()) {
      flash(t('common.error'), 'danger')
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
      refetch()
      flash(t('fees.afterAddHint'), 'warning')
    } catch (err) {
      flash(err?.data?.message || t('common.error'), 'danger')
    }
  }

  async function submitCollect(e) {
    e.preventDefault()
    if (!collectOpen) return
    const amt = Number(collectAmount)
    if (!Number.isFinite(amt) || amt <= 0) {
      flash(t('finance.validationAmount'), 'danger')
      return
    }
    const due = Number(collectOpen.due) || 0
    if (amt > due + 0.001) {
      flash(t('fees.amountExceedsDue'), 'danger')
      return
    }
    const acc = collectAccountId || financeAccounts[0]?._id
    if (!acc) {
      flash(t('fees.collectNeedAccount'), 'warning')
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
      const amt = Number(adjustAmount)
      const dueNow = Number(adjustOpen.due) || 0
      if (!Number.isFinite(amt) || amt <= 0) {
        flash(t('finance.validationAmount'), 'danger')
        return
      }
      if (dueNow <= 0) {
        flash(t('fees.maafiNoDue'), 'warning')
        return
      }
      if (amt > dueNow + 0.001) {
        flash(t('fees.maafiExceedsDue', { due: dueNow }), 'danger')
        return
      }
      if (adjustReason.trim().length < 3) {
        flash(t('fees.reasonRequired'), 'warning')
        return
      }
      try {
        await applyMaafi({
          id: adjustOpen._id,
          amount: amt,
          reason: adjustReason.trim(),
          ...(activeSessionId ? { sessionId: activeSessionId } : {}),
        }).unwrap()
        setAdjustOpen(null)
        refetchBalances()
        refetchAudit()
        flash(t('fees.maafiDone'))
      } catch (err) {
        flash(err?.data?.message || t('common.error'), 'danger')
      }
      return
    }

    if (adjustMode === 'balance') {
      if (adjustReason.trim().length < 3) {
        flash(t('fees.reasonRequired'), 'warning')
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
    if (reason.length < 5) {
      flash(t('fees.deleteBalanceReasonShort'), 'warning')
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
            <FormField k="feeTitleUr" htmlFor="fee-tu" langField="ur">
              <AppInput
                id="fee-tu"
                value={title.ur}
                onChange={(e) => setTitle({ ...title, ur: e.target.value })}
                required
              />
            </FormField>
          </div>
          <div className="exam-toolbar__field" data-lang-field="en">
            <FormField k="feeTitleEn" htmlFor="fee-te" langField="en">
              <AppInput
                id="fee-te"
                latin
                value={title.en}
                onChange={(e) => setTitle({ ...title, en: e.target.value })}
              />
            </FormField>
          </div>
          <div className="exam-toolbar__field exam-toolbar__field--narrow">
            <FormField k="amount" htmlFor="fee-amt">
              <AppInput
                id="fee-amt"
                type="number"
                latin
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
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
              <FormField label={t('fees.deleteBalanceReason')} htmlFor="delete-balance-reason">
                <AppInput
                  id="delete-balance-reason"
                  type="text"
                  value={deleteBalanceReason}
                  onChange={(e) => setDeleteBalanceReason(e.target.value)}
                  placeholder={t('fees.deleteBalanceReasonPlaceholder')}
                  required
                  minLength={5}
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
                <FormField label={t('fees.collectAmount')} htmlFor="fee-collect-amt" col={4}>
                  <AppInput
                    id="fee-collect-amt"
                    type="number"
                    latin
                    min={1}
                    max={Number(collectOpen.due) || undefined}
                    step="1"
                    value={collectAmount}
                    onChange={(e) => setCollectAmount(e.target.value)}
                    required
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

                <FormField label={t('fees.accountLabel')} htmlFor="fee-collect-acc" col={4}>
                  <AppSelect
                    id="fee-collect-acc"
                    value={collectAccountId}
                    onChange={(e) => setCollectAccountId(e.target.value)}
                    required
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
                    <FormField label={t('fees.maafiAmount')} htmlFor="fee-maafi-amt" col={4}>
                      <AppInput
                        id="fee-maafi-amt"
                        type="number"
                        latin
                        min={1}
                        max={Number(adjustOpen.due) || 0}
                        value={adjustAmount}
                        onChange={(e) => {
                          const dueCap = Number(adjustOpen.due) || 0
                          const raw = e.target.value
                          if (raw === '') {
                            setAdjustAmount('')
                            return
                          }
                          const n = Number(raw)
                          if (!Number.isFinite(n)) {
                            setAdjustAmount(raw)
                            return
                          }
                          setAdjustAmount(String(Math.min(Math.max(0, n), dueCap)))
                        }}
                        required
                      />
                    </FormField>
                    <FormField label={t('fees.maafiReason')} htmlFor="fee-maafi-reason" col={8}>
                      <AppInput
                        id="fee-maafi-reason"
                        value={adjustReason}
                        onChange={(e) => setAdjustReason(e.target.value)}
                        placeholder={t('fees.maafiReasonPlaceholder')}
                        required
                        minLength={3}
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
                    <FormField label={t('fees.applyBalanceReason')} htmlFor="fee-bal-reason" col={8}>
                      <AppInput
                        id="fee-bal-reason"
                        value={adjustReason}
                        onChange={(e) => setAdjustReason(e.target.value)}
                        required
                        minLength={3}
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
