import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEffect, useMemo, useState } from 'react'
import { FL } from '../shared/fieldLabels'
import { flText, uiLang } from '../shared/localized'
import NavIcon from './NavIcon'

function isChildPathActive(pathname, item) {
  const { to, end } = item
  if (end) return pathname === to
  if (pathname === to) return true
  return pathname.startsWith(`${to}/`)
}

function SidebarSubmenu({ labelKey, icon, children, open, onToggle, onNavigate }) {
  const { i18n } = useTranslation()
  const location = useLocation()
  const pair = FL[labelKey]
  const lng = i18n.language
  const lang = uiLang(lng)
  const text = pair ? flText(pair, lng) : ''

  const childActive = useMemo(
    () => children.some((c) => isChildPathActive(location.pathname, c)),
    [children, location.pathname]
  )

  if (!pair) return null

  return (
    <div className={`sidebar-submenu ${open ? 'sidebar-submenu--open' : ''} ${childActive ? 'sidebar-submenu--child-active' : ''}`}>
      <button
        type="button"
        className="sidebar-submenu__toggle-row"
        aria-expanded={open}
        onClick={() => onToggle?.(labelKey)}
      >
        <span className="sidebar-menu-link__icon" aria-hidden>
          <NavIcon name={icon} />
        </span>
        <span className="sidebar-submenu__label sidebar-menu-link__text min-w-0 flex-1 text-start">
          <span
            className={`sidebar-menu-link__line sidebar-menu-link__line--${lang}`}
            lang={lang}
            style={{ fontFamily: lang === 'ur' ? 'var(--font-urdu)' : 'var(--font-latin)' }}
          >
            {text}
          </span>
        </span>
        <span
          className={`sidebar-submenu__chevron${open ? ' sidebar-submenu__chevron--open' : ''}`}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="sidebar-submenu__children flex flex-col gap-1">
          {children.map((item) => (
            <SidebarMenuItem key={item.to + (item.navKey || '')} {...item} nested onNavigate={onNavigate} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function SidebarMenuItem({ to, end, navKey, icon, nested, onNavigate }) {
  const { i18n } = useTranslation()
  const pair = FL[navKey]
  if (!pair) return null
  const lng = i18n.language
  const lang = uiLang(lng)
  const text = flText(pair, lng)

  return (
    <NavLink
      to={to}
      end={end}
      onClick={() => onNavigate?.()}
      className={({ isActive }) =>
        `sidebar-menu-link ${nested ? 'sidebar-menu-link--nested' : ''} ${isActive ? 'sidebar-menu-link--active' : ''}`
      }
    >
      <span className="sidebar-menu-link__icon">
        <NavIcon name={icon} />
      </span>
      <span className="sidebar-menu-link__text">
        <span
          className={`sidebar-menu-link__line sidebar-menu-link__line--${lang}`}
          lang={lang}
          style={{ fontFamily: lang === 'ur' ? 'var(--font-urdu)' : 'var(--font-latin)' }}
        >
          {text}
        </span>
      </span>
    </NavLink>
  )
}

/** One link per section — uses the route label (e.g. navDashboard → ڈیش بورڈ), not the group title (جائزہ). */
function SidebarGroupSingleLink({ labelKey, icon, item, onNavigate }) {
  const { i18n } = useTranslation()
  const pair = FL[item.navKey] || FL[labelKey]
  if (!pair) return null
  const lng = i18n.language
  const lang = uiLang(lng)
  const text = flText(pair, lng)
  const navIcon = item.icon || icon

  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={() => onNavigate?.()}
      className={({ isActive }) =>
        `sidebar-menu-link ${isActive ? 'sidebar-menu-link--active' : ''}`
      }
    >
      <span className="sidebar-menu-link__icon">
        <NavIcon name={navIcon} />
      </span>
      <span className="sidebar-menu-link__text">
        <span
          className={`sidebar-menu-link__line sidebar-menu-link__line--${lang}`}
          lang={lang}
          style={{ fontFamily: lang === 'ur' ? 'var(--font-urdu)' : 'var(--font-latin)' }}
        >
          {text}
        </span>
      </span>
    </NavLink>
  )
}

export function SidebarMenu({ groups, onNavigate }) {
  const location = useLocation()

  const activeGroupKey = useMemo(() => {
    for (const g of groups) {
      if (g.items.length <= 1) continue
      if (g.items.some((c) => isChildPathActive(location.pathname, c))) return g.labelKey
    }
    return null
  }, [groups, location.pathname])

  const [openGroupKey, setOpenGroupKey] = useState(activeGroupKey)

  /* Keep accordion in sync with the route (which group contains the active page). */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync derived route → open section
    setOpenGroupKey(activeGroupKey ?? null)
  }, [activeGroupKey])

  function handleGroupToggle(key) {
    setOpenGroupKey((prev) => (prev === key ? null : key))
  }

  return (
    <nav className="sidebar-menu sidebar-menu-scroll flex flex-1 min-h-0 flex-col gap-1.5 px-3 py-2" aria-label="Main">
      {groups.map((g) =>
        g.items.length === 1 ? (
          <SidebarGroupSingleLink
            key={g.labelKey}
            labelKey={g.labelKey}
            icon={g.icon}
            item={g.items[0]}
            onNavigate={onNavigate}
          />
        ) : (
          <SidebarSubmenu
            key={g.labelKey}
            labelKey={g.labelKey}
            icon={g.icon}
            open={openGroupKey === g.labelKey}
            onToggle={handleGroupToggle}
            onNavigate={onNavigate}
          >
            {g.items}
          </SidebarSubmenu>
        )
      )}
    </nav>
  )
}
