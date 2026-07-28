import mongoose from 'mongoose';

/**
 * Soft-delete helpers and Mongoose plugin.
 * Active records: isDeleted !== true && deletedAt == null
 */
export const NOT_DELETED = { deletedAt: null, isDeleted: { $ne: true } };

export function withNotDeleted(filter = {}) {
  return { ...filter, ...NOT_DELETED };
}

export function withDeletedOnly(filter = {}) {
  return {
    ...filter,
    $or: [{ isDeleted: true }, { deletedAt: { $ne: null } }],
  };
}

/**
 * Adds soft-delete fields + indexes. Safe to call on schemas that already have deletedAt.
 */
export function softDeletePlugin(schema) {
  if (!schema.paths.isDeleted) {
    schema.add({ isDeleted: { type: Boolean, default: false, index: true } });
  }
  if (!schema.paths.deletedAt) {
    schema.add({ deletedAt: { type: Date, default: null, index: true } });
  }
  if (!schema.paths.deletedBy) {
    schema.add({
      deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    });
  }
  if (!schema.paths.deleteReason) {
    schema.add({ deleteReason: { type: String, default: '', trim: true, maxlength: 500 } });
  }

  schema.index({ tenantId: 1, isDeleted: 1, deletedAt: -1 });
  if (schema.paths.sessionId) {
    schema.index({ tenantId: 1, sessionId: 1, isDeleted: 1 });
  }
}

export function softDeleteSet(userId, reason = '') {
  return {
    isDeleted: true,
    deletedAt: new Date(),
    deletedBy: userId || null,
    deleteReason: reason ? String(reason).trim().slice(0, 500) : '',
  };
}

export function restoreSet() {
  return {
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    deleteReason: '',
  };
}
