/** Inline validation icon (error / success) inside field shell. */
export default function FieldStatusIcon({ variant = 'error' }) {
  if (variant === 'success') {
    return (
      <span className="app-field__status app-field__status--success" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="9" r="9" fill="var(--app-primary-soft)" />
          <path
            d="M5.5 9.2 7.8 11.5 12.5 6.8"
            stroke="var(--app-primary-dark)"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    )
  }

  return (
    <span className="app-field__status app-field__status--error" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="9" fill="#fee2e2" />
        <path d="M9 5.25v4.1M9 12.1h.01" stroke="#dc2626" strokeWidth="1.85" strokeLinecap="round" />
      </svg>
    </span>
  )
}
