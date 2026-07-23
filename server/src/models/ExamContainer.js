import mongoose from 'mongoose';
import { localizedSchema, tenantPlugin } from './common.js';
import { EXAM_CONTAINER_STATUS } from '../constants/examEnums.js';

const examContainerSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    name: { type: localizedSchema, required: true },
    /** Copied from TenantSettings.examNames or custom */
    examType: { type: localizedSchema, default: () => ({}) },
    examTypeIndex: { type: Number, default: null },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    resultPublicationDate: { type: Date, default: null },
    status: {
      type: String,
      enum: EXAM_CONTAINER_STATUS,
      default: 'draft',
    },
    /** When true, no further edits allowed */
    isLocked: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

tenantPlugin(examContainerSchema);
examContainerSchema.index({ tenantId: 1, sessionId: 1, status: 1 });
examContainerSchema.index({ tenantId: 1, sessionId: 1, createdAt: -1 });

export const ExamContainer = mongoose.model('ExamContainer', examContainerSchema);
