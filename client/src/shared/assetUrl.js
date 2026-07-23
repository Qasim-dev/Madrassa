/** Turn a stored `/uploads/...` path into an absolute URL for img src. */
export function absoluteAssetUrl(url) {
  if (!url) return ''
  const s = String(url).trim()
  if (!s) return ''
  if (s.startsWith('blob:') || s.startsWith('data:')) return s
  if (s.startsWith('http')) return s
  if (s.startsWith('/')) return `${window.location.origin}${s}`
  return s
}

/** True when URL is a saved server photo (not a temporary browser preview). */
export function isStoredAssetUrl(url) {
  if (!url) return false
  const s = String(url).trim()
  if (!s || s.startsWith('blob:') || s.startsWith('data:')) return false
  return s.startsWith('/') || s.startsWith('http')
}
