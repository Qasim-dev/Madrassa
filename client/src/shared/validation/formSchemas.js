/**
 * Common field-id maps and schemas for add/edit forms.
 * Keep messages short and actionable (i18n keys).
 */
import { compose, required, email, passwordMin, matches, positiveAmount, notFutureDate, dateBefore } from './rules.js'

export function localizedNameRequired(messageKey = 'validation.nameRequired') {
  return (_value, values, t) => {
    const ur = String(values?.name?.ur || values?.title?.ur || '').trim()
    const en = String(values?.name?.en || values?.title?.en || '').trim()
    // Prefer checking the object that was passed as the field group
    return ur || en ? '' : t(messageKey)
  }
}

export function titleLocRequired(messageKey = 'validation.required') {
  return (_value, values, t) => {
    const ur = String(values?.title?.ur || '').trim()
    const en = String(values?.title?.en || '').trim()
    if (!ur && !en) return t(messageKey)
    return ''
  }
}

export function nameLocRequired(messageKey = 'validation.nameRequired') {
  return (_value, values, t) => {
    const ur = String(values?.name?.ur || '').trim()
    const en = String(values?.name?.en || '').trim()
    if (!ur && !en) return t(messageKey)
    return ''
  }
}

export const sessionFormSchema = {
  title: required('validation.required'),
  endDate: dateBefore('startDate', 'validation.dateBefore'),
}

export const subjectFormSchema = {
  sessionId: required('validation.selectRequired'),
  'name.ur': (_v, values, t) => {
    const ur = String(values?.name?.ur || '').trim()
    const en = String(values?.name?.en || '').trim()
    return ur || en ? '' : t('validation.nameRequired')
  },
}

export const darjahFormSchema = {
  sessionId: required('validation.selectRequired'),
  'name.ur': (_v, values, t) => {
    const ur = String(values?.name?.ur || '').trim()
    const en = String(values?.name?.en || '').trim()
    return ur || en ? '' : t('validation.nameRequired')
  },
}

export const bookFormSchema = {
  sessionId: required('validation.selectRequired'),
  subjectId: required('validation.selectRequired'),
  darjahId: required('validation.selectClass'),
  'title.ur': (_v, values, t) => {
    const ur = String(values?.title?.ur || '').trim()
    const en = String(values?.title?.en || '').trim()
    return ur || en ? '' : t('validation.required')
  },
  totalPages: (value, _values, t) => {
    if (value === '' || value == null) return ''
    const n = Number(value)
    if (!Number.isFinite(n) || n < 1) return t('validation.numberMin', { min: 1 })
    return ''
  },
}

export const speechFormSchema = {
  'title.ur': (_v, values, t) => {
    const ur = String(values?.title?.ur || '').trim()
    const en = String(values?.title?.en || '').trim()
    return ur || en ? '' : t('validation.required')
  },
}

export const libraryBookSchema = {
  'title.ur': (_v, values, t) => {
    const ur = String(values?.title?.ur || '').trim()
    const en = String(values?.title?.en || '').trim()
    return ur || en ? '' : t('validation.required')
  },
}

export const libraryIssueSchema = {
  bookId: required('validation.selectRequired'),
}

export const feeItemSchema = {
  'title.ur': (_v, values, t) => {
    const ur = String(values?.title?.ur || '').trim()
    const en = String(values?.title?.en || '').trim()
    return ur || en ? '' : t('validation.required')
  },
  amount: compose(required('validation.required'), positiveAmount()),
}

export const feeCollectSchema = {
  amount: compose(required('validation.required'), positiveAmount()),
  accountId: required('validation.selectRequired'),
}

export const inventoryItemSchema = {
  'name.ur': (_v, values, t) => {
    const ur = String(values?.name?.ur || '').trim()
    const en = String(values?.name?.en || '').trim()
    return ur || en ? '' : t('validation.nameRequired')
  },
}

export const signupSchema = {
  email: compose(required('validation.emailRequired'), email()),
  password: compose(required('validation.passwordRequired'), passwordMin(8)),
  confirmPassword: matches('password', 'validation.passwordMatch'),
  'name.ur': (_v, values, t) => {
    const ur = String(values?.nameUr || values?.name?.ur || '').trim()
    const en = String(values?.nameEn || values?.name?.en || '').trim()
    return ur || en ? '' : t('validation.nameRequired')
  },
}

export const resetPasswordSchema = {
  password: compose(required('validation.passwordRequired'), passwordMin(8)),
  confirmPassword: matches('password', 'validation.passwordMatch'),
}

export const forgotPasswordSchema = {
  email: compose(required('validation.emailRequired'), email()),
}

export const profilePasswordSchema = {
  currentPassword: required('validation.passwordRequired'),
  newPassword: compose(required('validation.passwordRequired'), passwordMin(8)),
}

export const profileAccountSchema = {
  email: compose(required('validation.emailRequired'), email()),
}

export const salaryFormSchema = {
  basicSalary: compose(required('validation.required'), positiveAmount()),
  toDate: dateBefore('fromDate', 'validation.dateBefore'),
}

export const examFormSchema = {
  'name.ur': (_v, values, t) => {
    const ur = String(values?.name?.ur || '').trim()
    const en = String(values?.name?.en || '').trim()
    return ur || en ? '' : t('validation.nameRequired')
  },
  endDate: dateBefore('startDate', 'validation.dateBefore'),
}

export const readingRecordSchema = {
  readingDate: required('validation.required'),
  startPage: (value, _values, t) => {
    if (value === '' || value == null) return t('validation.required')
    const n = Number(value)
    return Number.isFinite(n) && n >= 1 ? '' : t('validation.numberMin', { min: 1 })
  },
  endPage: (value, values, t) => {
    if (value === '' || value == null) return t('validation.required')
    const end = Number(value)
    const start = Number(values?.startPage)
    if (!Number.isFinite(end) || end < 1) return t('validation.numberMin', { min: 1 })
    if (Number.isFinite(start) && end < start) return t('validation.pageOrder')
    return ''
  },
}

export const categoryFormSchema = {
  'name.ur': (_v, values, t) => {
    const ur = String(values?.name?.ur || '').trim()
    const en = String(values?.name?.en || '').trim()
    return ur || en ? '' : t('validation.nameRequired')
  },
}

export { notFutureDate, positiveAmount, required, email, passwordMin, matches, dateBefore, compose }
