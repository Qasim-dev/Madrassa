import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  useGetIdCardPrintPayloadQuery,
  useGetMeQuery,
  useGetSettingsQuery,
  useGenerateIdCardsMutation,
  useLogIdCardPrintMutation,
} from '../services/api'
import { loc } from '../shared/localized'
import { getInstitutionName } from '../shared/institutionBrand'
import { absoluteAssetUrl } from '../shared/assetUrl'
import { useCalendarMode } from '../app/calendarMode'
import PageHeading from '../components/PageHeading'
import AppModalShell from '../components/AppModalShell'
import { StudentIdCardPair } from '../components/id-cards/StudentIdCard'
import IdCardFlipPreview from '../components/id-cards/IdCardFlipPreview'
import { AppSelect } from '../components/ui'
import { useFlash } from '../app/flash.jsx'
import './idCardsPage.css'
import '../components/id-cards/studentIdCard.css'
import './studentsPage.css'

export default function IdCardsPrintPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const en = lng?.toLowerCase().startsWith('en')
  const navigate = useNavigate()
  const { showFlash } = useFlash()
  const [searchParams] = useSearchParams()
  const { mode } = useCalendarMode()

  const ids = searchParams.get('ids') || undefined
  const templateKey = searchParams.get('templateKey') || 'pvc-prestige'
  const isBulk = !ids

  const queryParams = useMemo(() => {
    const p = {}
    if (ids) p.ids = ids
    ;['q', 'sessionId', 'darjahId', 'subjectId', 'gender', 'gradeId'].forEach((k) => {
      const v = searchParams.get(k)
      if (v) p[k] = v
    })
    return p
  }, [searchParams, ids])

  const { data, isLoading, isError, isFetching, refetch } = useGetIdCardPrintPayloadQuery(queryParams)
  const { data: me } = useGetMeQuery()
  const { data: settings } = useGetSettingsQuery()
  const [generateCards, { isLoading: generating }] = useGenerateIdCardsMutation()
  const [logPrint, { isLoading: logging }] = useLogIdCardPrintMutation()

  const [settingsForm, setSettingsForm] = useState({
    sides: 'front-back',
    sheet: isBulk ? 'a4-8' : 'single',
    showQr: true,
    showBloodGroup: true,
    showAddress: true,
    cropMarks: false,
    copies: 1,
    templateKey,
  })
  const [previewIndex, setPreviewIndex] = useState(0)
  const [printing, setPrinting] = useState(false)
  const [pdfTipOpen, setPdfTipOpen] = useState(false)

  const items = data?.items ?? []
  const truncated = Boolean(data?.truncated)
  const institutionName = getInstitutionName(me, 'en') || getInstitutionName(me, lng)
  const institutionNameUr = me?.tenant?.name?.ur || ''
  const logoUrl = settings?.logoUrl || ''
  const instituteAddress = loc(settings?.address, lng) || ''

  const missingCards = items.filter((row) => !row.card).map((row) => String(row.student._id))
  const safePreviewIndex = items.length ? Math.min(previewIndex, items.length - 1) : 0
  const previewItem = items[safePreviewIndex]

  const printType = useMemo(() => {
    if (ids) {
      const n = String(ids).split(',').filter(Boolean).length
      return n === 1 ? 'single' : 'selected'
    }
    return 'bulk'
  }, [ids])

  async function ensureCards() {
    if (!missingCards.length) return true
    try {
      await generateCards({
        studentIds: missingCards,
        sessionId: searchParams.get('sessionId') || undefined,
        templateKey: settingsForm.templateKey,
        validityMonths: 12,
      }).unwrap()
      await refetch()
      return true
    } catch {
      return false
    }
  }

  async function runPrintJob() {
    setPrinting(true)
    try {
      const ok = await ensureCards()
      if (!ok && missingCards.length) {
        showFlash(en ? 'Could not generate missing cards' : 'کارڈ تیار نہیں ہو سکے')
        return
      }
      const studentIds = items.map((r) => r.student._id)
      try {
        await logPrint({
          templateKey: settingsForm.templateKey,
          copies: Number(settingsForm.copies) || 1,
          printType,
          studentIds,
          settings: settingsForm,
        }).unwrap()
      } catch {
        /* still allow print */
      }
      window.print()
    } finally {
      setPrinting(false)
      setPdfTipOpen(false)
    }
  }

  function handlePrint() {
    runPrintJob()
  }

  function handleDownloadPdf() {
    setPdfTipOpen(true)
  }

  const showBack = settingsForm.sides === 'front-back'
  const sheetClass =
    settingsForm.sheet === 'a4-8'
      ? 'sid-sheet sid-sheet--a4-8'
      : settingsForm.sheet === 'a4-10'
        ? 'sid-sheet sid-sheet--a4-10'
        : settingsForm.sheet === 'a4-12'
          ? 'sid-sheet sid-sheet--a4-12'
          : 'sid-sheet sid-sheet--single'

  const faceShared = {
    lng,
    calendarMode: mode,
    institutionName,
    institutionNameUr,
    logoUrl: logoUrl ? absoluteAssetUrl(logoUrl) : '',
    instituteAddress,
    templateKey: settingsForm.templateKey,
    showQr: settingsForm.showQr,
    showBloodGroup: settingsForm.showBloodGroup,
    showAddress: settingsForm.showAddress,
  }

  if (isLoading) {
    return (
      <div className="content-panel p-4">
        <p className="text-muted mb-0">{t('common.loading')}</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="content-panel p-4">
        <p className="text-danger">{en ? 'Failed to load cards' : 'کارڈز لوڈ نہیں ہوئے'}</p>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => navigate('/id-cards')}>
          {t('common.back')}
        </button>
      </div>
    )
  }

  const busy = printing || generating || logging || isFetching

  return (
    <div className="id-cards-print-page">
      <PageHeading navKey="navIdCardsPrint" showBreadcrumb>
        <button type="button" className="btn btn-sm btn-outline-secondary no-print" onClick={() => navigate('/id-cards')}>
          {t('common.back')}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-primary no-print"
          onClick={handleDownloadPdf}
          disabled={!items.length || busy}
        >
          {t('idCards.downloadPdf')}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-success no-print"
          onClick={handlePrint}
          disabled={!items.length || busy}
        >
          {busy ? t('common.loading') : t('idCards.printAll')}
        </button>
      </PageHeading>

      <div className="id-cards-print-hero no-print">
        <div>
          <h1 className="id-cards-print-hero__title">{t('idCards.printPreview')}</h1>
          <p className="id-cards-print-hero__sub mb-0">
            {en
              ? `${items.length} card(s) shown below · Print all or Download PDF`
              : `${items.length} کارڈ نیچے دکھائے گئے · سب پرنٹ یا PDF ڈاؤن لوڈ`}
          </p>
        </div>
        {truncated ? (
          <span className="id-cards-badge id-cards-badge--muted">{en ? 'Capped at 500' : 'حد 500'}</span>
        ) : null}
      </div>

      <div className="id-cards-print-layout">
        <aside className="id-cards-print-panel no-print">
          <h2 className="id-cards-print-panel__title">{t('idCards.printSettings')}</h2>
          <div className="id-cards-print-settings id-cards-print-settings--stack">
            <label>
              {en ? 'Sides' : 'اطراف'}
              <AppSelect
                value={settingsForm.sides}
                onChange={(e) => setSettingsForm((p) => ({ ...p, sides: e.target.value }))}
              >
                <option value="front-only">{en ? 'Front only' : 'صرف سامنے'}</option>
                <option value="front-back">{en ? 'Front + Back' : 'سامنے + پشت'}</option>
              </AppSelect>
            </label>
            <label>
              {en ? 'Sheet' : 'شیٹ'}
              <AppSelect
                value={settingsForm.sheet}
                onChange={(e) => setSettingsForm((p) => ({ ...p, sheet: e.target.value }))}
              >
                <option value="single">{en ? 'Single CR80' : 'اکیلا CR80'}</option>
                <option value="a4-8">A4 · 8</option>
                <option value="a4-10">A4 · 10</option>
                <option value="a4-12">A4 · 12</option>
              </AppSelect>
            </label>
            <label>
              {t('idCards.template')}
              <AppSelect
                value={settingsForm.templateKey}
                onChange={(e) => setSettingsForm((p) => ({ ...p, templateKey: e.target.value }))}
              >
                <option value="pvc-prestige">{en ? 'Prestige PVC' : 'پریسٹیج PVC'}</option>
                <option value="pvc-classic">{en ? 'Classic Green' : 'کلاسیک سبز'}</option>
              </AppSelect>
            </label>
            <div className="id-cards-print-checks">
              <label className="id-cards-check">
                <input
                  type="checkbox"
                  checked={settingsForm.showQr}
                  onChange={(e) => setSettingsForm((p) => ({ ...p, showQr: e.target.checked }))}
                />
                {en ? 'Show QR' : 'QR دکھائیں'}
              </label>
              <label className="id-cards-check">
                <input
                  type="checkbox"
                  checked={settingsForm.showBloodGroup}
                  onChange={(e) => setSettingsForm((p) => ({ ...p, showBloodGroup: e.target.checked }))}
                />
                {en ? 'Blood group' : 'بلڈ گروپ'}
              </label>
              <label className="id-cards-check">
                <input
                  type="checkbox"
                  checked={settingsForm.cropMarks}
                  onChange={(e) => setSettingsForm((p) => ({ ...p, cropMarks: e.target.checked }))}
                />
                {en ? 'Crop marks' : 'کٹ مارکس'}
              </label>
            </div>
          </div>

          {missingCards.length ? (
            <div className="alert alert-warning mb-0 mt-3 py-2 px-3 small">
              {en
                ? `${missingCards.length} without a card — generated on Print.`
                : `${missingCards.length} بغیر کارڈ — پرنٹ پر تیار ہوں گے۔`}
            </div>
          ) : null}

          {previewItem ? (
            <div className="id-cards-print-flip-box mt-3">
              <div className="id-cards-print-preview-pane__head">
                <h3 className="id-cards-print-panel__title mb-0">{t('idCards.flipPreview')}</h3>
                {items.length > 1 ? (
                  <div className="id-cards-preview-nav">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      disabled={safePreviewIndex <= 0}
                      onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))}
                    >
                      {en ? 'Prev' : 'پچھلا'}
                    </button>
                    <span className="id-cards-preview-nav__count" dir="ltr">
                      {safePreviewIndex + 1} / {items.length}
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      disabled={safePreviewIndex >= items.length - 1}
                      onClick={() => setPreviewIndex((i) => Math.min(items.length - 1, i + 1))}
                    >
                      {en ? 'Next' : 'اگلا'}
                    </button>
                  </div>
                ) : null}
              </div>
              <IdCardFlipPreview
                student={previewItem.student}
                card={
                  previewItem.card || {
                    qrToken: '',
                    bloodGroup: '',
                    expiryDate: null,
                    cardNumber: '',
                  }
                }
                {...faceShared}
              />
            </div>
          ) : null}
        </aside>

        <section className="id-cards-print-preview-pane id-cards-print-preview-pane--all">
          <div className="id-cards-print-preview-pane__head no-print">
            <h2 className="id-cards-print-panel__title mb-0">{t('idCards.allCardsPreview')}</h2>
            <span className="id-cards-badge id-cards-badge--ok" dir="ltr">
              {items.length}
            </span>
          </div>

          {!items.length ? (
            <p className="text-secondary mb-0 no-print">{t('common.noRecords')}</p>
          ) : (
            <div className={`${sheetClass} id-cards-print-sheet id-cards-print-sheet--screen`}>
              {items.map(({ student, card }) => (
                <div key={student._id} className="sid-sheet-item">
                  <StudentIdCardPair
                    showBack={showBack}
                    cropMarks={settingsForm.cropMarks}
                    student={student}
                    card={card || { qrToken: '', bloodGroup: '', expiryDate: null, cardNumber: '' }}
                    {...faceShared}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <AppModalShell
        open={pdfTipOpen}
        title={t('idCards.downloadPdf')}
        onClose={() => setPdfTipOpen(false)}
        dialogClassName="id-cards-modal"
      >
        <div className="modal-app-body">
          <p className="id-cards-modal__lead mb-0">
            {en
              ? 'In the print dialog, choose “Save as PDF” (or Microsoft Print to PDF) as the printer destination. All cards below will be included.'
              : 'پرنٹ ڈائیلاگ میں پرنٹر کے طور پر “Save as PDF” (یا Microsoft Print to PDF) منتخب کریں۔ نیچے والے تمام کارڈ شامل ہوں گے۔'}
          </p>
        </div>
        <div className="modal-app-footer d-flex flex-wrap gap-2 justify-content-end">
          <button type="button" className="btn btn-outline-secondary" onClick={() => setPdfTipOpen(false)}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="btn btn-success"
            disabled={busy}
            onClick={() => runPrintJob()}
          >
            {busy ? t('common.loading') : t('idCards.openPrintDialog')}
          </button>
        </div>
      </AppModalShell>
    </div>
  )
}
