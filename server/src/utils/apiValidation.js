import { validationResult } from 'express-validator';
import mongoose from 'mongoose';

/**
 * Standardized API validation error:
 * { message: string, fields: { [field]: string } }
 */
export function sendValidationError(res, fields = {}, message) {
  const fieldMap =
    fields && typeof fields === 'object' && !Array.isArray(fields) ? { ...fields } : {};
  const first = Object.values(fieldMap).find(Boolean);
  return res.status(400).json({
    message: message || first || 'Please fix the highlighted fields.',
    fields: fieldMap,
  });
}

/** Convert express-validator result into { field: message }. */
export function expressErrorsToFields(result) {
  const fields = {};
  const list = result?.array?.({ onlyFirstError: true }) || [];
  for (const item of list) {
    const path = item.path || item.param;
    const msg = item.msg || item.message;
    if (path && msg && !fields[path]) fields[path] = String(msg);
  }
  return fields;
}

/**
 * If request failed express-validator checks, send standardized response and return true.
 * @returns {boolean} true when response was sent
 */
export function rejectIfInvalid(req, res, message) {
  const result = validationResult(req);
  if (result.isEmpty()) return false;
  sendValidationError(res, expressErrorsToFields(result), message);
  return true;
}

export function isValidObjectId(id) {
  return Boolean(id) && mongoose.Types.ObjectId.isValid(String(id));
}

export function requireObjectId(res, id, field = 'id', message = 'Invalid record id.') {
  if (isValidObjectId(id)) return true;
  sendValidationError(res, { [field]: message }, message);
  return false;
}
