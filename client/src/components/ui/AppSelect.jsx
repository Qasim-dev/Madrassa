import React, { forwardRef, useMemo, useCallback } from 'react'
import Select from 'react-select'
import { useTranslation } from 'react-i18next'

// HTML attributes that must NOT be forwarded to react-select
const HTML_ATTRS = new Set([
  'dir', 'lang', 'aria-label', 'aria-labelledby', 'aria-describedby',
  'data-lang-field', 'tabIndex', 'tabindex', 'form', 'autoFocus',
  'autofocus', 'style',
])

function makeStyles(invalid, isRtl) {
  const height = 'var(--ui-field-height)'
  return {
    container: (base) => ({
      ...base,
      width: '100%',
      fontFamily: 'inherit',
    }),
    control: (base, state) => ({
      ...base,
      minHeight: height,
      height,
      maxHeight: height,
      padding: 0,
      boxSizing: 'border-box',
      borderRadius: 'var(--ui-field-radius)',
      borderColor: invalid
        ? 'rgba(239,68,68,.5)'
        : state.isFocused
          ? 'var(--app-primary)'
          : 'var(--ui-field-border)',
      backgroundColor: invalid ? 'var(--ui-field-error-soft)' : 'var(--ui-field-bg)',
      boxShadow: state.isFocused
        ? (invalid ? '0 0 0 2px rgba(239,68,68,.2)' : 'var(--ui-field-shadow-focus)')
        : 'var(--ui-field-shadow)',
      '&:hover': {
        borderColor: invalid ? 'rgba(239,68,68,.5)' : 'rgba(38,186,153,.35)',
      },
      transition: 'border-color .2s ease, box-shadow .2s ease',
      fontSize: 'var(--ui-field-font-size)',
      lineHeight: 1.25,
      fontFamily: 'inherit',
      cursor: 'pointer',
      display: 'flex',
      flexWrap: 'nowrap',
      alignItems: 'center',
      overflow: 'hidden',
    }),
    valueContainer: (base) => ({
      ...base,
      /* Keep react-select grid so singleValue/input share one cell and center */
      display: base.display || 'grid',
      padding: isRtl
        ? '0 var(--ui-field-pad-x) 0 4px'
        : '0 4px 0 var(--ui-field-pad-x)',
      minHeight: '100%',
      height: '100%',
      flex: '1 1 auto',
      flexWrap: 'nowrap',
      alignItems: 'center',
      overflow: 'hidden',
    }),
    input: (base) => ({
      ...base,
      margin: 0,
      padding: 0,
      fontSize: 'var(--ui-field-font-size)',
      lineHeight: 1.25,
      color: 'var(--ui-text-primary)',
    }),
    singleValue: (base) => ({
      ...base,
      gridArea: '1 / 1 / 2 / 3',
      display: 'flex',
      alignItems: 'center',
      height: '100%',
      margin: 0,
      padding: 0,
      maxWidth: '100%',
      fontSize: 'var(--ui-field-font-size)',
      lineHeight: 1,
      color: 'var(--ui-text-primary)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }),
    placeholder: (base) => ({
      ...base,
      gridArea: '1 / 1 / 2 / 3',
      display: 'flex',
      alignItems: 'center',
      height: '100%',
      margin: 0,
      padding: 0,
      fontSize: 'var(--ui-field-font-size)',
      lineHeight: 1,
      color: 'var(--ui-text-placeholder)',
    }),
    indicatorsContainer: (base) => ({
      ...base,
      height: '100%',
      flex: '0 0 auto',
      flexShrink: 0,
      padding: isRtl ? '0 0 0 2px' : '0 2px 0 0',
      alignItems: 'center',
      alignSelf: 'stretch',
    }),
    indicatorSeparator: () => ({ display: 'none' }),
    dropdownIndicator: (base, state) => ({
      ...base,
      color: state.isFocused ? 'var(--app-primary)' : 'var(--ui-text-secondary)',
      padding: '0 8px',
      display: 'flex',
      alignItems: 'center',
      flexShrink: 0,
      transition: 'color .2s, transform .2s',
      transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
    }),
    clearIndicator: (base) => ({
      ...base,
      color: 'var(--ui-text-secondary)',
      padding: '0 6px',
      display: 'flex',
      alignItems: 'center',
      flexShrink: 0,
      '&:hover': { color: 'var(--ds-danger, #dc2626)' },
    }),
    menu: (base) => ({
      ...base,
      borderRadius: '16px',
      border: '1px solid var(--ui-field-border)',
      boxShadow: '0 8px 32px rgba(15,23,42,.1)',
      padding: '6px',
      zIndex: 12060,
      overflow: 'hidden',
    }),
    menuList: (base) => ({
      ...base,
      padding: 0,
      maxHeight: 'min(320px, 50vh)',
    }),
    option: (base, state) => ({
      ...base,
      borderRadius: '8px',
      padding: '10px 12px',
      marginBottom: '2px',
      backgroundColor: state.isSelected
        ? 'rgba(38,186,153,.12)'
        : state.isFocused
          ? '#f8fafc'
          : 'transparent',
      color: state.isSelected ? 'var(--app-primary-dark)' : 'var(--ui-text-primary)',
      '&:active': { backgroundColor: 'rgba(38,186,153,.18)' },
      cursor: 'pointer',
      fontSize: 'var(--ui-field-font-size)',
      lineHeight: 1.85,
      fontWeight: state.isSelected ? '500' : '400',
    }),
    menuPortal: (base) => ({ ...base, zIndex: 12060 }),
  }
}

const AppSelect = forwardRef(function AppSelect(
  {
    id,
    value,
    onChange,
    onValueChange,
    options = [],
    placeholder,
    disabled = false,
    required = false,
    invalid = false,
    className = '',
    name,
    children,
    // extract but don't forward to react-select
    style,
    dir,
    lang, // eslint-disable-line no-unused-vars
    size, // eslint-disable-line no-unused-vars
    'aria-describedby': ariaDescribedBy,
    'aria-errormessage': ariaErrorMessage,
    ...rest
  },
  ref
) {
  const { i18n } = useTranslation()
  const isRtl = dir ? dir === 'rtl' : i18n.dir() === 'rtl'
  const menuPortalTarget = typeof document !== 'undefined' ? document.body : null

  // Strip remaining HTML-only attributes to avoid react-select warnings
  const selectProps = useMemo(() => {
    const clean = {}
    for (const [k, v] of Object.entries(rest)) {
      if (!HTML_ATTRS.has(k)) clean[k] = v
    }
    return clean
  }, [rest])

  // Build options list from <option> children — include all, even value=""
  const childrenOptions = useMemo(() => {
    const opts = []
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.type === 'option') {
        opts.push({
          value: child.props.value ?? '',
          label: child.props.children,
          isDisabled: child.props.disabled,
        })
      }
    })
    return opts
  }, [children])

  const allOptions = useMemo(
    () => [
      ...options.map((o) => ({ value: o.value, label: o.label, isDisabled: o.disabled })),
      ...childrenOptions,
    ],
    [options, childrenOptions]
  )

  // selectedOption: match by value; when value is '' or null show placeholder (null)
  // unless there's an explicit option with that value (e.g. "All sessions" with value='')
  const selectedOption = useMemo(() => {
    if (value === undefined || value === null) return null
    const strVal = String(value)
    return allOptions.find((o) => String(o.value ?? '') === strVal) ?? null
  }, [value, allOptions])

  const handleChange = useCallback(
    (opt) => {
      const val = opt ? opt.value : ''
      onChange?.({ target: { name, value: val }, preventDefault() {}, stopPropagation() {} })
      onValueChange?.(val)
    },
    [name, onChange, onValueChange]
  )

  // Memoize styles to avoid unnecessary re-renders
  const memoStyles = useMemo(() => makeStyles(invalid, isRtl), [invalid, isRtl])

  // Apply font-family from style prop via the container
  const containerStyle = useMemo(
    () => (style?.fontFamily ? { fontFamily: style.fontFamily } : undefined),
    [style]
  )

  const memoStylesWithFont = useMemo(() => {
    if (!style?.fontFamily) return memoStyles
    const ff = style.fontFamily
    return {
      ...memoStyles,
      container: (base, state) => ({
        ...memoStyles.container(base, state),
        fontFamily: ff,
      }),
      control: (base, state) => ({
        ...memoStyles.control(base, state),
        fontFamily: ff,
      }),
      singleValue: (base, state) => ({
        ...memoStyles.singleValue(base, state),
        fontFamily: ff,
      }),
      placeholder: (base, state) => ({
        ...memoStyles.placeholder(base, state),
        fontFamily: ff,
      }),
      option: (base, state) => ({
        ...memoStyles.option(base, state),
        fontFamily: ff,
      }),
      menu: (base, state) => ({
        ...memoStyles.menu(base, state),
        fontFamily: ff,
      }),
    }
  }, [memoStyles, style])

  // Clear (×) only when a real value is selected — not for empty / "—" placeholders
  const hasClearableValue =
    value !== undefined && value !== null && String(value).trim() !== ''

  return (
    <Select
      ref={ref}
      inputId={id}
      name={name}
      options={allOptions}
      value={selectedOption}
      onChange={handleChange}
      isDisabled={disabled}
      placeholder={placeholder ?? '—'}
      styles={memoStylesWithFont}
      style={containerStyle}
      isClearable={hasClearableValue}
      isSearchable
      isRtl={isRtl}
      menuPortalTarget={menuPortalTarget}
      menuPosition="fixed"
      menuShouldScrollIntoView={false}
      classNamePrefix="app-select"
      className={['app-select', className].filter(Boolean).join(' ')}
      aria-required={required || undefined}
      aria-invalid={invalid || undefined}
      aria-describedby={ariaDescribedBy}
      aria-errormessage={ariaErrorMessage}
      {...selectProps}
    />
  )
})

export default AppSelect
