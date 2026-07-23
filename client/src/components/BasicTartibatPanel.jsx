import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGetSettingsQuery, usePatchSettingsMutation } from '../services/api'
import { loc, flText, uiLang } from '../shared/localized'
import { FL } from '../shared/fieldLabels'
import AppModalShell from './AppModalShell'
import BilingualLabel from './BilingualLabel'
import { AppInput, AppCheckbox } from './ui'

const emptyLoc = () => ({ ur: '', en: '' })

const TILES = [
  { id: 'examNames', k: 'tartibatTileExamNames' },
  { id: 'lessonNames', k: 'tartibatTileLessonNames' },
  { id: 'attendanceTimes', k: 'tartibatTileAttendanceTimes' },
  { id: 'withdrawal', k: 'tartibatTileWithdrawal' },
]

/**
 * Tenant-scoped “basic tartibat”: lookup lists stored on TenantSettings.
 * Data is available via useGetSettingsQuery() elsewhere in the app.
 */
export default function BasicTartibatPanel() {
  const { i18n } = useTranslation()
  const lng = i18n.language
  const lang = uiLang(lng)

  const { data: settings, refetch: refetchSettings } = useGetSettingsQuery()
  const [patchSettings] = usePatchSettingsMutation()

  const [modal, setModal] = useState(null)

  const merged = useMemo(() => {
    const s = settings || {}
    return {
      examNames: Array.isArray(s.examNames) ? s.examNames : [],
      lessonNames: Array.isArray(s.lessonNames) ? s.lessonNames : [],
      attendanceTimes: Array.isArray(s.attendanceTimes) ? s.attendanceTimes : [],
      withdrawalReasons: Array.isArray(s.withdrawalReasons) ? s.withdrawalReasons : [],
    }
  }, [settings])

  async function savePatch(partial) {
    await patchSettings(partial).unwrap()
    refetchSettings()
  }

  return (
    <div className="content-panel p-0 overflow-hidden mb-4">
      <div className="page-toolbar page-toolbar--strip page-toolbar--panel-top">
        <div className="page-toolbar__head page-toolbar__head--only min-w-0">
          <h2 className="content-panel-head__title mb-0" lang={lang}>
            {flText(FL.basicTartibatSection, lng)}
          </h2>
        </div>
      </div>
      <div className="content-panel__body p-3 p-md-4">
        <div className="row g-2 g-md-3">
        {TILES.map((tile) => (
          <div key={tile.id} className="col-12 col-sm-6 col-xl-4">
            <button
              type="button"
              className="tartibat-tile-btn w-100 rounded-3 px-3 py-3 text-center"
              onClick={() => setModal(tile.id)}
            >
              <span className={`tartibat-tile-btn__text tartibat-tile-btn__text--${lang}`} lang={lang}>
                {flText(FL[tile.k], lng)}
              </span>
            </button>
          </div>
        ))}
        </div>
      </div>

      {modal === 'examNames' && (
        <LocalizedListModal
          title={flText(FL.tartibatTileExamNames, lng)}
          field="examNames"
          items={merged.examNames}
          savePatch={savePatch}
          onClose={() => setModal(null)}
          lng={lng}
        />
      )}
      {modal === 'lessonNames' && (
        <LocalizedListModal
          title={flText(FL.tartibatTileLessonNames, lng)}
          field="lessonNames"
          items={merged.lessonNames}
          savePatch={savePatch}
          onClose={() => setModal(null)}
          lng={lng}
        />
      )}
      {modal === 'attendanceTimes' && (
        <StringListModal
          title={flText(FL.tartibatTileAttendanceTimes, lng)}
          field="attendanceTimes"
          items={merged.attendanceTimes}
          labelKey="tartibatPeriodName"
          savePatch={savePatch}
          onClose={() => setModal(null)}
          lng={lng}
        />
      )}
      {modal === 'withdrawal' && (
        <WithdrawalModal merged={merged} savePatch={savePatch} onClose={() => setModal(null)} lng={lng} />
      )}
    </div>
  )
}

function LocalizedListModal({ title, field, items, savePatch, onClose, lng }) {
  const [form, setForm] = useState(emptyLoc())
  const [editIdx, setEditIdx] = useState(null)

  function reset() {
    setForm(emptyLoc())
    setEditIdx(null)
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (!form.ur.trim() && !form.en.trim()) return
    const list = [...items]
    if (editIdx !== null) list[editIdx] = { ...form }
    else list.push({ ...form })
    await savePatch({ [field]: list })
    reset()
  }

  async function remove(i) {
    await savePatch({ [field]: items.filter((_, j) => j !== i) })
    if (editIdx === i) reset()
  }

  return (
    <AppModalShell title={title} onClose={onClose} size="lg">
      <form className="modal-app-form" onSubmit={onSubmit}>
        <div className="modal-app-body">
          <div className="mb-2" data-lang-field="ur">
            <BilingualLabel k="nameUrField" htmlFor={`lf-u-${field}`} data-lang-field="ur" />
            <AppInput
              id={`lf-u-${field}`}
              value={form.ur}
              onChange={(e) => setForm({ ...form, ur: e.target.value })}
              dir="rtl"
              data-lang-field="ur"
            />
          </div>
          <div className="mb-2" data-lang-field="en">
            <BilingualLabel k="nameEnField" htmlFor={`lf-e-${field}`} data-lang-field="en" />
            <AppInput
              id={`lf-e-${field}`}
              latin
              value={form.en}
              onChange={(e) => setForm({ ...form, en: e.target.value })}
              data-lang-field="en"
            />
          </div>
          <div className="pt-3 mt-3 border-top border-secondary-subtle">
            <p className="small text-muted mb-2 border-start border-3 border-primary ps-2">
              {flText(FL.tartibatExistingList, lng)}
            </p>
            <ul className="list-group list-group-flush small">
              {items.length === 0 ? (
                <li className="list-group-item text-muted py-3">—</li>
              ) : (
                items.map((row, i) => (
                  <li
                    key={`${field}-${i}`}
                    className="list-group-item d-flex flex-wrap justify-content-between align-items-center gap-2"
                  >
                    <span>{loc(row, lng)}</span>
                    <span className="data-table__actions">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => {
                          setEditIdx(i)
                          setForm({ ...(row || emptyLoc()) })
                        }}
                      >
                        {flText(FL.edit, lng)}
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => remove(i)}>
                        {flText(FL.delete, lng)}
                      </button>
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
        <div className="modal-app-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {flText(FL.cancel, lng)}
          </button>
          <button type="submit" className="btn btn-success">
            {flText(FL.save, lng)}
          </button>
        </div>
      </form>
    </AppModalShell>
  )
}

function StringListModal({ title, field, items, labelKey, savePatch, onClose, lng }) {
  const [val, setVal] = useState('')
  const [editIdx, setEditIdx] = useState(null)

  async function onSubmit(e) {
    e.preventDefault()
    const t = val.trim()
    if (!t) return
    const list = [...items]
    if (editIdx !== null) list[editIdx] = t
    else list.push(t)
    await savePatch({ [field]: list })
    setVal('')
    setEditIdx(null)
  }

  return (
    <AppModalShell title={title} onClose={onClose}>
      <form className="modal-app-form" onSubmit={onSubmit}>
        <div className="modal-app-body">
          <div className="mb-2">
            <BilingualLabel k={labelKey} htmlFor="str-list" />
            <AppInput
              id="str-list"
              value={val}
              onChange={(e) => setVal(e.target.value)}
            />
          </div>
          <div className="pt-3 mt-3 border-top border-secondary-subtle">
            <p className="small text-muted mb-2 border-start border-3 border-primary ps-2">
              {flText(FL.tartibatExistingList, lng)}
            </p>
            <ul className="list-group list-group-flush small">
              {items.length === 0 ? (
                <li className="list-group-item text-muted py-3">—</li>
              ) : (
                items.map((row, i) => (
                  <li
                    key={`${field}-${i}`}
                    className="list-group-item d-flex flex-wrap justify-content-between align-items-center gap-2"
                  >
                    <span className="table-num">{row}</span>
                    <span className="data-table__actions">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => {
                          setEditIdx(i)
                          setVal(row)
                        }}
                      >
                        {flText(FL.edit, lng)}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={async () => {
                          await savePatch({ [field]: items.filter((_, j) => j !== i) })
                          if (editIdx === i) {
                            setVal('')
                            setEditIdx(null)
                          }
                        }}
                      >
                        {flText(FL.delete, lng)}
                      </button>
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
        <div className="modal-app-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {flText(FL.cancel, lng)}
          </button>
          <button type="submit" className="btn btn-success">
            {flText(FL.save, lng)}
          </button>
        </div>
      </form>
    </AppModalShell>
  )
}

function WithdrawalModal({ merged, savePatch, onClose, lng }) {
  const [form, setForm] = useState({ name: emptyLoc(), marksYearComplete: false })
  const [editIdx, setEditIdx] = useState(null)
  const items = merged.withdrawalReasons

  async function onSubmit(e) {
    e.preventDefault()
    if (!form.name.ur.trim() && !form.name.en.trim()) return
    const list = [...items]
    const row = { name: { ...form.name }, marksYearComplete: form.marksYearComplete }
    if (editIdx !== null) list[editIdx] = row
    else list.push(row)
    await savePatch({ withdrawalReasons: list })
    setForm({ name: emptyLoc(), marksYearComplete: false })
    setEditIdx(null)
  }

  return (
    <AppModalShell title={flText(FL.tartibatTileWithdrawal, lng)} onClose={onClose} size="lg">
      <form className="modal-app-form" onSubmit={onSubmit}>
        <div className="modal-app-body">
          <div className="mb-2" data-lang-field="ur">
            <BilingualLabel k="nameUrField" htmlFor="wd-u" data-lang-field="ur" />
            <AppInput
              id="wd-u"
              value={form.name.ur}
              onChange={(e) => setForm({ ...form, name: { ...form.name, ur: e.target.value } })}
              dir="rtl"
              data-lang-field="ur"
            />
          </div>
          <div className="mb-2" data-lang-field="en">
            <BilingualLabel k="nameEnField" htmlFor="wd-e" data-lang-field="en" />
            <AppInput
              id="wd-e"
              latin
              value={form.name.en}
              onChange={(e) => setForm({ ...form, name: { ...form.name, en: e.target.value } })}
              data-lang-field="en"
            />
          </div>
          <AppCheckbox
            id="wd-chk"
            checked={form.marksYearComplete}
            onCheckedChange={(checked) => setForm({ ...form, marksYearComplete: checked })}
            label={flText(FL.withdrawalMarksYearComplete, lng)}
            size="sm"
          />
          <div className="pt-3 mt-3 border-top border-secondary-subtle">
            <p className="small text-muted mb-2 border-start border-3 border-primary ps-2">
              {flText(FL.tartibatExistingList, lng)}
            </p>
            <ul className="list-group list-group-flush small">
              {items.length === 0 ? (
                <li className="list-group-item text-muted py-3">—</li>
              ) : (
                items.map((row, i) => (
                  <li
                    key={`wd-${i}`}
                    className="list-group-item d-flex flex-wrap justify-content-between align-items-center gap-2"
                  >
                    <span>
                      {loc(row.name, lng)}
                      {row.marksYearComplete ? (
                        <span className="badge text-bg-secondary ms-1">✓</span>
                      ) : null}
                    </span>
                    <span className="data-table__actions">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => {
                          setEditIdx(i)
                          setForm({
                            name: { ...(row.name || emptyLoc()) },
                            marksYearComplete: !!row.marksYearComplete,
                          })
                        }}
                      >
                        {flText(FL.edit, lng)}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={async () => {
                          await savePatch({ withdrawalReasons: items.filter((_, j) => j !== i) })
                          if (editIdx === i) {
                            setForm({ name: emptyLoc(), marksYearComplete: false })
                            setEditIdx(null)
                          }
                        }}
                      >
                        {flText(FL.delete, lng)}
                      </button>
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
        <div className="modal-app-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {flText(FL.cancel, lng)}
          </button>
          <button type="submit" className="btn btn-success">
            {flText(FL.save, lng)}
          </button>
        </div>
      </form>
    </AppModalShell>
  )
}
