import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useResetPasswordMutation } from '../services/api'
import { AppInput } from '../components/ui'

export default function ResetPasswordPage() {
  const { t, i18n } = useTranslation()
  const isUr = i18n.language === 'ur'
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [token, setToken] = useState(params.get('token') || '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [formError, setFormError] = useState('')
  const [reset, { isLoading, error }] = useResetPasswordMutation()

  async function onSubmit(e) {
    e.preventDefault()
    setFormError('')
    if (password !== confirm) {
      setFormError(t('auth.passwordMismatch'))
      return
    }
    if (password.length < 8) {
      setFormError(t('auth.passwordTooShort'))
      return
    }
    try {
      await reset({ token: token.trim(), newPassword: password }).unwrap()
      navigate('/login', { replace: true })
    } catch {
      /* error banner */
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden p-4 page-gradient">
      <div className="relative w-full max-w-md login-glass rounded-4 p-4 md:p-5">
        <h1 className="h4 mb-2">
          {t('auth.resetTitle', { defaultValue: isUr ? 'نیا پاس ورڈ' : 'Set new password' })}
        </h1>
        <form onSubmit={onSubmit}>
          <label className="form-label" htmlFor="reset-token">
            {t('auth.resetToken', { defaultValue: isUr ? 'ری سیٹ ٹوکن' : 'Reset token' })}
          </label>
          <AppInput
            id="reset-token"
            latin
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
            className="mb-3"
          />
          <label className="form-label" htmlFor="reset-pass">
            {t('auth.password')}
          </label>
          <AppInput
            id="reset-pass"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            className="mb-3"
          />
          <label className="form-label" htmlFor="reset-pass2">
            {t('auth.confirmPassword', { defaultValue: isUr ? 'پاس ورڈ دوبارہ' : 'Confirm password' })}
          </label>
          <AppInput
            id="reset-pass2"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            required
          />
          {formError ? (
            <div className="alert alert-warning py-2 small mt-2" role="alert">
              {formError}
            </div>
          ) : null}
          {error ? (
            <div className="alert alert-danger py-2 small mt-2" role="alert">
              {error.data?.message || t('auth.resetFailed', { defaultValue: 'Reset failed' })}
            </div>
          ) : null}
          <button type="submit" className="btn btn-success w-100 mt-3" disabled={isLoading}>
            {isLoading ? t('common.loading') : t('auth.resetSubmit', { defaultValue: isUr ? 'محفوظ کریں' : 'Save password' })}
          </button>
        </form>
        <div className="mt-3">
          <Link to="/login">{t('auth.login')}</Link>
        </div>
      </div>
    </div>
  )
}
