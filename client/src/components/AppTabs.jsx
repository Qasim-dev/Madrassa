import { uiLang } from '../shared/localized'
import '../styles/appDesignSystem.css'

/**
 * App-wide tab control — pills (dashboard), underline (fees/library), segment (exam mode).
 *
 * @param {{ id: string, label: React.ReactNode, disabled?: boolean, badge?: React.ReactNode }[]} items
 */
export default function AppTabs({
  items,
  value,
  onChange,
  variant = 'pills',
  size = 'md',
  className = '',
  barClassName = '',
  fullWidth = false,
  ariaLabel = 'Tabs',
  lang,
}) {
  const uiLangAttr = lang ? uiLang(lang) : undefined

  return (
    <div
      className={[
        'app-tabs',
        `app-tabs--${variant}`,
        `app-tabs--${size}`,
        fullWidth ? 'app-tabs--full' : '',
        barClassName,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          disabled={item.disabled}
          className={[
            'app-tabs__tab',
            value === item.id ? 'is-active' : '',
            item.disabled ? 'is-disabled' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => !item.disabled && onChange(item.id)}
        >
          <span className="app-tabs__label" lang={uiLangAttr}>
            {item.label}
          </span>
          {item.badge != null && item.badge !== '' ? (
            <span className="app-tabs__badge">{item.badge}</span>
          ) : null}
        </button>
      ))}
    </div>
  )
}

/** Card shell: tab bar + body (dashboard, attendance, etc.) */
export function AppTabPanel({
  tabs,
  value,
  onChange,
  children,
  lang,
  ariaLabel,
  variant = 'pills',
  className = '',
  tabsFullWidth = false,
  tabsClassName = '',
}) {
  return (
    <div className={`app-tab-panel content-panel p-0 overflow-hidden shadow-sm ${className}`.trim()}>
      <div className="app-tab-panel__bar">
        <AppTabs
          items={tabs}
          value={value}
          onChange={onChange}
          variant={variant}
          lang={lang}
          ariaLabel={ariaLabel}
          fullWidth={tabsFullWidth || variant === 'underline'}
          barClassName={tabsClassName}
        />
      </div>
      <div className="app-tab-panel__body">{children}</div>
    </div>
  )
}
