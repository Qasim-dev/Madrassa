import mongoose from 'mongoose';
import { tenantPlugin } from './common.js';
import { EXAM_MARKS_STATUS } from '../constants/examEnums.js';

const examMarksSchema = new mongoose.Schema(
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
    subjectMappingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamSubjectMapping',
      required: true,
    },
    studentSnapshotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamStudentSnapshot',
      required: true,
    },
    /** Teacher-entered marks (never overwritten by grace) */
    originalMarks: { type: Number, default: null },
    graceMarks: { type: Number, default: 0, min: 0 },
    /** Computed: originalMarks + graceMarks (or null if absent) */
    finalMarks: { type: Number, default: null },
    status: {
      type: String,
      enum: EXAM_MARKS_STATUS,
      default: 'draft',
    },
    isUnlocked: { type: Boolean, default: false },
    unlockReason: { type: String, default: '' },
    enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    submittedAt: { type: Date, default: null },
    remarks: { type: String, default: '' },
  },
  { timestamps: true }
);

tenantPlugin(examMarksSchema);
examMarksSchema.index(
  { tenantId: 1, sessionId: 1, examId: 1, subjectMappingId: 1, studentSnapshotId: 1 },
  { unique: true }
);
examMarksSchema.index({ tenantId: 1, examId: 1, darjahId: 1, status: 1 });
examMarksSchema.index({ tenantId: 1, examId: 1, subjectMappingId: 1 });

export const ExamMarks = mongoose.model('ExamMarks', examMarksSchema);
