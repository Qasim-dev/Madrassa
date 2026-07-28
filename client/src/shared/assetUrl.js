/** Turn a stored `/uploads/...` path into an absolute URL for img src. */
export function absoluteAssetUrl(url) {
  if (!url) return ''
  const s = String(url).trim()
  if (!s) return ''
  if (s.startsWith('blob:') || s.startsWith('data:')) return s
  if (s.startsWith('http')) return s

  let path = s.startsWith('/') ? s : `/${s}`
  // Public ID-card photo endpoint does not need a token
  if (path.startsWith('/api/public/')) {
    return `${window.location.origin}${path}`
  }

  if (path.startsWith('/uploads')) {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      if (token && !/[?&]access_token=/.test(path) && !/[?&]sig=/.test(path)) {
        const join = path.includes('?') ? '&' : '?'
        path = `${path}${join}access_token=${encodeURIComponent(token)}`
      }
    } catch {
      /* ignore */
    }
  }

  return `${window.location.origin}${path}`
}

/** True when URL is a saved server photo (not a temporary browser preview). */
export function isStoredAssetUrl(url) {
  if (!url) return false
  const s = String(url).trim()
  if (!s || s.startsWith('blob:') || s.startsWith('data:')) return false
  return s.startsWith('/') || s.startsWith('http')
}
