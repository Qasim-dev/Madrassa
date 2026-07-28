/**
 * Strip fields that must never be client-writable on updates.
 * Prevents mass-assignment of tenantId / identity keys.
 */
const DEFAULT_BLOCKED = Object.freeze([
  'tenantId',
  '_id',
  'id',
  '__v',
  'createdAt',
  'updatedAt',
]);

/**
 * @param {Record<string, unknown>|null|undefined} body
 * @param {string[]} [extraBlocked]
 * @returns {Record<string, unknown>}
 */
export function sanitizeUpdateBody(body, extraBlocked = []) {
  const src = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const blocked = new Set([...DEFAULT_BLOCKED, ...extraBlocked]);
  const out = {};
  for (const [key, value] of Object.entries(src)) {
    if (blocked.has(key)) continue;
    out[key] = value;
  }
  return out;
}
