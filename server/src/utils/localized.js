/** @typedef {{ ur?: string; en?: string }} Localized */

/**
 * @param {Localized | null | undefined} v
 * @param {'ur' | 'en'} [locale]
 */
export function text(v, locale = 'ur') {
  if (!v || typeof v !== 'object') return '';
  const primary = locale === 'en' ? v.en || v.ur : v.ur || v.en;
  return primary ?? '';
}
