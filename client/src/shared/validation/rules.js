import { isValidCnic, isValidPhone } from '../pkValidation.js'
import { getByPath } from './path.js'

function asString(value) {
  if (value == null) return ''
  if (typeof value === 'object' && value.ur != null) return String(value.ur || value.en || '').trim()
  return String(value).trim()
}

function isEmpty(value) {
  if (value == null) return true
  if (typeof value === 'boolean') return false
  if (typeof value === 'number') return Number.isNaN(value)
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') {
    if ('ur' in value || 'en' in value) return !String(value.ur || '').trim() && !String(value.en || '').trim()
    return Object.keys(value).length === 0
  }
  return !String(value).trim()
}

/** Build a field rule list into a single validator function. */
export function compose(...rules) {
  return (value, values, t) => {
    for (const rule of rules) {
      const msg = rule(value, values, t)
      if (msg) return msg
    }
    return ''
  }
}

export function required(messageKey = 'validation.required') {
  return (value, _values, t) => (isEmpty(value) ? t(messageKey) : '')
}

export function requiredLocalized(messageKey = 'validation.nameRequired') {
  return (value, _values, t) => {
    const ur = String(value?.ur || '').trim()
    const en = String(value?.en || '').trim()
    if (!ur && !en) return t(messageKey)
    return ''
  }
}

export function email(messageKey = 'validation.email') {
  return (value, _values, t) => {
    const v = asString(value)
    if (!v) return ''
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : t(messageKey)
  }
}

export function minLength(min, messageKey = 'validation.minLength') {
  return (value, _values, t) => {
    const v = asString(value)
    if (!v) return ''
    return v.length < min ? t(messageKey, { min }) : ''
  }
}

export function maxLength(max, messageKey = 'validation.maxLength') {
  return (value, _values, t) => {
    const v = asString(value)
    if (!v) return ''
    return v.length > max ? t(messageKey, { max }) : ''
  }
}

export function passwordMin(min = 8, messageKey = 'validation.passwordMin') {
  return (value, _values, t) => {
    const v = String(value ?? '')
    if (!v) return ''
    return v.length < min ? t(messageKey, { min }) : ''
  }
}

export function cnic(messageKey = 'validation.invalidCnic') {
  return (value, _values, t) => {
    const v = asString(value)
    if (!v) return ''
    return isValidCnic(v) ? '' : t(messageKey)
  }
}

export function phone(messageKey = 'validation.invalidPhone') {
  return (value, _values, t) => {
    const v = asString(value)
    if (!v) return ''
    return isValidPhone(v) ? '' : t(messageKey)
  }
}

export function numberMin(min, messageKey = 'validation.numberMin') {
  return (value, _values, t) => {
    if (value === '' || value == null) return ''
    const n = Number(value)
    if (Number.isNaN(n)) return t('validation.number')
    return n < min ? t(messageKey, { min }) : ''
  }
}

export function numberMax(max, messageKey = 'validation.numberMax') {
  return (value, _values, t) => {
    if (value === '' || value == null) return ''
    const n = Number(value)
    if (Number.isNaN(n)) return t('validation.number')
    return n > max ? t(messageKey, { max }) : ''
  }
}

export function positiveAmount(messageKey = 'validation.amountPositive') {
  return (value, _values, t) => {
    if (value === '' || value == null) return ''
    const n = Number(value)
    if (Number.isNaN(n)) return t('validation.number')
    return n > 0 ? '' : t(messageKey)
  }
}

export function notFutureDate(messageKey = 'validation.dateNotFuture') {
  return (value, _values, t) => {
    const v = asString(value)
    if (!v) return ''
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return t('validation.dateInvalid')
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    return d > today ? t(messageKey) : ''
  }
}

/** Error when `value` is earlier than the date at `otherPath` (e.g. endDate before startDate). */
export function dateBefore(otherPath, messageKey = 'validation.dateBefore') {
  return (value, values, t) => {
    const v = asString(value)
    const other = asString(getByPath(values, otherPath))
    if (!v || !other) return ''
    const a = new Date(v)
    const b = new Date(other)
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return ''
    return a < b ? t(messageKey) : ''
  }
}

export function marksWithinMax(maxPath, messageKey = 'validation.marksExceedMax') {
  return (value, values, t) => {
    if (value === '' || value == null) return ''
    const marks = Number(value)
    const max = Number(getByPath(values, maxPath))
    if (Number.isNaN(marks) || Number.isNaN(max)) return ''
    return marks > max ? t(messageKey) : ''
  }
}

export function matches(otherPath, messageKey = 'validation.passwordMatch') {
  return (value, values, t) => {
    const other = getByPath(values, otherPath)
    if (!value && !other) return ''
    return String(value) === String(other) ? '' : t(messageKey)
  }
}
