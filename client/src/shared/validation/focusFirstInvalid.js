/**
 * Focus and scroll to the first invalid field.
 * @param {string[]} fieldNames - ordered or unordered error keys
 * @param {Record<string, string>} fieldIds - map field name → DOM id
 * @param {string[]} [order] - preferred focus order
 */
export function focusFirstInvalid(fieldNames, fieldIds = {}, order = []) {
  if (typeof document === 'undefined') return
  const names = Array.isArray(fieldNames) ? fieldNames : Object.keys(fieldNames || {})
  if (!names.length) return

  const ordered = [
    ...order.filter((n) => names.includes(n)),
    ...names.filter((n) => !order.includes(n)),
  ]

  for (const name of ordered) {
    const id = fieldIds[name]
    const el =
      (id && document.getElementById(id)) ||
      document.querySelector(`[name="${CSS.escape(name)}"]`) ||
      document.querySelector(`[data-field="${CSS.escape(name)}"]`)
    if (!el || typeof el.focus !== 'function') continue
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } catch {
      /* ignore */
    }
    el.focus({ preventScroll: true })
    return el
  }
  return null
}
