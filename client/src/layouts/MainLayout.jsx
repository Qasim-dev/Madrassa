import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { logout, setUser } from '../features/auth/authSlice'
import { setActiveSessionId } from '../features/session/sessionSlice'
import { api, useGetMeQuery, useGetSessionsQuery, useGetSettingsQuery, useLogoutSessionMutation } from '../services/api'
import { useEffect, useState, useMemo } from 'react'
import { SidebarMenu } from '../components/SidebarMenu'
import AppHeaderSearch from '../components/AppHeaderSearch'
import { AppSelect } from '../components/ui'
import { loc, uiLang } from '../shared/localized'
import { absoluteAssetUrl } from '../shared/assetUrl'
import { getInstitutionName, getInstitutionInitial } from '../shared/institutionBrand'
import { CalendarModeProvider, useCalendarMode } from '../app/calendarMode.jsx'
import { can } from '../shared/permissions'

/** Sidebar sections: each group is an expandable header (labelKey) with nested links. */
const menuGroups = [
  {
    labelKey: 'groupOverview',
    icon: 'dashboard',
    items: [{ to: '/', navKey: 'navDashboard', icon: 'dashboard', end: true }],
  },
  {
    labelKey: 'navTartibat',
    icon: 'tartibat',
    items: [
      { to: '/tartibat/sessions', navKey: 'navTartibatSessions', icon: 'tartibat', permission: 'tartibat:write' },
      { to: '/tartibat/subjects', navKey: 'navTartibatSubjects', icon: 'tartibat', permission: 'tartibat:write' },
      { to: '/tartibat/darajat', navKey: 'navTartibatDarajat', icon: 'tartibat', permission: 'tartibat:write' },
      { to: '/grades', navKey: 'navGrades', icon: 'grades', permission: 'grades:write' },
      { to: '/tartibat/books', navKey: 'navTartibatBooks', icon: 'tartibat', permission: 'tartibat:write' },
      { to: '/book-reading', navKey: 'navBookReading', icon: 'tartibat', permission: 'bookreading:write' },
      { to: '/speeches', navKey: 'navSpeeches', icon: 'speeches', permission: 'speeches:write' },
      { to: '/tartibat/timetable', navKey: 'navTartibatTimetable', icon: 'tartibat', permission: 'tartibat:write' },
    ],
  },
  {
    labelKey: 'groupPeople',
    icon: 'students',
    items: [
      { to: '/students', navKey: 'navStudents', icon: 'students', permission: 'students:read' },
      { to: '/teachers', navKey: 'navTeachers', icon: 'teachers', permission: 'teachers:read' },
    ],
  },
  {
    labelKey: 'navIdCards',
    icon: 'idcard',
    permission: 'idcards:write',
    items: [
      { to: '/id-cards', navKey: 'navIdCardsHub', icon: 'idcard', end: true },
      { to: '/id-cards/print', navKey: 'navIdCardsPrint', icon: 'idcard' },
      { to: '/id-cards/templates', navKey: 'navIdCardsTemplates', icon: 'idcard' },
      { to: '/id-cards/history', navKey: 'navIdCardsHistory', icon: 'idcard' },
    ],
  },
  {
    labelKey: 'groupOperations',
    icon: 'attendance',
    items: [
      { to: '/attendance', navKey: 'navAttendance', icon: 'attendance', permission: 'attendance:write' },
      { to: '/student-character', navKey: 'navStudentCharacter', icon: 'character', permission: 'character:write' },
    ],
  },
  {
    labelKey: 'groupFinance',
    icon: 'finance',
    items: [
      { to: '/finance', navKey: 'navFinance', icon: 'finance', permission: 'finance:read' },
      { to: '/fees', navKey: 'navFees', icon: 'fees', permission: 'fees:read' },
      { to: '/inventory', navKey: 'navInventory', icon: 'inventory', permission: 'inventory:read' },
    ],
  },
  {
    labelKey: 'navExams',
    icon: 'exams',
    permission: 'exams:read',
    items: [{ to: '/exams', navKey: 'navExams', icon: 'exams' }],
  },
  {
    labelKey: 'navLibrary',
    icon: 'library',
    permission: 'library:write',
    items: [{ to: '/library', navKey: 'navLibrary', icon: 'library' }],
  },
  {
    labelKey: 'groupSystem',
    icon: 'settings',
    items: [
      { to: '/users', navKey: 'navUsers', icon: 'profile', permission: 'users:manage' },
      { to: '/recycle-bin', navKey: 'navRecycleBin', icon: 'recycle', permission: 'recycle:read' },
      { to: '/settings', navKey: 'navSettings', icon: 'settings', permission: 'settings:write' },
      { to: '/profile', navKey: 'navProfile', icon: 'profile' },
    ],
  },
]

export default function MainLayout() {
  return (
    <CalendarModeProvider>
      <MainLayoutInner />
    </CalendarModeProvider>
  )
}

function MainLayoutInner() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const brandLang = uiLang(lng)
  const { mode, toggle } = useCalendarMode()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const token = useSelector((s) => s.auth.token)
  const user = useSelector((s) => s.auth.user)
  const activeSessionId = useSelector((s) => s.session.activeSessionId)
  const { data: me } = useGetMeQuery(undefined, { skip: !token })
  const { data: settings } = useGetSettingsQuery(undefined, { skip: !token })
  const { data: sessionsForHeader = [] } = useGetSessionsQuery(undefined, { skip: !token })
  const [logoutSession] = useLogoutSessionMutation()
  const logoAbs = absoluteAssetUrl(settings?.logoUrl)
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!navOpen) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [navOpen])

  useEffect(() => {
    if (!navOpen) return undefined
    function onKey(e) {
      if (e.key === 'Escape') setNavOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navOpen])

  const visibleMenuGroups = useMemo(() => {
    const actor = user || me
    return menuGroups
      .map((group) => {
        if (group.permission && !can(actor, group.permission)) return null
        const items = (group.items || []).filter(
          (item) => !item.permission || can(actor, item.permission)
        )
        if (!items.length && group.items?.length) return null
        return { ...group, items: items.length ? items : group.items }
      })
      .filter(Boolean)
  }, [user, me])

  const OTHER_LANG_KEY = 'madrassaShowOtherLangFields'
  const UR_FIELD_PREF_KEY = 'madrassaUrFieldPref'
  const EN_FIELD_PREF_KEY = 'madrassaEnFieldPref'
  const [showOtherLangFields, setShowOtherLangFields] = useState(() => {
    try {
      return localStorage.getItem(OTHER_LANG_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    const ui = i18n.language === 'ur' ? 'ur' : 'en'
    document.body.dataset.uiLang = ui
    document.body.dataset.showOtherLang = showOtherLangFields ? '1' : '0'
  }, [i18n.language, showOtherLangFields])
  useEffect(() => {
    if (me) dispatch(setUser(me))
  }, [me, dispatch])

  /** On load, default header to the DB-active session when nothing valid is stored. */
  useEffect(() => {
    if (!sessionsForHeader.length) return
    const storedValid =
      activeSessionId && sessionsForHeader.some((s) => String(s._id) === String(activeSessionId))
    if (storedValid) return
    const dbActive = sessionsForHeader.find((s) => s.isActive)
    const fallback = dbActive || sessionsForHeader[0]
    if (fallback?._id) dispatch(setActiveSessionId(String(fallback._id)))
  }, [sessionsForHeader, activeSessionId, dispatch])

  function persistLocale(lang) {
    i18n.changeLanguage(lang)
    try {
      localStorage.setItem('locale', lang)
    } catch {
      /* ignore */
    }
  }

  function persistOtherLangFields(value) {
    setShowOtherLangFields(value)
    try {
      localStorage.setItem(OTHER_LANG_KEY, value ? '1' : '0')
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event('madrassa:langFieldsPref'))
    try {
      if (i18n.language === 'ur') {
        localStorage.setItem(UR_FIELD_PREF_KEY, value ? '1' : '0')
      } else {
        localStorage.setItem(EN_FIELD_PREF_KEY, value ? '1' : '0')
      }
    } catch {
      /* ignore */
    }
  }

  function handleSelectEn() {
    try {
      if (i18n.language === 'ur') {
        localStorage.setItem(UR_FIELD_PREF_KEY, showOtherLangFields ? '1' : '0')
      }
    } catch {
      /* ignore */
    }
    persistLocale('en')
    let fields = showOtherLangFields
    try {
      const b = localStorage.getItem(EN_FIELD_PREF_KEY)
      if (b === '0' || b === '1') fields = b === '1'
    } catch {
      /* keep fields */
    }
    setShowOtherLangFields(fields)
    try {
      localStorage.setItem(OTHER_LANG_KEY, fields ? '1' : '0')
    } catch {
      /* ignore */
    }
  }

  function handleSelectUr() {
    try {
      if (i18n.language === 'en') {
        localStorage.setItem(EN_FIELD_PREF_KEY, showOtherLangFields ? '1' : '0')
      }
    } catch {
      /* ignore */
    }
    persistLocale('ur')
    let fields = showOtherLangFields
    try {
      const b = localStorage.getItem(UR_FIELD_PREF_KEY)
      if (b === '0' || b === '1') fields = b === '1'
      else {
        const v = localStorage.getItem(OTHER_LANG_KEY)
        if (v === '0' || v === '1') fields = v === '1'
      }
    } catch {
      /* keep fields */
    }
    setShowOtherLangFields(fields)
    try {
      localStorage.setItem(OTHER_LANG_KEY, fields ? '1' : '0')
    } catch {
      /* ignore */
    }
  }

  const displayName =
    (me?.name && typeof me.name === 'object' && (me.name.ur || me.name.en) && loc(me.name, lng)) ||
    me?.email ||
    user?.email ||
    me?.username ||
    user?.username ||
    ''

  const brandSource = me || (user?.tenant ? user : null)
  const institutionName = getInstitutionName(brandSource, lng) || t('app.title')
  const institutionSubtitle = useMemo(() => {
    const aff = settings?.collegeAffiliation
    if (aff && (aff.ur || aff.en)) return loc(aff, lng)
    return t('app.subtitle')
  }, [settings, lng, t])
  const logoInitial = getInstitutionInitial(brandSource, lng, 'ع')

  useEffect(() => {
    if (institutionName) document.title = institutionName
  }, [institutionName])

  return (
    <div className="app-shell flex h-dvh max-h-dvh flex-col overflow-hidden md:flex-row">
      <div
        className={`sidebar-backdrop no-print${navOpen ? ' is-open' : ''}`}
        aria-hidden={!navOpen}
        onMouseDown={() => setNavOpen(false)}
      />
      <aside
        className={`sidebar-shell no-print flex min-h-0 w-full shrink-0 flex-col overflow-hidden md:h-full md:w-[17.5rem] md:max-h-none${navOpen ? ' is-open' : ''}`}
        aria-hidden={false}
      >
        <div className="sidebar-brand shrink-0 px-4 py-4 relative overflow-hidden">
          <div className="sidebar-brand__glow pointer-events-none absolute inset-0 opacity-50" aria-hidden />
          <div className="sidebar-brand__card relative">
            <div className="flex items-center gap-3">
              {logoAbs ? (
                <img
                  src={logoAbs}
                  alt=""
                  className="sidebar-logo-mark h-11 w-11 shrink-0 rounded-xl object-contain bg-white p-1 shadow-sm ring-1 ring-slate-200/80"
                />
              ) : (
                <div
                  className="sidebar-logo-mark flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-emerald-950 shadow-sm ring-1 ring-emerald-100"
                  style={{ background: 'linear-gradient(145deg, var(--ds-primary-soft, #ecfdf5) 0%, #a7f3d0 45%, var(--ds-primary, #0f8f5f) 100%)' }}
                  aria-hidden
                >
                  {logoInitial}
                </div>
              )}
              <div className="min-w-0 text-start flex-1">
                <div
                  className="sidebar-brand__name text-truncate"
                  lang={brandLang}
                  title={institutionName}
                >
                  {institutionName}
                </div>
                {institutionSubtitle ? (
                  <div
                    className={`sidebar-brand__subtitle text-truncate ${brandLang === 'en' ? 'font-latin-ui' : ''}`}
                    lang={brandLang}
                    title={institutionSubtitle}
                  >
                    {institutionSubtitle}
                  </div>
                ) : null}
              </div>
            </div>
            {displayName ? (
              <div className="sidebar-user mt-3" title={displayName}>
                <span className="sidebar-user__avatar font-latin-ui" aria-hidden>
                  {(displayName.trim()[0] || 'U').toUpperCase()}
                </span>
                <span className="sidebar-user__name font-latin-ui text-truncate">{displayName}</span>
              </div>
            ) : null}
          </div>
        </div>

        <SidebarMenu groups={visibleMenuGroups} onNavigate={() => setNavOpen(false)} />
      </aside>

      <div className="app-main-column flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="app-header-block no-print">
          <header className="app-topbar mx-3 mt-3 rounded-3xl border border-slate-200/90 bg-white px-4 py-2.5 shadow-sm md:mx-6 md:mt-4 md:px-5 md:py-3">
            <div className="app-topbar__inner">
              <button
                type="button"
                className="sidebar-menu-toggle"
                aria-label={t('header.openMenu')}
                aria-expanded={navOpen}
                onClick={() => setNavOpen(true)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              <div className="app-header-session-group app-topbar__session">
                <label className="app-topbar__session-label mb-0" htmlFor="hdr-session" lang={brandLang}>
                  {lng === 'ur' ? 'سیشن' : 'Session'}
                </label>
                <AppSelect
                  id="hdr-session"
                  className="app-header-select app-header-select--fit"
                  style={{ fontFamily: lng === 'ur' ? 'var(--font-urdu)' : undefined }}
                  value={activeSessionId}
                  onValueChange={(v) => dispatch(setActiveSessionId(v))}
                  lang={brandLang}
                  placeholder={lng === 'ur' ? 'تمام سیشن' : 'All sessions'}
                  options={sessionsForHeader.map((s) => ({ value: s._id, label: s.title }))}
                />
              </div>

              <AppHeaderSearch />

              <div className="app-topbar__actions app-header-actions-end">
                {i18n.language === 'ur' ? (
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm app-header-cal-btn"
                    onClick={toggle}
                    title={
                      mode === 'hijri'
                        ? 'اسلامی کیلنڈر — عیسوی دکھانے کے لیے کلک کریں'
                        : 'عیسوی کیلنڈر — اسلامی دکھانے کے لیے کلک کریں'
                    }
                  >
                    <span style={{ fontFamily: 'var(--font-urdu)' }}>
                      {mode === 'hijri' ? 'اسلامی' : 'عیسوی'}
                    </span>
                  </button>
                ) : null}

                <div
                  className="tt-week-toggle tt-week-toggle--header tt-week-toggle--compact"
                  role="group"
                  aria-label={t('header.uiLangCaption')}
                >
                  <button
                    type="button"
                    className={`tt-week-toggle__btn${i18n.language === 'ur' ? ' is-active' : ''}`}
                    aria-pressed={i18n.language === 'ur'}
                    onClick={handleSelectUr}
                    title={lng === 'ur' ? 'اردو انٹرفیس' : 'Urdu interface'}
                  >
                    <span className="font-latin-ui tracking-wide">UR</span>
                  </button>
                  <button
                    type="button"
                    className={`tt-week-toggle__btn${i18n.language === 'en' ? ' is-active' : ''}`}
                    aria-pressed={i18n.language === 'en'}
                    onClick={handleSelectEn}
                    title={lng === 'ur' ? 'انگریزی انٹرفیس' : 'English interface'}
                  >
                    <span className="font-latin-ui tracking-wide">EN</span>
                  </button>
                </div>

                <button
                  type="button"
                  className={`btn btn-sm app-header-fields-btn ${showOtherLangFields ? 'btn-outline-primary' : 'btn-outline-secondary'}`}
                  aria-pressed={showOtherLangFields}
                  onClick={() => persistOtherLangFields(!showOtherLangFields)}
                  title={t('header.secondaryColumnsCaption')}
                >
                  <span
                    className={lng === 'en' && !showOtherLangFields ? 'font-latin-ui' : ''}
                    style={{ fontFamily: lng === 'ur' ? 'var(--font-urdu)' : undefined }}
                  >
                    {showOtherLangFields
                      ? lng === 'ur'
                        ? t('header.secondaryUrUiOn')
                        : t('header.secondaryEnUiOn')
                      : lng === 'ur'
                        ? t('header.secondaryUrUiOff')
                        : t('header.secondaryEnUiOff')}
                  </span>
                </button>

                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger app-header-logout-btn"
                  onClick={async () => {
                    try {
                      await logoutSession().unwrap()
                    } catch {
                      /* still clear local session */
                    }
                    dispatch(logout())
                    dispatch(api.util.resetApiState())
                    navigate('/login')
                  }}
                >
                  {t('auth.logout')}
                </button>
              </div>
            </div>
          </header>
        </div>

        <main className="page-gradient app-main-scroll flex-1 px-3 pb-10 pt-2 md:px-6 md:pb-12 md:pt-3">
          <div className="mx-auto max-w-7xl page-content">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
