import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { loc } from '../../shared/localized'
import { AppInput } from '../ui'

export default function ExamRollAssignPanel({
  lng,
  snapshots,
  sectionFilter,
  onSaveRolls,
  onAutoAssign,
  saving,
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState({})
  const [autoStart, setAutoStart] = useState('1')
  const [autoPad, setAutoPad] = useState('0')

  const rows = useMemo(() => {
    let list = snapshots || []
    if (sectionFilter) {
      list = list.filter(
        (s) => String(s.sectionId?._id || s.sectionId || '') === String(sectionFilter)
      )
    }
    return [...list].sort((a, b) =>
      String(a.rollNumber || '').localeCompare(String(b.rollNumber || ''), undefined, { numeric: true })
    )
  }, [snapshots, sectionFilter])

  function getRoll(id, fallback) {
    if (draft[id] !== undefined) return draft[id]
    return fallback || ''
  }

  async function handleSave() {
    const entries = rows.map((r) => ({
      studentSnapshotId: r._id,
      rollNumber: getRoll(r._id, r.rollNumber),
    }))
    await onSaveRolls(entries)
    setDraft({})
  }

  async function handleAuto() {
    await onAutoAssign({
      startFrom: Number(autoStart) || 1,
      padWidth: Number(autoPad) || 0,
      groupBySection: true,
    })
    setDraft({})
  }

  if (!rows.length) {
    return (
      <div className="exam-panel exam-panel--empty">
        <p className="mb-0 text-secondary">{t('exam.rollNoSnapshotFirst')}</p>
      </div>
    )
  }

  return (
    <div className="exam-panel">
      <div className="exam-panel__head exam-panel__head--stack">
        <div>
          <h3 className="exam-panel__title">{t('exam.rollAssignTitle')}</h3>
          <p className="exam-panel__hint mb-0">{t('exam.rollAssignHint')}</p>
        </div>
      </div>

      <div className="exam-toolbar exam-toolbar--form exam-roll-toolbar">
        <div className="exam-toolbar__field exam-toolbar__field--narrow">
          <label className="exam-toolbar__label" htmlFor="exam-roll-start">
            {t('exam.rollStart')}
          </label>
          <AppInput
            id="exam-roll-start"
            type="number"
            min={1}
            value={autoStart}
            onChange={(e) => setAutoStart(e.target.value)}
          />
        </div>
        <div className="exam-toolbar__field exam-toolbar__field--narrow">
          <label className="exam-toolbar__label" htmlFor="exam-roll-pad">
            {t('exam.rollPad')}
          </label>
          <AppInput
            id="exam-roll-pad"
            type="number"
            min={0}
            max={4}
            value={autoPad}
            onChange={(e) => setAutoPad(e.target.value)}
          />
        </div>
        <div className="exam-toolbar__actions">
          <button type="button" className="btn btn-outline-secondary btn-sm" disabled={saving} onClick={handleAuto}>
            {t('exam.rollAutoAssign')}
          </button>
          <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={handleSave}>
            {t('exam.rollSave')}
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-sm table-bordered exam-roll-table mb-0">
          <thead>
            <tr>
              <th>{t('exam.col.roll')}</th>
              <th>{t('exam.col.admission')}</th>
              <th>{t('exam.col.student')}</th>
              <th>{t('exam.col.section')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id}>
                <td>
                  <AppInput
                    type="text"
                    className="exam-roll-input"
                    value={getRoll(r._id, r.rollNumber)}
                    onChange={(e) => setDraft((d) => ({ ...d, [r._id]: e.target.value }))}
                  />
                </td>
                <td>{r.admissionNumber || '—'}</td>
                <td>{loc(r.studentName, lng)}</td>
                <td>{loc(r.sectionName, lng) || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
