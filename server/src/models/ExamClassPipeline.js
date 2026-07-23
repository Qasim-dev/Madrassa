import mongoose from 'mongoose';
import { tenantPlugin } from './common.js';
import { EXAM_PIPELINE_STATUS } from '../constants/examEnums.js';

const examClassPipelineSchema = new mongoose.Schema(
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
    darjahId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Darjah',
      required: true,
    },
    status: {
      type: String,
      enum: EXAM_PIPELINE_STATUS,
      default: 'pending',
    },
    snapshotGeneratedAt: { type: Date, default: null },
    marksEntryStartedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

tenantPlugin(examClassPipelineSchema);
examClassPipelineSchema.index({ tenantId: 1, sessionId: 1, examId: 1, darjahId: 1 }, { unique: true });
examClassPipelineSchema.index({ tenantId: 1, examId: 1, status: 1 });

export const ExamClassPipeline = mongoose.model('ExamClassPipeline', examClassPipelineSchema);
