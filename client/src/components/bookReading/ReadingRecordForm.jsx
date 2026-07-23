import { useTranslation } from 'react-i18next'
import AppDateInput from '../AppDateInput'
import { AppInput, AppTextarea } from '../ui'

export default function ReadingRecordForm({ form, setForm, totalPages }) {
  const { t } = useTranslation()

  const start = form.startPage !== '' ? Number(form.startPage) : null
  const end = form.endPage !== '' ? Number(form.endPage) : start
  const pagesPreview =
    start != null && Number.isFinite(start)
      ? Math.max(0, (Number.isFinite(end) ? end : start) - start + 1)
      : null

  return (
    <div className="reading-record-form">
      <div className="reading-record-form__grid reading-record-form__grid--pages">
        <div className="reading-record-form__field reading-record-form__field--date">
          <label className="reading-record-form__label">{t('bookReading.col.date')}</label>
          <AppDateInput value={form.readingDate} onChange={(v) => setForm((f) => ({ ...f, readingDate: v }))} />
        </div>
        <div className="reading-record-form__field">
          <label className="reading-record-form__label">{t('bookReading.startPage')}</label>
          <AppInput
            type="number"
            min={1}
            max={totalPages || undefined}
            latin
            value={form.startPage}
            onChange={(e) => setForm((f) => ({ ...f, startPage: e.target.value }))}
          />
        </div>
        <div className="reading-record-form__field">
          <label className="reading-record-form__label">{t('bookReading.endPage')}</label>
          <AppInput
            type="number"
            min={1}
            max={totalPages || undefined}
            latin
            placeholder={t('bookReading.endPageHint')}
            value={form.endPage}
            onChange={(e) => setForm((f) => ({ ...f, endPage: e.target.value }))}
          />
        </div>
      </div>

      {pagesPreview != null && pagesPreview > 0 && (
        <div className="reading-record-form__summary" dir="ltr">
          <span className="reading-record-form__summary-value">{pagesPreview}</span>
          <span className="reading-record-form__summary-label">{t('bookReading.pagesRead')}</span>
          {totalPages ? (
            <span className="reading-record-form__summary-total">
              {t('bookReading.ofTotal', { total: totalPages })}
            </span>
          ) : null}
        </div>
      )}

      <div className="reading-record-form__grid reading-record-form__grid--secondary">
        <div className="reading-record-form__field">
          <label className="reading-record-form__label">
            {t('bookReading.duration')}
            <span className="reading-record-form__optional">({t('bookReading.optional')})</span>
          </label>
          <div className="reading-record-form__input-group">
            <AppInput
              type="number"
              min={0}
              latin
              placeholder="0"
              value={form.durationMinutes}
              onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
            />
            <span className="reading-record-form__suffix">{t('bookReading.minutes')}</span>
          </div>
        </div>
      </div>

      <div className="reading-record-form__field">
        <label className="reading-record-form__label">
          {t('bookReading.col.notes')}
          <span className="reading-record-form__optional">({t('bookReading.optional')})</span>
        </label>
        <AppTextarea
          className="reading-record-form__notes"
          rows={3}
          placeholder={t('bookReading.notesPlaceholder')}
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
      </div>
    </div>
  )
}
