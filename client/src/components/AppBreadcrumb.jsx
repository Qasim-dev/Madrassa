import { Link, useLocation, matchPath } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

/** Longest-match first so nested routes resolve correctly. */
const ROUTES = [
  { path: '/teachers/new', labelKey: 'nav.teachers' },
  { path: '/teachers/:id/edit', labelKey: 'nav.teachers' },
  { path: '/id-cards/print', labelKey: 'nav.idCards' },
  { path: '/id-cards/templates', labelKey: 'nav.idCards' },
  { path: '/id-cards/history', labelKey: 'nav.idCards' },
  { path: '/id-cards', labelKey: 'nav.idCards' },
  { path: '/students/new', labelKey: 'nav.students' },
  { path: '/students/print-cards', labelKey: 'nav.students' },
  { path: '/students/:id/edit', labelKey: 'nav.students' },
  { path: '/students/:id/print', labelKey: 'nav.students' },
  { path: '/book-reading/:id', labelKey: 'nav.bookReading' },
  { path: '/exams/:id/result-print', labelKey: 'nav.exams' },
  { path: '/tartibat/sessions', labelKey: 'nav.tartibatSessions' },
  { path: '/tartibat/subjects', labelKey: 'nav.tartibatSubjects' },
  { path: '/tartibat/darajat', labelKey: 'nav.tartibatDarajat' },
  { path: '/tartibat/books', labelKey: 'nav.tartibatBooks' },
  { path: '/tartibat/timetable', labelKey: 'nav.tartibatTimetable' },
  { path: '/book-reading', labelKey: 'nav.bookReading' },
  { path: '/exams', labelKey: 'nav.exams' },
  { path: '/students', labelKey: 'nav.students' },
  { path: '/teachers', labelKey: 'nav.teachers' },
  { path: '/attendance', labelKey: 'nav.attendance' },
  { path: '/student-character', labelKey: 'nav.studentCharacter' },
  { path: '/fees', labelKey: 'nav.fees' },
  { path: '/finance', labelKey: 'nav.finance' },
  { path: '/inventory', labelKey: 'nav.inventory' },
  { path: '/library', labelKey: 'nav.library' },
  { path: '/speeches', labelKey: 'nav.speeches' },
  { path: '/profile', labelKey: 'nav.profile' },
  { path: '/users', labelKey: 'nav.users' },
  { path: '/recycle-bin', labelKey: 'nav.recycleBin' },
]

function resolveLeaf(pathname) {
  for (const r of ROUTES) {
    if (matchPath({ path: r.path, end: true }, pathname)) return r
  }
  return null
}

export default function AppBreadcrumb() {
  const { t } = useTranslation()
  const { pathname } = useLocation()

  if (pathname === '/') {
    return (
      <nav className="app-breadcrumb" aria-label="Breadcrumb">
        <ol className="app-breadcrumb__list">
          <li className="app-breadcrumb__current" aria-current="page">
            {t('nav.dashboard')}
          </li>
        </ol>
      </nav>
    )
  }

  const leaf = resolveLeaf(pathname)
  if (!leaf) return null

  return (
    <nav className="app-breadcrumb" aria-label="Breadcrumb">
      <ol className="app-breadcrumb__list">
        <li className="app-breadcrumb__item">
          <Link to="/" className="app-breadcrumb__link">
            {t('nav.dashboard')}
          </Link>
          <span className="app-breadcrumb__sep" aria-hidden>
            /
          </span>
        </li>
        <li className="app-breadcrumb__current" aria-current="page">
          {t(leaf.labelKey)}
        </li>
      </ol>
    </nav>
  )
}
