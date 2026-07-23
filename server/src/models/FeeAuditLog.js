import mongoose from 'mongoose';
import { tenantPlugin } from './common.js';

const feeAuditLogSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      default: null,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      default: null,
    },
    balanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentFeeBalance',
      default: null,
    },
    action: {
      type: String,
      enum: ['maafi', 'apply_balance', 'adjust_due', 'collect', 'apply_fee', 'delete_balance'],
      required: true,
    },
    amount: { type: Number, default: 0 },
    beforeValue: { type: mongoose.Schema.Types.Mixed, default: null },
    afterValue: { type: mongoose.Schema.Types.Mixed, default: null },
    reason: { type: String, default: '' },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    changedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

tenantPlugin(feeAuditLogSchema);
feeAuditLogSchema.index({ tenantId: 1, sessionId: 1, changedAt: -1 });
feeAuditLogSchema.index({ tenantId: 1, studentId: 1, changedAt: -1 });
feeAuditLogSchema.index({ tenantId: 1, balanceId: 1, changedAt: -1 });

export const FeeAuditLog = mongoose.model('FeeAuditLog', feeAuditLogSchema);
