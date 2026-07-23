import { forwardRef, useId, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from './cn.js'

/**
 * File / image picker — same control height as AppInput / AppSelect by default.
 * variant="dropzone" uses the larger dashed attach area from the form design.
 */
const AppFileInput = forwardRef(function AppFileInput(
  {
    id,
    className = '',
    accept,
    disabled = false,
    required = false,
    name,
    onChange,
    onBlur,
    variant = 'field',
    label,
    hint,
    optionalLabel,
    chooseLabel,
    valueName,
    ...rest
  },
  ref
) {
  const { t, i18n } = useTranslation()
  const autoId = useId()
  const inputId = id || autoId
  const localRef = useRef(null)
  const inputRef = ref || localRef
  const isUr = (i18n.language || '').startsWith('ur')

  const choose =
    chooseLabel ??
    (isUr ? 'فائل منتخب کریں' : 'Choose file')
  const dropTitle =
    label ??
    (isUr ? 'فائل منتخب کریں یا یہاں کھینچ کر چھوڑیں' : 'Choose a file or drag and drop here')
  const dropHint =
    hint ??
    (isUr ? 'تصویر یا دستاویز — زیادہ سے زیادہ 5MB' : 'Image or document — max 5MB')
  const optional =
    optionalLabel === false
      ? null
      : optionalLabel ?? (isUr ? 'اختیاری' : 'Optional')

  function openPicker() {
    if (disabled) return
    const el = typeof inputRef === 'object' && inputRef?.current ? inputRef.current : null
    el?.click()
  }

  if (variant === 'dropzone') {
    return (
      <div
        className={cn('app-file-dropzone', disabled && 'app-file-dropzone--disabled', className)}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (disabled) return
          const file = e.dataTransfer?.files?.[0]
          if (!file || !onChange) return
          const dt = new DataTransfer()
          dt.items.add(file)
          const input = typeof inputRef === 'object' ? inputRef.current : null
          if (input) {
            input.files = dt.files
            onChange({ target: input })
          }
        }}
      >
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="file"
          accept={accept}
          disabled={disabled}
          required={required}
          className="app-file-dropzone__input"
          onChange={onChange}
          onBlur={onBlur}
          {...rest}
        />
        <div className="app-file-dropzone__icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M12 16V8M8.5 10.5 12 7l3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M20 16.5v1a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-1" strokeLinecap="round" />
          </svg>
        </div>
        <div className="app-file-dropzone__copy min-w-0 flex-grow-1">
          <div className="app-file-dropzone__title-row">
            <p className="app-file-dropzone__title mb-0">{dropTitle}</p>
            {optional ? <span className="app-file-dropzone__optional">{optional}</span> : null}
          </div>
          <p className="app-file-dropzone__hint mb-0">
            {valueName ? valueName : dropHint}
          </p>
        </div>
        <button
          type="button"
          className="app-file-dropzone__btn"
          disabled={disabled}
          onClick={openPicker}
        >
          {choose}
        </button>
      </div>
    )
  }

  return (
    <div className={cn('app-file-field', disabled && 'app-file-field--disabled', className)}>
      <input
        ref={inputRef}
        id={inputId}
        name={name}
        type="file"
        accept={accept}
        disabled={disabled}
        required={required}
        className="app-file-field__input"
        onChange={onChange}
        onBlur={onBlur}
        {...rest}
      />
      <button
        type="button"
        className="app-file-field__btn"
        disabled={disabled}
        onClick={openPicker}
      >
        {choose}
      </button>
      <span className="app-file-field__name text-truncate">
        {valueName || (isUr ? 'کوئی فائل منتخب نہیں' : 'No file chosen')}
      </span>
    </div>
  )
})

export default AppFileInput
