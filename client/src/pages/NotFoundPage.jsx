import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function NotFoundPage() {
  const { t, i18n } = useTranslation()
  const isUr = i18n.language === 'ur'

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center p-4" style={{ background: 'var(--ds-bg, #f7f6f3)' }}>
      <div className="content-panel p-4 text-center" style={{ maxWidth: 420 }}>
        <p className="text-muted mb-1" aria-hidden>
          404
        </p>
        <h1 className="h4 mb-2">
          {t('errors.notFoundTitle', { defaultValue: isUr ? 'صفحہ نہیں ملا' : 'Page not found' })}
        </h1>
        <p className="text-muted mb-3">
          {t('errors.notFoundBody', {
            defaultValue: isUr
              ? 'آپ جو پتہ کھول رہے ہیں وہ موجود نہیں۔'
              : 'The address you opened does not exist.',
          })}
        </p>
        <Link to="/" className="btn btn-success">
          {t('errors.notFoundAction', { defaultValue: isUr ? 'ڈیش بورڈ' : 'Back to dashboard' })}
        </Link>
      </div>
    </div>
  )
}
