import { useCallback, useState } from 'react'
import { getByPath } from './path.js'
import { focusFirstInvalid } from './focusFirstInvalid.js'
import { mapApiFieldErrors } from './mapApiErrors.js'

/**
 * Shared form validation state for enterprise field UX.
 *
 * @param {object} options
 * @param {Record<string, Function>} options.schema - field → (value, values, t) => string
 * @param {Function} options.t - i18n t()
 * @param {Record<string, string>} [options.fieldIds] - field → input id for focus
 * @param {string[]} [options.order] - preferred focus order
 */
export function useFormValidation({ schema, t, fieldIds = {}, order = [] }) {
  const [errors, setErrors] = useState({})

  const validateField = useCallback(
    (name, values) => {
      const rule = schema[name]
      if (!rule) return ''
      return rule(getByPath(values, name), values, t) || ''
    },
    [schema, t]
  )

  const clearError = useCallback((name) => {
    setErrors((prev) => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }, [])

  const setFieldError = useCallback((name, message) => {
    setErrors((prev) => ({ ...prev, [name]: message }))
  }, [])

  const validateAll = useCallback(
    (values) => {
      const next = {}
      for (const name of Object.keys(schema)) {
        const msg = validateField(name, values)
        if (msg) next[name] = msg
      }
      setErrors(next)
      return next
    },
    [schema, validateField]
  )

  /** Required fields / touched fields: validate on blur. */
  const onBlurField = useCallback(
    (name, values) => {
      const msg = validateField(name, values)
      setErrors((prev) => {
        if (!msg) {
          if (!prev[name]) return prev
          const next = { ...prev }
          delete next[name]
          return next
        }
        if (prev[name] === msg) return prev
        return { ...prev, [name]: msg }
      })
    },
    [validateField]
  )

  /** While typing: clear/update only if field already shows an error. */
  const revalidateIfError = useCallback(
    (name, values) => {
      setErrors((prev) => {
        if (!prev[name]) return prev
        const msg = validateField(name, values)
        if (!msg) {
          const next = { ...prev }
          delete next[name]
          return next
        }
        if (msg === prev[name]) return prev
        return { ...prev, [name]: msg }
      })
    },
    [validateField]
  )

  const focusInvalid = useCallback(
    (errorMap) => {
      const names = Object.keys(errorMap || {})
      focusFirstInvalid(names, fieldIds, order.length ? order : Object.keys(schema))
    },
    [fieldIds, order, schema]
  )

  /**
   * Run full validation; focus first invalid; call onValid when clean.
   * @returns {Promise<boolean>}
   */
  const handleSubmit = useCallback(
    async (values, onValid) => {
      const next = validateAll(values)
      if (Object.keys(next).length) {
        focusInvalid(next)
        return false
      }
      await onValid(values)
      return true
    },
    [validateAll, focusInvalid]
  )

  const applyApiError = useCallback(
    (err) => {
      const mapped = mapApiFieldErrors(err)
      if (Object.keys(mapped.fields).length) {
        setErrors((prev) => ({ ...prev, ...mapped.fields }))
        focusInvalid(mapped.fields)
      }
      return mapped.message
    },
    [focusInvalid]
  )

  return {
    errors,
    setErrors,
    clearError,
    setFieldError,
    validateAll,
    validateField,
    onBlurField,
    revalidateIfError,
    handleSubmit,
    applyApiError,
    focusInvalid,
    hasErrors: Object.keys(errors).length > 0,
  }
}
