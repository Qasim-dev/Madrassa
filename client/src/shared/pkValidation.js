/** Pakistan CNIC: 13 digits, optional dashes (XXXXX-XXXXXXX-X). */
export function normalizeCnic(value) {
  return String(value || '').replace(/\D/g, '')
}

export function isValidCnic(value) {
  const digits = normalizeCnic(value)
  if (!digits) return true // empty allowed unless required elsewhere
  return digits.length === 13
}

export function formatCnicDisplay(value) {
  const d = normalizeCnic(value)
  if (d.length !== 13) return String(value || '').trim()
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`
}

/** Digits only; PK mobiles often 10–12 after country code stripping. */
export function normalizePhone(value) {
  return String(value || '').replace(/[^\d+]/g, '')
}

export function isValidPhone(value) {
  const raw = String(value || '').trim()
  if (!raw) return true
  const digits = raw.replace(/\D/g, '')
  return digits.length >= 10 && digits.length <= 15
}

export function trimFormStrings(obj) {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(trimFormStrings)
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') out[k] = v.trim()
    else if (v && typeof v === 'object') out[k] = trimFormStrings(v)
    else out[k] = v
  }
  return out
}
