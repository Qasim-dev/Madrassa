import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import {
  useGetIdCardStudentsQuery,
  useGetIdCardTemplatesQuery,
  useGenerateIdCardsMutation,
  useGetDarajatQuery,
  useGetSubjectsQuery,
  useGetMeQuery,
  useGetSettingsQuery,
} from '../services/api'
import { loc } from '../shared/localized'
import { getInstitutionName } from '../shared/institutionBrand'
import { absoluteAssetUrl } from '../shared/assetUrl'
import { useCalendarMode } from '../app/calendarMode'
import PageHeading from '../components/PageHeading'
import FilterDrawer, { FilterToolbar } from '../components/FilterDrawer'
import AppModalShell from '../components/AppModalShell'
import ConfirmActionModal from '../components/ConfirmActionModal'
import { AppInput, AppSelect } from '../components/ui'
import IdCardFlipPreview from '../components/id-cards/IdCardFlipPreview'
import './idCardsPage.css'
import '../components/id-cards/studentIdCard.css'

const PAGE_SIZE = 10

function classLabel(student, lng) {
  if (student?.darjahId?.name) {
    const n = loc(student.darjahId.name, lng)
    const code = student.darjahId.code ? ` (${student.darjahId.code})` : ''
    return n + code
  }
  const g = student?.currentGradeId || student?.gradeId
  if (g?.name) return loc(g.name, lng)
  return '—'
}

function sectionLabel(student, lng) {
  if (student?.subjectId?.name) return loc(student.subjectId.name, lng)
  return '—'
}

export default function IdCardsPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const en = lng?.toLowerCase().startsWith('en')
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeSessionId = useSelector((s) => s.session.activeSessionId)
  const { mode } = useCalendarMode()

  const q = searchParams.get('q') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const filters = useMemo(
    () => ({
      darjahId: searchParams.get('darjahId') || '',
      subjectId: searchParams.get('subjectId') || '',
      gender: searchParams.get('gender') || '',
      templateKey: searchParams.get('templateKey') || 'pvc-prestige',
    }),
    [searchParams]
  )

  const [filterOpen, setFilterOpen] = useState(false)
  const [draft, setDraft] = useState(filters)
  const [selected, setSelected] = useState(() => new Set())
  const [flash, setFlash] = useState(null)
  const [genOpen, setGenOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [previewRow, setPreviewRow] = useState(null)
  const [genForm, setGenForm] = useState({
    bloodGroup: '',
    validityMonths: 12,
    templateKey: 'pvc-prestige',
  })

  const syncParams = useCallback(
    (next) => {
      const params = {}
      if (next.q) params.q = next.q
      if (next.page && next.page > 1) params.page = String(next.page)
      if (next.darjahId) params.darjahId = next.darjahId
      if (next.subjectId) params.subjectId = next.subjectId
      if (next.gender) params.gender = next.gender
      if (next.templateKey && next.templateKey !== 'pvc-prestige') params.templateKey = next.templateKey
      setSearchParams(params)
    },
    [setSearchParams]
  )

  const listParams = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      q: q || undefined,
      ...(activeSessionId ? { sessionId: activeSessionId } : {}),
      ...(filters.darjahId ? { darjahId: filters.darjahId } : {}),
      ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
      ...(filters.gender ? { gender: filters.gender } : {}),
    }),
    [page, q, activeSessionId, filters]
  )

  const { data, isLoading, isFetching, refetch } = useGetIdCardStudentsQuery(listParams)
  const { data: templates = [] } = useGetIdCardTemplatesQuery()
  const { data: me } = useGetMeQuery()
  const { data: settings } = useGetSettingsQuery()
  const { data: darajat = [] } = useGetDarajatQuery(
    activeSessionId ? { sessionId: activeSessionId } : undefined,
    { skip: !activeSessionId }
  )
  const { data: subjects = [] } = useGetSubjectsQuery(
    activeSessionId ? { sessionId: activeSessionId } : undefined,
    { skip: !activeSessionId }
  )
  const [generateCards, { isLoading: generating }] = useGenerateIdCardsMutation()

  const items = data?.items ?? []
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0, limit: PAGE_SIZE }
  const filterActiveCount = [filters.darjahId, filters.subjectId, filters.gender].filter(Boolean).length

  const pageIds = items.map((row) => String(row.student._id))
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id))

  const institutionName = getInstitutionName(me, 'en') || getInstitutionName(me, lng)
  const institutionNameUr = me?.tenant?.name?.ur || ''
  const logoUrl = settings?.logoUrl ? absoluteAssetUrl(settings.logoUrl) : ''
  const instituteAddress = loc(settings?.address, lng) || ''

  const templateOptions = templates.length
    ? templates
    : [
        { key: 'pvc-prestige', name: { en: 'Prestige PVC', ur: 'پریسٹیج PVC' } },
        { key: 'pvc-classic', name: { en: 'Classic Green', ur: 'کلاسیک سبز' } },
      ]

  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function togglePage() {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allPageSelected) pageIds.forEach((id) => next.delete(id))
      else pageIds.forEach((id) => next.add(id))
      return next
    })
  }

  function showFlash(text, tone = 'success') {
    setFlash({ text, tone })
    window.setTimeout(() => setFlash(null), 4500)
  }

  function openPrint(ids) {
    const params = new URLSearchParams()
    if (ids?.length) params.set('ids', ids.join(','))
    else {
      if (q) params.set('q', q)
      if (activeSessionId) params.set('sessionId', activeSessionId)
      if (filters.darjahId) params.set('darjahId', filters.darjahId)
      if (filters.subjectId) params.set('subjectId', filters.subjectId)
      if (filters.gender) params.set('gender', filters.gender)
    }
    params.set('templateKey', genForm.templateKey || filters.templateKey || 'pvc-prestige')
    navigate(`/id-cards/print?${params.toString()}`)
  }

  function openGenerate(ids) {
    if (ids?.length) setSelected(new Set(ids.map(String)))
    setGenForm((f) => ({ ...f, templateKey: filters.templateKey || 'pvc-prestige' }))
    setGenOpen(true)
  }

  async function runGenerate(ids) {
    try {
      const res = await generateCards({
        studentIds: ids,
        sessionId: activeSessionId || undefined,
        templateKey: genForm.templateKey || filters.templateKey,
        bloodGroup: genForm.bloodGroup || undefined,
        validityMonths: Number(genForm.validityMonths) || 12,
      }).unwrap()
      setGenOpen(false)
      showFlash(
        en ? `Generated / updated ${res.count} card(s)` : `${res.count} کارڈ تیار / اپڈیٹ ہو گئے`
      )
      refetch()
      return res
    } catch (err) {
      showFlash(err?.data?.message || err?.error || 'Generate failed', 'danger')
      return null
    }
  }

  return (
    <div className="id-cards-page">
      <PageHeading navKey="navIdCards">
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => navigate('/id-cards/templates')}>
          {t('idCards.templates')}
        </button>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => navigate('/id-cards/history')}>
          {t('idCards.history')}
        </button>
      </PageHeading>

      {flash ? (
        <div className={`alert alert-${flash.tone} id-cards-flash`} role="alert">
          {flash.text}
        </div>
      ) : null}

      <FilterToolbar
        search={q}
        onSearchChange={(v) => syncParams({ q: v, page: 1, ...filters })}
        searchPlaceholder={t('idCards.searchPlaceholder')}
        searchId="idc-search"
        onOpenFilters={() => {
          setDraft(filters)
          setFilterOpen(true)
        }}
        activeCount={filterActiveCount}
      >
        <button
          type="button"
          className="btn btn-sm btn-success"
          disabled={!selected.size}
          onClick={() => openGenerate([...selected])}
        >
          {t('idCards.generateSelected')}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-primary"
          disabled={!selected.size}
          onClick={() => openPrint([...selected])}
        >
          {t('idCards.printSelected')}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          disabled={!pagination.total}
          onClick={() => setBulkOpen(true)}
          title={en ? 'Print all students matching filters' : 'فلٹر کے مطابق تمام کارڈز پرنٹ'}
        >
          {t('idCards.bulkPrint')}
        </button>
      </FilterToolbar>

      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title={t('idCards.filterTitle')}
        onApply={() => {
          syncParams({ q, page: 1, ...draft })
          setFilterOpen(false)
        }}
        onReset={() => setDraft({ darjahId: '', subjectId: '', gender: '', templateKey: 'pvc-prestige' })}
      >
        <div className="filter-drawer__field">
          <label className="filter-drawer__label" htmlFor="idc-subject">
            {en ? 'Section / Subject' : 'شعبہ'}
          </label>
          <AppSelect
            id="idc-subject"
            value={draft.subjectId}
            onChange={(e) => setDraft((p) => ({ ...p, subjectId: e.target.value }))}
          >
            <option value="">{en ? 'All' : 'تمام'}</option>
            {subjects.map((s) => (
              <option key={s._id} value={s._id}>
                {loc(s.name, lng)}
              </option>
            ))}
          </AppSelect>
        </div>
        <div className="filter-drawer__field">
          <label className="filter-drawer__label" htmlFor="idc-darjah">
            {en ? 'Class / Darjah' : 'درجہ'}
          </label>
          <AppSelect
            id="idc-darjah"
            value={draft.darjahId}
            onChange={(e) => setDraft((p) => ({ ...p, darjahId: e.target.value }))}
          >
            <option value="">{en ? 'All' : 'تمام'}</option>
            {darajat.map((d) => (
              <option key={d._id} value={d._id}>
                {loc(d.name, lng)}
              </option>
            ))}
          </AppSelect>
        </div>
        <div className="filter-drawer__field">
          <label className="filter-drawer__label" htmlFor="idc-gender">
            {en ? 'Gender' : 'جنس'}
          </label>
          <AppSelect
            id="idc-gender"
            value={draft.gender}
            onChange={(e) => setDraft((p) => ({ ...p, gender: e.target.value }))}
          >
            <option value="">{en ? 'All' : 'تمام'}</option>
            <option value="male">{en ? 'Male' : 'مرد'}</option>
            <option value="female">{en ? 'Female' : 'عورت'}</option>
          </AppSelect>
        </div>
        <div className="filter-drawer__field">
          <label className="filter-drawer__label" htmlFor="idc-tpl">
            {t('idCards.template')}
          </label>
          <AppSelect
            id="idc-tpl"
            value={draft.templateKey}
            onChange={(e) => setDraft((p) => ({ ...p, templateKey: e.target.value }))}
          >
            {templateOptions.map((tpl) => (
              <option key={tpl.key} value={tpl.key}>
                {loc(tpl.name, lng) || tpl.key}
              </option>
            ))}
          </AppSelect>
        </div>
      </FilterDrawer>

      <div className="id-cards-selection">
        <div className="id-cards-selection__count">
          {en ? (
            <>
              <strong>{selected.size}</strong> selected · {pagination.total} total
            </>
          ) : (
            <>
              <strong>{selected.size}</strong> منتخب · کل {pagination.total}
            </>
          )}
        </div>
        <div className="id-cards-selection__actions">
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={togglePage}>
            {allPageSelected ? t('idCards.clearPage') : t('idCards.selectPage')}
          </button>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setSelected(new Set())}>
            {t('idCards.clearSelection')}
          </button>
        </div>
      </div>

      <div className="id-cards-table-wrap">
        {isLoading || isFetching ? (
          <p className="p-3 text-secondary mb-0">{t('common.loading')}</p>
        ) : items.length === 0 ? (
          <p className="p-3 text-secondary mb-0">{t('common.noRecords')}</p>
        ) : (
          <table className="id-cards-table">
            <thead>
              <tr>
                <th className="id-cards-table__check" scope="col">
                  <input type="checkbox" checked={allPageSelected} onChange={togglePage} aria-label="Select page" />
                </th>
                <th className="id-cards-table__id" scope="col">
                  {en ? 'Student ID' : 'رجسٹر نمبر'}
                </th>
                <th className="id-cards-table__name" scope="col">
                  {en ? 'Name' : 'نام'}
                </th>
                <th className="id-cards-table__subject" scope="col">
                  {en ? 'Section' : 'شعبہ'}
                </th>
                <th className="id-cards-table__class" scope="col">
                  {en ? 'Class' : 'درجہ'}
                </th>
                <th className="id-cards-table__card" scope="col">
                  {en ? 'Card' : 'کارڈ'}
                </th>
                <th className="id-cards-table__actions" scope="col">
                  {en ? 'Actions' : 'اعمال'}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map(({ student, card }) => {
                const id = String(student._id)
                return (
                  <tr key={id}>
                    <td className="id-cards-table__check">
                      <input
                        type="checkbox"
                        checked={selected.has(id)}
                        onChange={() => toggleOne(id)}
                        aria-label={loc(student.name, lng)}
                      />
                    </td>
                    <td className="id-cards-table__id">
                      <span className="id-cards-table__ltr">{student.studentId || '—'}</span>
                    </td>
                    <td className="id-cards-table__name">{loc(student.name, lng) || '—'}</td>
                    <td className="id-cards-table__subject">{sectionLabel(student, lng)}</td>
                    <td className="id-cards-table__class">{classLabel(student, lng)}</td>
                    <td className="id-cards-table__card">
                      {card ? (
                        <span className="id-cards-badge id-cards-badge--ok">
                          <span className="id-cards-table__ltr">{card.cardNumber}</span>
                        </span>
                      ) : (
                        <span className="id-cards-badge id-cards-badge--muted">{en ? 'Not generated' : 'تیار نہیں'}</span>
                      )}
                    </td>
                    <td className="id-cards-table__actions">
                      <div className="id-cards-row-actions">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => setPreviewRow({ student, card })}
                        >
                          {t('idCards.preview')}
                        </button>
                        {card ? (
                          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openPrint([id])}>
                            {t('idCards.print')}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success"
                            onClick={() => openGenerate([id])}
                          >
                            {t('idCards.generate')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {pagination.totalPages > 1 ? (
        <div className="students-pagination no-print" style={{ marginTop: '1rem' }}>
          <span className="students-pagination__count">
            {en
              ? `Page ${pagination.page} / ${pagination.totalPages}`
              : `صفحہ ${pagination.page} / ${pagination.totalPages}`}
          </span>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              disabled={pagination.page <= 1}
              onClick={() => syncParams({ q, page: pagination.page - 1, ...filters })}
            >
              {en ? 'Prev' : 'پچھلا'}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => syncParams({ q, page: pagination.page + 1, ...filters })}
            >
              {en ? 'Next' : 'اگلا'}
            </button>
          </div>
        </div>
      ) : null}

      {/* Generate modal */}
      <AppModalShell
        open={genOpen}
        title={t('idCards.generateTitle')}
        onClose={() => setGenOpen(false)}
        dialogClassName="id-cards-modal"
      >
        <div className="modal-app-body">
          <p className="id-cards-modal__lead">
            {en
              ? `${selected.size} student(s). Blood group & expiry are stored on the card only.`
              : `${selected.size} طلباء۔ بلڈ گروپ اور میعاد صرف کارڈ پر محفوظ ہوں گے۔`}
          </p>
          <div className="id-cards-modal__grid">
            <div>
              <label className="form-label small" htmlFor="gen-blood">
                {en ? 'Blood group (optional)' : 'بلڈ گروپ (اختیاری)'}
              </label>
              <AppInput
                id="gen-blood"
                value={genForm.bloodGroup}
                onChange={(e) => setGenForm((p) => ({ ...p, bloodGroup: e.target.value }))}
                placeholder="A+, B-, O+…"
                latin
              />
            </div>
            <div>
              <label className="form-label small" htmlFor="gen-months">
                {en ? 'Validity (months)' : 'میعاد (ماہ)'}
              </label>
              <AppInput
                id="gen-months"
                type="number"
                min={1}
                max={60}
                value={genForm.validityMonths}
                onChange={(e) => setGenForm((p) => ({ ...p, validityMonths: e.target.value }))}
                latin
              />
            </div>
            <div className="id-cards-modal__full">
              <label className="form-label small" htmlFor="gen-tpl">
                {t('idCards.template')}
              </label>
              <AppSelect
                id="gen-tpl"
                value={genForm.templateKey}
                onChange={(e) => setGenForm((p) => ({ ...p, templateKey: e.target.value }))}
              >
                {templateOptions.map((tpl) => (
                  <option key={tpl.key} value={tpl.key}>
                    {loc(tpl.name, lng) || tpl.key}
                  </option>
                ))}
              </AppSelect>
            </div>
          </div>
        </div>
        <div className="modal-app-footer d-flex flex-wrap gap-2 justify-content-end">
          <button type="button" className="btn btn-outline-secondary" onClick={() => setGenOpen(false)}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="btn btn-outline-success"
            disabled={generating || !selected.size}
            onClick={async () => {
              await runGenerate([...selected])
            }}
          >
            {generating ? t('common.loading') : t('idCards.generateOnly')}
          </button>
          <button
            type="button"
            className="btn btn-success"
            disabled={generating || !selected.size}
            onClick={async () => {
              const res = await runGenerate([...selected])
              if (res) openPrint([...selected])
            }}
          >
            {generating ? t('common.loading') : t('idCards.generateAndPrint')}
          </button>
        </div>
      </AppModalShell>

      {/* Bulk print confirm */}
      <ConfirmActionModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title={t('idCards.bulkPrintTitle')}
        confirmLabel={t('idCards.bulkPrintConfirm')}
        confirmVariant="success"
        dialogClassName="id-cards-modal"
        onConfirm={async () => {
          openPrint(null)
        }}
      >
        <p className="mb-2">
          {en
            ? `Print up to ${Math.min(pagination.total, 500)} ID card(s) matching the current filters${
                q || filterActiveCount ? '' : ' (all students in session)'
              }.`
            : `موجودہ فلٹر کے مطابق ${Math.min(pagination.total, 500)} تک شناختی کارڈ پرنٹ ہوں گے۔`}
        </p>
        <ul className="id-cards-modal__bullets mb-0">
          <li>{en ? 'Missing cards will be generated on Print.' : 'غائب کارڈ پرنٹ پر تیار ہوں گے۔'}</li>
          <li>{en ? 'You can flip & adjust settings on the preview page.' : 'پریویو صفحے پر پلٹائیں اور سیٹنگز بدلیں۔'}</li>
          <li>{en ? 'PDF: use Print → Save as PDF.' : 'PDF: پرنٹ → Save as PDF۔'}</li>
        </ul>
      </ConfirmActionModal>

      {/* Flip preview modal */}
      <AppModalShell
        open={Boolean(previewRow)}
        title={t('idCards.previewTitle')}
        onClose={() => setPreviewRow(null)}
        size="lg"
        dialogClassName="id-cards-modal id-cards-modal--preview"
      >
        <div className="modal-app-body id-cards-preview-body">
          {previewRow ? (
            <>
              <div className="id-cards-preview-meta">
                <strong>{loc(previewRow.student.name, lng) || '—'}</strong>
                <span dir="ltr">{previewRow.student.studentId || '—'}</span>
                {previewRow.card?.cardNumber ? (
                  <span className="id-cards-badge id-cards-badge--ok">{previewRow.card.cardNumber}</span>
                ) : (
                  <span className="id-cards-badge id-cards-badge--muted">{en ? 'Not generated' : 'تیار نہیں'}</span>
                )}
              </div>
              <IdCardFlipPreview
                student={previewRow.student}
                card={
                  previewRow.card || {
                    qrToken: '',
                    bloodGroup: '',
                    expiryDate: null,
                    cardNumber: '',
                  }
                }
                lng={lng}
                calendarMode={mode}
                institutionName={institutionName}
                institutionNameUr={institutionNameUr}
                logoUrl={logoUrl}
                instituteAddress={instituteAddress}
                templateKey={filters.templateKey || 'pvc-prestige'}
                showQr={Boolean(previewRow.card?.qrToken)}
                showBloodGroup
                showAddress
              />
              <p className="id-cards-preview-hint mb-0">
                {en ? 'Click the card or Flip to see the back.' : 'کارڈ یا پلٹائیں دبا کر پشت دیکھیں۔'}
              </p>
            </>
          ) : null}
        </div>
        <div className="modal-app-footer d-flex flex-wrap gap-2 justify-content-end">
          <button type="button" className="btn btn-outline-secondary" onClick={() => setPreviewRow(null)}>
            {t('common.cancel')}
          </button>
          {previewRow?.card ? (
            <button
              type="button"
              className="btn btn-success"
              onClick={() => {
                const id = String(previewRow.student._id)
                setPreviewRow(null)
                openPrint([id])
              }}
            >
              {t('idCards.print')}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-success"
              onClick={() => {
                const id = String(previewRow.student._id)
                setPreviewRow(null)
                openGenerate([id])
              }}
            >
              {t('idCards.generateAndPrint')}
            </button>
          )}
        </div>
      </AppModalShell>
    </div>
  )
}
