import mongoose from 'mongoose';
import { tenantPlugin } from './common.js';

const recycleAuditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ['deleted', 'restored', 'permanently_deleted', 'restore_blocked', 'purge_blocked'],
      required: true,
      index: true,
    },
    module: { type: String, required: true },
    recordId: { type: mongoose.Schema.Types.ObjectId, default: null },
    recycleItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecycleBinItem', default: null },
    recordName: { type: String, default: '' },
    reason: { type: String, default: '' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

tenantPlugin(recycleAuditLogSchema);
recycleAuditLogSchema.index({ tenantId: 1, createdAt: -1 });
recycleAuditLogSchema.index({ tenantId: 1, module: 1, action: 1 });

export const RecycleAuditLog = mongoose.model('RecycleAuditLog', recycleAuditLogSchema);
