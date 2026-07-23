import mongoose from 'mongoose';
import { tenantPlugin } from './common.js';

const examAuditLogSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamContainer',
      required: true,
    },
    entityType: { type: String, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    action: { type: String, required: true },
    beforeValue: { type: mongoose.Schema.Types.Mixed, default: null },
    afterValue: { type: mongoose.Schema.Types.Mixed, default: null },
    reason: { type: String, default: '' },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    changedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

tenantPlugin(examAuditLogSchema);
examAuditLogSchema.index({ tenantId: 1, sessionId: 1, examId: 1, changedAt: -1 });
examAuditLogSchema.index({ tenantId: 1, examId: 1, entityType: 1 });

export const ExamAuditLog = mongoose.model('ExamAuditLog', examAuditLogSchema);
