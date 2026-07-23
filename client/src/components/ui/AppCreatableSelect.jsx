import React, { forwardRef, useMemo, useCallback } from 'react'
import CreatableSelect from 'react-select/creatable'
import { useTranslation } from 'react-i18next'

const HTML_ATTRS = new Set([
  'dir', 'lang', 'aria-label', 'aria-labelledby', 'aria-describedby',
  'data-lang-field', 'tabIndex', 'tabindex', 'form', 'autoFocus',
  'autofocus', 'style',
])

function makeStyles(invalid, isRtl) {
  const height = 'var(--ui-field-height)'
  return {
    container: (base) => ({ ...base, width: '100%', fontFamily: 'inherit' }),
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
        borderColor: invalid ? 'rgba(239,68,68,.5)' : 'rgba(15,143,95,.35)',
      },
      transition: 'border-color .2s ease, box-shadow .2s ease',
      fontSize: 'var(--ui-field-font-size)',
      lineHeight: isRtl ? 1.45 : 1.35,
      cursor: 'pointer',
      display: 'flex',
      flexWrap: 'nowrap',
      alignItems: 'center',
      overflow: 'hidden',
    }),
    valueContainer: (base) => ({
      ...base,
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
      lineHeight: isRtl ? 1.45 : 1.35,
      color: 'var(--ui-text-primary)',
    }),
    singleValue: (base) => ({
      ...base,
      margin: 0,
      fontSize: 'var(--ui-field-font-size)',
      lineHeight: isRtl ? 1.45 : 1.35,
      color: 'var(--ui-text-primary)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      maxWidth: '100%',
    }),
    placeholder: (base) => ({
      ...base,
      margin: 0,
      fontSize: 'var(--ui-field-font-size)',
      lineHeight: isRtl ? 1.45 : 1.35,
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
        ? 'rgba(15,143,95,.12)'
        : state.isFocused
          ? '#f8fafc'
          : 'transparent',
      color: state.isSelected ? 'var(--app-primary-dark)' : 'var(--ui-text-primary)',
      '&:active': { backgroundColor: 'rgba(15,143,95,.18)' },
      cursor: 'pointer',
      fontSize: 'var(--ui-field-font-size)',
      lineHeight: 1.85,
      fontWeight: state.isSelected ? '500' : '400',
    }),
    menuPortal: (base) => ({ ...base, zIndex: 12060 }),
  }
}

/**
 * Select + type-to-create. Same look as AppSelect.
 * onChange receives { target: { name, value } } where value is the option value
 * (existing or newly typed string). onCreateOption receives the raw typed string.
 */
const AppCreatableSelect = forwardRef(function AppCreatableSelect(
  {
    id,
    value,
    onChange,
    onValueChange,
    onCreateOption,
    options = [],
    placeholder,
    disabled = false,
    required = false,
    invalid = false,
    className = '',
    name,
    formatCreateLabel,
    style,
    dir,
    lang, // eslint-disable-line no-unused-vars
    size, // eslint-disable-line no-unused-vars
    ...rest
  },
  ref
) {
  const { i18n } = useTranslation()
  const isRtl = dir ? dir === 'rtl' : i18n.dir() === 'rtl'
  const menuPortalTarget = typeof document !== 'undefined' ? document.body : null

  const selectProps = useMemo(() => {
    const clean = {}
    for (const [k, v] of Object.entries(rest)) {
      if (!HTML_ATTRS.has(k)) clean[k] = v
    }
    return clean
  }, [rest])

  const allOptions = useMemo(
    () => options.map((o) => ({ value: o.value, label: o.label, isDisabled: o.disabled })),
    [options]
  )

  const selectedOption = useMemo(() => {
    if (value === undefined || value === null || value === '') return null
    const strVal = String(value)
    const found = allOptions.find((o) => String(o.value ?? '') === strVal)
    if (found) return found
    // Custom / created value not in the preset list
    return { value: strVal, label: strVal }
  }, [value, allOptions])

  const emit = useCallback(
    (val) => {
      onChange?.({ target: { name, value: val }, preventDefault() {}, stopPropagation() {} })
      onValueChange?.(val)
    },
    [name, onChange, onValueChange]
  )

  const handleChange = useCallback(
    (opt) => {
      emit(opt ? opt.value : '')
    },
    [emit]
  )

  const handleCreate = useCallback(
    (inputValue) => {
      const trimmed = String(inputValue ?? '').trim()
      if (!trimmed) return
      if (onCreateOption) onCreateOption(trimmed)
      else emit(trimmed)
    },
    [onCreateOption, emit]
  )

  const memoStyles = useMemo(() => makeStyles(invalid, isRtl), [invalid, isRtl])
  const containerStyle = useMemo(
    () => (style?.fontFamily ? { fontFamily: style.fontFamily } : undefined),
    [style]
  )

  const hasClearableValue =
    value !== undefined && value !== null && String(value).trim() !== ''

  return (
    <CreatableSelect
      ref={ref}
      inputId={id}
      name={name}
      options={allOptions}
      value={selectedOption}
      onChange={handleChange}
      onCreateOption={handleCreate}
      isDisabled={disabled}
      placeholder={placeholder ?? '—'}
      styles={memoStyles}
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
      formatCreateLabel={
        formatCreateLabel ||
        ((input) => (i18n.language === 'ur' ? `نیا شامل کریں: "${input}"` : `Add "${input}"`))
      }
      {...selectProps}
    />
  )
})

export default AppCreatableSelect
