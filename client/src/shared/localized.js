/**
 * Pick display string for bilingual stored values.
 * Default UI is Urdu (`lng` starts with `ur`): prefers `ur`, falls back to `en`.
 * English UI: prefers `en`, falls back to `ur`.
 * @param {{ ur?: string; en?: string } | undefined} v
 * @param {string} lng
 */
export function loc(v, lng) {
  if (!v) return ''
  const enUi = typeof lng === 'string' && lng.toLowerCase().startsWith('en')
  return enUi ? v.en || v.ur || '' : v.ur || v.en || ''
}

/**
 * UI copy from FL pairs: show only the active interface language (no dual-line labels).
 * @param {{ ur?: string; en?: string } | null | undefined} pair
 * @param {string} lng
 */
export function flText(pair, lng) {
  if (!pair || typeof pair !== 'object') return ''
  const enUi = typeof lng === 'string' && lng.toLowerCase().startsWith('en')
  return enUi ? pair.en ?? '' : pair.ur ?? ''
}

/** `lang` attribute for current UI (`en` or `ur`). */
export function uiLang(lng) {
  return typeof lng === 'string' && lng.toLowerCase().startsWith('en') ? 'en' : 'ur'
}
