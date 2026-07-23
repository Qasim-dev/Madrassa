import { loc } from './localized'

/** Localized madrasa / tenant display name from auth `me` or stored user. */
export function getInstitutionName(meOrUser, lng) {
  const n = meOrUser?.tenant?.name
  if (!n) return ''
  if (typeof n === 'object') return loc(n, lng) || n.ur || n.en || ''
  return String(n).trim()
}

export function getInstitutionInitial(meOrUser, lng, fallback = 'م') {
  const name = getInstitutionName(meOrUser, lng)
  return (name || fallback).charAt(0)
}
