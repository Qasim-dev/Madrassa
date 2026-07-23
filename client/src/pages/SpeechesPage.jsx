import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import {
  useGetSpeechesQuery,
  useCreateSpeechMutation,
  useUpdateSpeechMutation,
  useDeleteSpeechMutation,
  useGetTeachersQuery,
} from '../services/api'
import { loc, uiLang } from '../shared/localized'
import { formatDisplayDate, toInputDate } from '../shared/formatDisplayDate'
import { useCalendarMode } from '../app/calendarMode'
import BilingualLabel from '../components/BilingualLabel'
import AppDateInput from '../components/AppDateInput'
import AppModalShell from '../components/AppModalShell'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import DataTable from '../components/DataTable'
import { AppInput, AppSelect, AppTextarea, AppFileInput } from '../components/ui'
import PageHeading from '../components/PageHeading'

const emptyLoc = () => ({ ur: '', en: '' })

function emptyForm() {
  return {
    title: emptyLoc(),
    speaker: emptyLoc(),
    summary: emptyLoc(),
    teacherId: '',
    speechDate: '',
    notes: '',
    isActive: true,
  }
}

function buildSpeechFormData(form, { pdfFile, audioFile, editing, removePdf, removeAudio } = {}) {
  const fd = new FormData()
  fd.append('titleUr', form.title.ur)
  fd.append('titleEn', form.title.en)
  fd.append('speakerUr', form.speaker.ur)
  fd.append('speakerEn', form.speaker.en)
  fd.append('summaryUr', form.summary.ur)
  fd.append('summaryEn', form.summary.en)
  if (form.speechDate) fd.append('speechDate', form.speechDate)
  if (form.teacherId) fd.append('teacherId', form.teacherId)
  fd.append('notes', form.notes || '')
  fd.append('isActive', form.isActive ? 'true' : 'false')
  if (pdfFile) fd.append('pdf', pdfFile)
  if (audioFile) fd.append('audio', audioFile)
  if (editing && removePdf) fd.append('removePdf', 'true')
  if (editing && removeAudio) fd.append('removeAudio', 'true')
  return fd
}

export default function SpeechesPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const activeSessionId = useSelector((s) => s.session.activeSessionId)
  const { mode } = useCalendarMode()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [pdfFile, setPdfFile] = useState(null)
  const [audioFile, setAudioFile] = useState(null)
  const [removePdf, setRemovePdf] = useState(false)
  const [removeAudio, setRemoveAudio] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const queryParams = {
    ...(activeSessionId ? { sessionId: activeSessionId } : {}),
    ...(search.trim() ? { q: search.trim() } : {}),
  }

  const { data: speeches = [], isLoading, refetch } = useGetSpeechesQuery(queryParams)
  const { data: teachers = [] } = useGetTeachersQuery()

  const [createSpeech] = useCreateSpeechMutation()
  const [updateSpeech] = useUpdateSpeechMutation()
  const [deleteSpeech] = useDeleteSpeechMutation()

  function openNew() {
    setEditing(null)
    setForm(emptyForm())
    setPdfFile(null)
    setAudioFile(null)
    setRemovePdf(false)
    setRemoveAudio(false)
    setModal(true)
  }

  function openEdit(row) {
    setEditing(row)
    setForm({
      title: row.title || emptyLoc(),
      speaker: row.speaker || emptyLoc(),
      summary: row.summary || emptyLoc(),
      teacherId: row.teacherId?._id || row.teacherId || '',
      speechDate: toInputDate(row.speechDate),
      notes: row.notes || '',
      isActive: row.isActive !== false,
    })
    setPdfFile(null)
    setAudioFile(null)
    setRemovePdf(false)
    setRemoveAudio(false)
    setModal(true)
  }

  async function save(e) {
    e.preventDefault()
    const fd = buildSpeechFormData(form, {
      pdfFile,
      audioFile,
      editing: !!editing,
      removePdf,
      removeAudio,
    })
    if (activeSessionId) fd.append('sessionId', activeSessionId)

    if (editing) await updateSpeech({ id: editing._id, body: fd }).unwrap()
    else await createSpeech(fd).unwrap()

    setModal(false)
    refetch()
  }

  const columns = useMemo(
    () => [
      { key: 'title', headerKey: 'speechTitle', cell: (r) => loc(r.title, lng) },
      {
        key: 'speaker',
        headerKey: 'speechSpeaker',
        cell: (r) => loc(r.speaker, lng) || loc(r.teacherId?.name, lng) || '—',
      },
      {
        key: 'date',
        headerKey: 'date',
        cell: (r) => formatDisplayDate(r.speechDate, lng, mode),
      },
      {
        key: 'summary',
        headerKey: 'speechSummary',
        cell: (r) => {
          const text = loc(r.summary, lng)
          if (!text) return '—'
          return text.length > 80 ? `${text.slice(0, 80)}…` : text
        },
      },
      {
        key: 'pdf',
        header: t('speech.pdf'),
        hidePrint: true,
        cell: (r) =>
          r.pdfUrl ? (
            <a href={r.pdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-secondary">
              {t('speech.viewPdf')}
            </a>
          ) : (
            '—'
          ),
      },
      {
        key: 'audio',
        header: t('speech.audio'),
        hidePrint: true,
        cell: (r) =>
          r.audioUrl ? (
            <audio controls preload="none" className="speech-audio-player" src={r.audioUrl}>
              <a href={r.audioUrl} target="_blank" rel="noopener noreferrer">{t('speech.playAudio')}</a>
            </audio>
          ) : (
            '—'
          ),
      },
      {
        key: 'actions',
        headerKey: 'actions',
        hidePrint: true,
        cell: (r) => (
          <div className="data-table__actions">
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openEdit(r)}>
              {t('common.edit')}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => setDeleteTarget({ id: r._id, name: loc(r.title, lng) })}
            >
              {t('common.delete')}
            </button>
          </div>
        ),
      },
    ],
    [lng, t, mode]
  )

  return (
    <div className="speeches-page">
      <PageHeading navKey="navSpeeches" subtitle={t('speech.pageLead')}>
        <button type="button" className="btn btn-sm btn-success no-print" onClick={openNew}>
          {t('common.add')}
        </button>
      </PageHeading>

      <div className="content-panel p-3 mb-3">
        <BilingualLabel k="search" htmlFor="sp-q" />
        <AppInput
          id="sp-q"
         
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={lng === 'ur' ? 'عنوان، مقرر، خلاصہ…' : 'Title, speaker, summary…'}
        />
      </div>

      <DataTable
        columns={columns}
        rows={speeches}
        getRowKey={(r) => r._id}
        isLoading={isLoading}
        loadingText={t('common.loading')}
        emptyText={t('common.noRecords')}
      />

      {modal && (
        <AppModalShell
          title={editing ? t('common.edit') : t('common.add')}
          onClose={() => setModal(false)}
          size="lg"
          dir={uiLang(lng) === 'ur' ? 'rtl' : 'ltr'}
        >
          <form className="modal-app-form" onSubmit={save}>
            <div className="modal-app-body">
              <div className="row g-3">
                <div className="col-12 col-md-4" data-lang-field="ur">
                  <BilingualLabel k="speechTitleUr" htmlFor="sp-title-ur" required />
                  <AppInput
                    id="sp-title-ur"
                   
                    dir="rtl"
                    value={form.title.ur}
                    onChange={(e) => setForm({ ...form, title: { ...form.title, ur: e.target.value } })}
                    required
                  />
                </div>
                <div className="col-12 col-md-4" data-lang-field="en">
                  <BilingualLabel k="speechTitleEn" htmlFor="sp-title-en" />
                  <AppInput
                    id="sp-title-en"
                   
                    value={form.title.en}
                    latin
                    onChange={(e) => setForm({ ...form, title: { ...form.title, en: e.target.value } })}
                  />
                </div>
                <div className="col-12 col-md-4" data-lang-field="ur">
                  <BilingualLabel k="speechSpeakerUr" htmlFor="sp-sp-ur" />
                  <AppInput
                    id="sp-sp-ur"
                   
                    dir="rtl"
                    value={form.speaker.ur}
                    onChange={(e) => setForm({ ...form, speaker: { ...form.speaker, ur: e.target.value } })}
                  />
                </div>
                <div className="col-12 col-md-4" data-lang-field="en">
                  <BilingualLabel k="speechSpeakerEn" htmlFor="sp-sp-en" />
                  <AppInput
                    id="sp-sp-en"
                   
                    value={form.speaker.en}
                    latin
                    onChange={(e) => setForm({ ...form, speaker: { ...form.speaker, en: e.target.value } })}
                  />
                </div>
                <div className="col-md-4">
                  <BilingualLabel k="teacher" htmlFor="sp-teacher" />
                  <AppSelect
                    id="sp-teacher"
                   
                    value={form.teacherId}
                    onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
                  >
                    <option value="">—</option>
                    {teachers.map((te) => (
                      <option key={te._id} value={te._id}>
                        {loc(te.name, lng)}
                      </option>
                    ))}
                  </AppSelect>
                </div>
                <div className="col-md-4">
                  <BilingualLabel k="date" htmlFor="sp-date" />
                  <AppDateInput
                    id="sp-date"
                    lng={lng}
                    value={form.speechDate}
                    onChange={(v) => setForm({ ...form, speechDate: v })}
                  />
                </div>
                <div className="col-12 col-md-4" data-lang-field="ur">
                  <BilingualLabel k="speechSummaryUr" htmlFor="sp-sum-ur" />
                  <AppTextarea
                    id="sp-sum-ur"
                   
                    dir="rtl"
                    rows={4}
                    value={form.summary.ur}
                    onChange={(e) => setForm({ ...form, summary: { ...form.summary, ur: e.target.value } })}
                  />
                </div>
                <div className="col-12 col-md-4" data-lang-field="en">
                  <BilingualLabel k="speechSummaryEn" htmlFor="sp-sum-en" />
                  <AppTextarea
                    id="sp-sum-en"
                   
                    rows={4}
                    value={form.summary.en}
                    latin
                    onChange={(e) => setForm({ ...form, summary: { ...form.summary, en: e.target.value } })}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label small mb-1" htmlFor="sp-pdf" lang={uiLang(lng)}>
                    {t('speech.pdfFile')}
                  </label>
                  <AppFileInput
                    id="sp-pdf"
                    accept="application/pdf"
                    valueName={pdfFile?.name}
                    onChange={(e) => {
                      setPdfFile(e.target.files?.[0] || null)
                      setRemovePdf(false)
                    }}
                  />
                  {editing?.pdfUrl && !pdfFile && !removePdf && (
                    <div className="small mt-1">
                      <a href={editing.pdfUrl} target="_blank" rel="noopener noreferrer">{t('speech.currentPdf')}</a>
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0 ms-2"
                        onClick={() => setRemovePdf(true)}
                      >
                        {t('speech.removeFile')}
                      </button>
                    </div>
                  )}
                </div>
                <div className="col-md-4">
                  <label className="form-label small mb-1" htmlFor="sp-audio" lang={uiLang(lng)}>
                    {t('speech.audioFile')}
                  </label>
                  <AppFileInput
                    id="sp-audio"
                    accept="audio/*"
                    valueName={audioFile?.name}
                    onChange={(e) => {
                      setAudioFile(e.target.files?.[0] || null)
                      setRemoveAudio(false)
                    }}
                  />
                  {editing?.audioUrl && !audioFile && !removeAudio && (
                    <div className="small mt-1">
                      <audio controls preload="none" className="speech-audio-player mt-1" src={editing.audioUrl} />
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0"
                        onClick={() => setRemoveAudio(true)}
                      >
                        {t('speech.removeFile')}
                      </button>
                    </div>
                  )}
                </div>
                <div className="col-12">
                  <BilingualLabel k="notes" htmlFor="sp-notes" />
                  <AppTextarea
                    id="sp-notes"
                   
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="modal-app-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn btn-success">
                {t('common.save')}
              </button>
            </div>
          </form>
        </AppModalShell>
      )}

      <ConfirmDeleteModal
        open={!!deleteTarget}
        title={t('common.confirmDeleteTitle')}
        message={deleteTarget ? t('common.confirmDeleteBody', { name: deleteTarget.name }) : ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          await deleteSpeech(deleteTarget.id).unwrap()
          refetch()
        }}
      />
    </div>
  )
}
