import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { setCredentials } from '../features/auth/authSlice'
import { useLoginMutation } from '../services/api'
import { formatDisplayDate } from '../shared/formatDisplayDate'
import './authSignIn.css'

/** Islamabad coordinates for prayer times. */
const ISLAMABAD = { lat: 33.6844, lng: 73.0479 }

/** Fallback prayer times (approx. Islamabad) when API is unavailable — HH:mm 24h. */
const FALLBACK_TIMES = {
  Fajr: '04:20',
  Dhuhr: '12:15',
  Asr: '15:45',
  Maghrib: '19:10',
  Isha: '20:35',
}

const PRAYER_META = [
  { id: 'Fajr', ar: 'الفجر', icon: 'moon' },
  { id: 'Dhuhr', ar: 'الظهر', icon: 'sun' },
  { id: 'Asr', ar: 'العصر', icon: 'sun' },
  { id: 'Maghrib', ar: 'المغرب', icon: 'dusk' },
  { id: 'Isha', ar: 'العشاء', icon: 'moon' },
]

function parseHm(hm) {
  const [h, m] = String(hm).split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function formatHm12(hm, locale) {
  const [h, m] = String(hm).split(':').map(Number)
  const d = new Date()
  d.setHours(h || 0, m || 0, 0, 0)
  return d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
}

function minutesUntil(hm) {
  const now = new Date()
  const nowM = now.getHours() * 60 + now.getMinutes()
  let target = parseHm(hm)
  let diff = target - nowM
  if (diff < 0) diff += 24 * 60
  return diff
}

function formatCountdown(mins, t) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h <= 0) return t('auth.signin.inMinutes', { m })
  return t('auth.signin.inHoursMinutes', { h, m })
}

function PrayerIcon({ type }) {
  if (type === 'sun') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    )
  }
  if (type === 'dusk') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M4 18h16M6 14a6 6 0 0112 0" />
        <path d="M12 4v2M8 7l1 1M16 7l-1 1" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M21 14.5A8.5 8.5 0 1110.5 4 7 7 0 0021 14.5z" />
    </svg>
  )
}

export default function LoginPage() {
  const { t, i18n } = useTranslation()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const token = useSelector((s) => s.auth.token)

  const from = location.state?.from?.pathname || '/'
  const [login, { isLoading, error }] = useLoginMutation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [now, setNow] = useState(() => new Date())
  const [prayerTimes, setPrayerTimes] = useState(FALLBACK_TIMES)

  const isUr = i18n.language === 'ur'
  const locale = isUr ? 'ur-PK' : 'en-PK'

  useEffect(() => {
    if (token) navigate(from, { replace: true })
  }, [token, from, navigate])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const ctrl = new AbortController()
    const y = now.getFullYear()
    const m = now.getMonth() + 1
    const d = now.getDate()
    const url = `https://api.aladhan.com/v1/timings/${d}-${m}-${y}?latitude=${ISLAMABAD.lat}&longitude=${ISLAMABAD.lng}&method=1`
    fetch(url, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((json) => {
        const tms = json?.data?.timings
        if (!tms) return
        setPrayerTimes({
          Fajr: String(tms.Fajr).slice(0, 5),
          Dhuhr: String(tms.Dhuhr).slice(0, 5),
          Asr: String(tms.Asr).slice(0, 5),
          Maghrib: String(tms.Maghrib).slice(0, 5),
          Isha: String(tms.Isha).slice(0, 5),
        })
      })
      .catch(() => {
        /* keep fallback */
      })
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now.getFullYear(), now.getMonth(), now.getDate()])

  const clockStr = now.toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })

  const gregorianStr = now.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const hijriStr = useMemo(() => {
    const formatted = formatDisplayDate(now, isUr ? 'ur' : 'en', 'hijri')
    if (!formatted || formatted === '—') return ''
    return isUr ? `${formatted} ھ` : `${formatted} AH`
  }, [now, isUr])

  const prayers = useMemo(
    () =>
      PRAYER_META.map((p) => ({
        ...p,
        time: prayerTimes[p.id] || FALLBACK_TIMES[p.id],
        label: t(`auth.signin.prayer.${p.id}`),
      })),
    [prayerTimes, t]
  )

  const nextPrayer = useMemo(() => {
    let best = prayers[0]
    let bestDiff = minutesUntil(best.time)
    for (const p of prayers) {
      const diff = minutesUntil(p.time)
      if (diff < bestDiff) {
        best = p
        bestDiff = diff
      }
    }
    const idx = prayers.findIndex((p) => p.id === best.id)
    const prev = prayers[(idx - 1 + prayers.length) % prayers.length]
    const interval = (() => {
      const a = parseHm(prev.time)
      const b = parseHm(best.time)
      return b > a ? b - a : b + 24 * 60 - a
    })()
    const elapsed = Math.max(0, interval - bestDiff)
    const pct = interval ? Math.max(4, Math.min(100, (elapsed / interval) * 100)) : 10
    return { ...best, minsLeft: bestDiff, progressPct: pct }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prayers, now.getHours(), now.getMinutes()])

  function toggleLang() {
    const n = i18n.language === 'ur' ? 'en' : 'ur'
    i18n.changeLanguage(n)
    localStorage.setItem('locale', n)
  }

  async function onSubmit(e) {
    e.preventDefault()
    try {
      const data = await login({ email: email.trim(), password }).unwrap()
      dispatch(setCredentials({ token: data.token, user: data.user }))
    } catch {
      /* handled */
    }
  }

  const errMsg = (error?.data && error.data.message) || (error ? t('auth.signin.invalidCredentials') : '')

  return (
    <div className="auth-signin" dir={isUr ? 'rtl' : 'ltr'}>
      <div className="auth-signin__stars" aria-hidden />

      <div className="auth-signin__shell">
        <aside className="auth-signin__aside" aria-label={t('auth.signin.prayerTimes')}>
          <div className="auth-signin__place">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 21s7-5.2 7-11a7 7 0 10-14 0c0 5.8 7 11 7 11z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            {t('auth.signin.place')}
          </div>

          <div>
            <div className="auth-signin__clock table-num" aria-live="polite">
              {clockStr}
            </div>
            {hijriStr ? <div className="auth-signin__hijri">{hijriStr}</div> : null}
            <div className="auth-signin__gregorian">{gregorianStr}</div>
          </div>

          <div className="auth-signin__next">
            <div className="auth-signin__next-label">{t('auth.signin.nextPrayer')}</div>
            <div className="auth-signin__next-row">
              <span className="auth-signin__next-name">
                {nextPrayer.label}
                <span className="auth-signin__prayer-ar" style={{ marginInlineStart: '0.45rem', fontWeight: 500 }}>
                  {nextPrayer.ar}
                </span>
              </span>
              <span className="auth-signin__next-time table-num">{formatHm12(nextPrayer.time, locale)}</span>
            </div>
            <div className="auth-signin__next-countdown">
              {formatCountdown(nextPrayer.minsLeft, t)}
            </div>
            <div className="auth-signin__progress" aria-hidden>
              <div className="auth-signin__progress-bar" style={{ width: `${nextPrayer.progressPct}%` }} />
            </div>
          </div>

          <div className="auth-signin__prayers">
            {prayers.map((p) => (
              <div
                key={p.id}
                className={`auth-signin__prayer${p.id === nextPrayer.id ? ' auth-signin__prayer--next' : ''}`}
              >
                <div className="auth-signin__prayer-icon">
                  <PrayerIcon type={p.icon} />
                </div>
                <div className="auth-signin__prayer-names">
                  <div className="auth-signin__prayer-en">{p.label}</div>
                  <div className="auth-signin__prayer-ar">{p.ar}</div>
                </div>
                <div className="auth-signin__prayer-time table-num">{formatHm12(p.time, locale)}</div>
              </div>
            ))}
          </div>
        </aside>

        <section className="auth-signin__panel">
          <div className="auth-signin__lang">
            <button type="button" className="auth-signin__lang-btn" onClick={toggleLang}>
              {i18n.language === 'ur' ? 'English' : 'اردو'}
            </button>
          </div>

          <div className="auth-signin__brand">
            <div className="auth-signin__logo">
              <div className="auth-signin__logo-mark">
                <div className="auth-signin__logo-badge" aria-hidden>
                  ع
                </div>
                <div className="auth-signin__logo-text">
                  <div className="auth-signin__logo-title">{t('app.title')}</div>
                  <div className="auth-signin__logo-sub">{t('app.subtitle')}</div>
                </div>
              </div>
            </div>
            <h1 className="auth-signin__welcome">{t('auth.signin.welcome')}</h1>
            <p className="auth-signin__lead">{t('auth.signin.lead')}</p>
          </div>

          <form className="auth-signin__form" onSubmit={onSubmit}>
            <div className="auth-signin__field">
              <label htmlFor="login-email">{t('auth.signin.email')}</label>
              <div className="auth-signin__input-wrap">
                <svg className="auth-signin__input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M4 6h16v12H4z" />
                  <path d="M4 7l8 6 8-6" />
                </svg>
                <input
                  id="login-email"
                  type="email"
                  className="auth-signin__input latin-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder={t('auth.signin.emailPlaceholder')}
                  required
                />
              </div>
            </div>

            <div className="auth-signin__field">
              <label htmlFor="login-pass">{t('auth.password')}</label>
              <div className="auth-signin__input-wrap">
                <svg className="auth-signin__input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V8a4 4 0 118 0v3" />
                </svg>
                <input
                  id="login-pass"
                  type={showPassword ? 'text' : 'password'}
                  className="auth-signin__input auth-signin__input--password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="auth-signin__eye"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t('auth.signin.hidePassword') : t('auth.signin.showPassword')}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                      <path d="M3 3l18 18M10.6 10.6A2 2 0 0012 14a2 2 0 001.4-.6M9.9 5.1A9.8 9.8 0 0112 5c5 0 9.3 3.1 11 7.5a11.4 11.4 0 01-3.2 4.4M6.1 6.1A11.4 11.4 0 001 12.5C2.7 16.9 7 20 12 20c1.5 0 2.9-.3 4.2-.8" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                      <path d="M1 12.5C2.7 8.1 7 5 12 5s9.3 3.1 11 7.5c-1.7 4.4-6 7.5-11 7.5S2.7 16.9 1 12.5z" />
                      <circle cx="12" cy="12.5" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="auth-signin__row">
              <label className="auth-signin__remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                {t('auth.signin.remember')}
              </label>
            </div>

            {errMsg ? (
              <div className="auth-signin__error" role="alert">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5M12 16h.01" />
                </svg>
                {errMsg}
              </div>
            ) : null}

            <button type="submit" className="auth-signin__submit" disabled={isLoading}>
              {isLoading ? t('common.loading') : t('auth.login')}
            </button>

            <div className="auth-signin__secure">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 3l7 3v5c0 4.5-3 8.2-7 9.5C8 19.2 5 15.5 5 11V6l7-3z" />
              </svg>
              {t('auth.signin.secured')}
            </div>
          </form>

          <div className="auth-signin__footer">
            <Link to="/signup">{t('auth.createAccountLink')}</Link>
            <p className="auth-signin__footer-note">E-Jamia Pro · Darul Uloom Arabia</p>
          </div>
        </section>
      </div>
    </div>
  )
}
