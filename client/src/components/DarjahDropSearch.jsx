import { AppSelect } from './ui'

/**
 * Searchable darjah/subject picker — same AppSelect chrome as Session filters.
 */
export default function DarjahDropSearch({
  id,
  value,
  onChange,
  options = [],
  disabled,
  lng,
  allLabel,
  searchPlaceholder,
}) {
  return (
    <AppSelect
      id={id}
      className="w-100"
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      placeholder={searchPlaceholder || '—'}
      style={lng === 'ur' ? { fontFamily: 'var(--font-urdu)' } : undefined}
      aria-label={allLabel}
    >
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </AppSelect>
  )
}
