import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForgotPasswordMutation } from '../services/api'
import { AppInput } from '../components/ui'

export default function ForgotPasswordPage() {
  const { t, i18n } = useTranslation()
  const isUr = i18n.language === 'ur'
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(null)
  const [forgot, { isLoading, error }] = useForgotPasswordMutation()

  async function onSubmit(e) {
    e.preventDefault()
    try {
      const data = await forgot({ email: email.trim() }).unwrap()
      setDone(data)
    } catch {
      /* shown via error */
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden p-4 page-gradient">
      <div className="relative w-full max-w-md login-glass rounded-4 p-4 md:p-5">
        <h1 className="h4 mb-2">
          {t('auth.forgotTitle', { defaultValue: isUr ? 'پاس ورڈ بحال کریں' : 'Reset password' })}
        </h1>
        <p className="text-muted small mb-3">
          {t('auth.forgotLead', {
            defaultValue: isUr
              ? 'اپنا ای میل درج کریں۔ اگر اکاؤنٹ موجود ہو تو ری سیٹ لنک جاری کیا جائے گا۔'
              : 'Enter your email. If an account exists, a reset token will be issued.',
          })}
        </p>
        {done ? (
          <div className="alert alert-success small" role="status">
            <p className="mb-1">{done.message || t('auth.forgotSent', { defaultValue: 'Request received.' })}</p>
            {done.resetToken ? (
              <p className="mb-0">
                <Link to={`/reset-password?token=${encodeURIComponent(done.resetToken)}`}>
                  {t('auth.forgotDevLink', { defaultValue: 'Continue with reset token (dev)' })}
                </Link>
              </p>
            ) : null}
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <label className="form-label" htmlFor="forgot-email">
              {t('auth.signin.email')}
            </label>
            <AppInput
              id="forgot-email"
              type="email"
              latin
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            {error ? (
              <div className="alert alert-danger py-2 small mt-2" role="alert">
                {error.data?.message || t('auth.forgotFailed', { defaultValue: 'Request failed' })}
              </div>
            ) : null}
            <button type="submit" className="btn btn-success w-100 mt-3" disabled={isLoading}>
              {isLoading ? t('common.loading') : t('auth.forgotSubmit', { defaultValue: isUr ? 'بھیجیں' : 'Send reset' })}
            </button>
          </form>
        )}
        <div className="mt-3">
          <Link to="/login">{t('auth.loginInstead', { defaultValue: isUr ? 'سائن ان' : 'Back to sign in' })}</Link>
        </div>
      </div>
    </div>
  )
}
