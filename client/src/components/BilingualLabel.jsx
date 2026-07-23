import { useTranslation } from 'react-i18next'
import { FL } from '../shared/fieldLabels'
import { flText, uiLang } from '../shared/localized'

/**
 * Field label: single line in the active UI language only (Urdu or English).
 * @param {keyof typeof FL | string} k
 */
function stripLangSuffix(text, ui) {
  const t = String(text || '')
  if (!t) return t
  // If UI is already Urdu, remove “— اردو …” hints from labels (still keep “— انگریزی …”)
  if (ui === 'ur') {
    return t
      .replace(/\s*—\s*اردو(?:\s*میں)?\s*$/g, '')
      .replace(/\s*—\s*اردو(?:\s*میں)?\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }
  // If UI is English, remove “(Urdu …)” hints (still keep “(English)”)
  return t
    .replace(/\s*\(\s*Urdu[^)]*\)\s*$/gi, '')
    .replace(/\s*—\s*Urdu[^—]*$/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export default function BilingualLabel({ k, htmlFor, className = '', required, ...rest }) {
  const { i18n } = useTranslation()
  const pair = FL[k]
  const lng = i18n.language
  const lang = uiLang(lng)
  if (!pair) {
    return (
      <label htmlFor={htmlFor} className={`bilingual-label ${className}`}>
        <span className="bilingual-label__text">{k}</span>
        {required && <span className="text-danger ms-1">*</span>}
      </label>
    )
  }
  const text = stripLangSuffix(flText(pair, lng), lang)
  return (
    <label htmlFor={htmlFor} className={`bilingual-label ${className}`} lang={lang} {...rest}>
      <span className={`bilingual-label__text bilingual-label__text--${lang}`}>
        {text}
        {required && <span className="text-danger ms-1">*</span>}
      </span>
    </label>
  )
}

/** Inner text for table headers (DataTable): one language only. */
export function BilingualThContent({ k, className = '' }) {
  const { i18n } = useTranslation()
  const pair = FL[k]
  const lng = i18n.language
  const lang = uiLang(lng)
  if (!pair) return <span className={className}>{k}</span>
  const text = flText(pair, lng)
  return (
    <span className={`bilingual-th-inner bilingual-th-inner--single ${className}`} lang={lang}>
      {text}
    </span>
  )
}

/** Table header cell with bilingual titles (legacy; prefer DataTable + BilingualThContent). */
export function BilingualTh({ k, className = '' }) {
  if (!FL[k]) return <th className={className}>{k}</th>
  return (
    <th scope="col" className={`bilingual-th ${className}`}>
      <BilingualThContent k={k} />
    </th>
  )
}

/** Section heading in forms (FL key) — single active language. */
export function FlSectionTitle({ k, className = '' }) {
  const { i18n } = useTranslation()
  const pair = FL[k]
  const lng = i18n.language
  const lang = uiLang(lng)
  if (!pair) return null
  const text = flText(pair, lng)
  return (
    <div className={`page-section-title mb-3 pb-2 border-bottom border-secondary-subtle ${className}`} lang={lang}>
      <span className={`page-section-title__text page-section-title__text--${lang}`}>{text}</span>
    </div>
  )
}
