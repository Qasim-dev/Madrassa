/** Read nested value by dot path (`name.ur`, `guardian.phone`). */
export function getByPath(obj, path) {
  if (!path || obj == null) return undefined
  if (!String(path).includes('.')) return obj[path]
  return String(path)
    .split('.')
    .reduce((acc, key) => (acc == null ? undefined : acc[key]), obj)
}

/** Shallow-merge style set for top-level keys; supports one-level nesting via path. */
export function setByPath(obj, path, value) {
  if (!String(path).includes('.')) return { ...obj, [path]: value }
  const parts = String(path).split('.')
  const root = { ...obj }
  let cur = root
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i]
    cur[key] = { ...(cur[key] || {}) }
    cur = cur[key]
  }
  cur[parts[parts.length - 1]] = value
  return root
}
