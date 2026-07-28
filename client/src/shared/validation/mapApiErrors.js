/**
 * Normalize API validation payloads into { message, fields }.
 * Supports:
 * - { fields: { email: '…' } }
 * - { errors: [{ path|param, msg }] } (express-validator)
 * - { message: '…' }
 */
export function mapApiFieldErrors(err) {
  const data = err?.data || err?.error?.data || {}
  const fields = {}

  if (data.fields && typeof data.fields === 'object' && !Array.isArray(data.fields)) {
    for (const [k, v] of Object.entries(data.fields)) {
      if (v) fields[k] = String(v)
    }
  }

  if (Array.isArray(data.errors)) {
    for (const item of data.errors) {
      if (typeof item === 'string') continue
      const path = item.path || item.param || item.field
      const msg = item.msg || item.message
      if (path && msg && !fields[path]) fields[path] = String(msg)
    }
  }

  const message =
    (typeof data.message === 'string' && data.message) ||
    Object.values(fields)[0] ||
    (typeof err?.error === 'string' ? err.error : '') ||
    ''

  return { message, fields }
}
