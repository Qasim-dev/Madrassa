/** Active (non-soft-deleted) documents — matches null or missing deletedAt. */
export const NOT_DELETED = { deletedAt: null };

export function withNotDeleted(filter = {}) {
  return { ...filter, ...NOT_DELETED };
}
