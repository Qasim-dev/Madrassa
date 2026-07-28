import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { setCredentials } from '../features/auth/authSlice'
import { useRegisterMutation } from '../services/api'
import BilingualLabel from '../components/BilingualLabel'
import { AppInput } from '../components/ui'

export default function SignupPage() {
  const { t, i18n } = useTranslation()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const token = useSelector((s) => s.auth.token)

  const from = location.state?.from?.pathname || '/'
  const [register, { isLoading, error }] = useRegisterMutation()

  const [nameUr, setNameUr] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (token) {
      navigate(from, { replace: true })
    }
  }, [token, from, navigate])

  function toggleLang() {
    const n = i18n.language === 'ur' ? 'en' : 'ur'
    i18n.changeLanguage(n)
    localStorage.setItem('locale', n)
  }

  async function onSubmit(e) {
    e.preventDefault()
    setFormError('')
    if (!nameUr.trim() && !nameEn.trim()) {
      setFormError(t('auth.orgNameRequired'))
      return
    }
    if (password !== confirmPassword) {
      return
    }
    if (String(password).length < 8) {
      setFormError(t('auth.passwordTooShort'))
      return
    }
    try {
      const data = await register({
        nameUr: nameUr.trim(),
        nameEn: nameEn.trim(),
        email: email.trim(),
        password,
      }).unwrap()
      dispatch(setCredentials({ token: data.token, user: data.user, remember: true }))
    } catch {
      /* handled */
    }
  }

  const mismatch = password && confirmPassword && password !== confirmPassword

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden p-4 page-gradient">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(circle at 20% 80%, rgba(13, 92, 77, 0.25), transparent 50%), radial-gradient(circle at 80% 20%, rgba(201, 162, 39, 0.2), transparent 45%)',
        }}
      />
      <div className="relative w-full max-w-md">
        <div className="mb-4 flex justify-center">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            style={{
              background: 'rgba(255,255,255,0.85)',
              border: '1px solid rgba(13, 92, 77, 0.2)',
              color: '#0d5c4d',
            }}
            onClick={toggleLang}
          >
            {i18n.language === 'ur' ? 'English' : 'اردو'}
          </button>
        </div>

        <div className="login-glass rounded-4 p-4 md:p-5">
          <div className="text-center mb-4">
            <h1 className="page-title h4 mb-1">{t('auth.signupTitle')}</h1>
            <p className="text-muted small mb-0">{t('auth.signupSubtitleEmail')}</p>
          </div>

          <form onSubmit={onSubmit}>
            <div className="mb-3" data-lang-field="ur">
              <BilingualLabel k="nameUrField" htmlFor="signup-name-ur" data-lang-field="ur" />
              <AppInput
                id="signup-name-ur"
                className="rounded-3 border-secondary-subtle"
                value={nameUr}
                onChange={(e) => setNameUr(e.target.value)}
                dir="rtl"
                data-lang-field="ur"
              />
            </div>
            <div className="mb-3" data-lang-field="en">
              <BilingualLabel k="nameEnField" htmlFor="signup-name-en" data-lang-field="en" />
              <AppInput
                id="signup-name-en"
                latin
                className="rounded-3 border-secondary-subtle"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                data-lang-field="en"
              />
            </div>
            <div className="mb-3">
              <BilingualLabel k="email" htmlFor="signup-email" required />
              <AppInput
                id="signup-email"
                type="email"
                latin
                className="rounded-3 border-secondary-subtle"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              <p className="form-text small text-muted mb-0 mt-1">{t('auth.adminEmailHint')}</p>
            </div>
            <div className="mb-3">
              <BilingualLabel k="authPassword" htmlFor="signup-pass" required />
              <AppInput
                id="signup-pass"
                type="password"
                className="rounded-3 border-secondary-subtle"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div className="mb-3">
              <BilingualLabel k="authConfirmPassword" htmlFor="signup-pass2" required />
              <AppInput
                id="signup-pass2"
                type="password"
                className="rounded-3 border-secondary-subtle"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            {mismatch && (
              <div className="alert alert-warning py-2 small rounded-3 mb-3" role="alert">
                {t('auth.passwordMismatch')}
              </div>
            )}
            {formError && (
              <div className="alert alert-warning py-2 small rounded-3 mb-3" role="alert">
                {formError}
              </div>
            )}
            {error && (
              <div className="alert alert-danger py-2 small rounded-3 mb-3" role="alert">
                {(error.data && error.data.message) || t('auth.signupFailed')}
              </div>
            )}
            <button
              type="submit"
              className="btn btn-success w-100"
              disabled={isLoading || mismatch}
            >
              {isLoading ? t('common.loading') : t('auth.signupSubmit')}
            </button>
          </form>

          <p className="text-center mt-4 mb-0 pt-2 border-top border-secondary-subtle">
            <Link to="/login" className="auth-form-switch-link">
              {t('auth.loginInstead')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
