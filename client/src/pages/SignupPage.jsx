import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { setCredentials } from '../features/auth/authSlice'
import { useRegisterMutation } from '../services/api'
import { AppInput, FormField } from '../components/ui'
import { useFormValidation, signupSchema } from '../shared/validation'

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

  const fieldIds = useMemo(
    () => ({
      'name.ur': 'signup-name-ur',
      email: 'signup-email',
      password: 'signup-pass',
      confirmPassword: 'signup-pass2',
    }),
    []
  )
  const {
    errors: fieldErrors,
    onBlurField,
    revalidateIfError,
    validateAll,
    focusInvalid,
    applyApiError,
  } = useFormValidation({
    schema: signupSchema,
    t,
    fieldIds,
    order: ['name.ur', 'email', 'password', 'confirmPassword'],
  })

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

  function currentValues(overrides = {}) {
    return { nameUr, nameEn, email, password, confirmPassword, ...overrides }
  }

  async function onSubmit(e) {
    e.preventDefault()
    const values = currentValues({ email: email.trim() })
    const nextErrors = validateAll(values)
    if (Object.keys(nextErrors).length) {
      focusInvalid(nextErrors)
      return
    }
    try {
      const data = await register({
        nameUr: nameUr.trim(),
        nameEn: nameEn.trim(),
        email: values.email,
        password,
      }).unwrap()
      dispatch(
        setCredentials({
          token: data.token || data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
          remember: true,
        })
      )
    } catch (err) {
      applyApiError(err)
    }
  }

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

          <form onSubmit={onSubmit} noValidate>
            <FormField
              k="nameUrField"
              htmlFor="signup-name-ur"
              langField="ur"
              className="mb-3"
              error={fieldErrors['name.ur']}
            >
              <AppInput
                id="signup-name-ur"
                className="rounded-3 border-secondary-subtle"
                value={nameUr}
                onChange={(e) => {
                  setNameUr(e.target.value)
                  revalidateIfError('name.ur', currentValues({ nameUr: e.target.value }))
                }}
                onBlur={() => onBlurField('name.ur', currentValues())}
                dir="rtl"
                data-lang-field="ur"
              />
            </FormField>
            <FormField k="nameEnField" htmlFor="signup-name-en" langField="en" className="mb-3">
              <AppInput
                id="signup-name-en"
                latin
                className="rounded-3 border-secondary-subtle"
                value={nameEn}
                onChange={(e) => {
                  setNameEn(e.target.value)
                  revalidateIfError('name.ur', currentValues({ nameEn: e.target.value }))
                }}
                onBlur={() => onBlurField('name.ur', currentValues())}
                data-lang-field="en"
              />
            </FormField>
            <FormField
              k="email"
              htmlFor="signup-email"
              required
              className="mb-3"
              hint={t('auth.adminEmailHint')}
              error={fieldErrors.email}
            >
              <AppInput
                id="signup-email"
                type="email"
                latin
                className="rounded-3 border-secondary-subtle"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  revalidateIfError('email', currentValues({ email: e.target.value }))
                }}
                onBlur={() => onBlurField('email', currentValues())}
                autoComplete="email"
              />
            </FormField>
            <FormField
              k="authPassword"
              htmlFor="signup-pass"
              required
              className="mb-3"
              error={fieldErrors.password}
            >
              <AppInput
                id="signup-pass"
                type="password"
                className="rounded-3 border-secondary-subtle"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  revalidateIfError('password', currentValues({ password: e.target.value }))
                  revalidateIfError('confirmPassword', currentValues({ password: e.target.value }))
                }}
                onBlur={() => onBlurField('password', currentValues())}
                autoComplete="new-password"
              />
            </FormField>
            <FormField
              k="authConfirmPassword"
              htmlFor="signup-pass2"
              required
              className="mb-3"
              error={fieldErrors.confirmPassword}
            >
              <AppInput
                id="signup-pass2"
                type="password"
                className="rounded-3 border-secondary-subtle"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  revalidateIfError('confirmPassword', currentValues({ confirmPassword: e.target.value }))
                }}
                onBlur={() => onBlurField('confirmPassword', currentValues())}
                autoComplete="new-password"
              />
            </FormField>
            {error && (
              <div className="alert alert-danger py-2 small rounded-3 mb-3" role="alert">
                {(error.data && error.data.message) || t('auth.signupFailed')}
              </div>
            )}
            <button type="submit" className="btn btn-success w-100" disabled={isLoading}>
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
