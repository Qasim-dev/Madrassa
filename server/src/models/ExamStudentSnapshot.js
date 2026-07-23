import mongoose from 'mongoose';
import { localizedSchema, tenantPlugin } from './common.js';

const examStudentSnapshotSchema = new mongoose.Schema(
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
    /** Shu'ba / section at snapshot time */
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      default: null,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    /** Immutable copies at snapshot time */
    studentName: { type: localizedSchema, default: () => ({}) },
    fatherName: { type: localizedSchema, default: () => ({}) },
    rollNumber: { type: String, default: '' },
    admissionNumber: { type: String, default: '' },
    photoUrl: { type: String, default: '' },
    darjahName: { type: localizedSchema, default: () => ({}) },
    sectionName: { type: localizedSchema, default: () => ({}) },
    snapshotAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

tenantPlugin(examStudentSnapshotSchema);
examStudentSnapshotSchema.index(
  { tenantId: 1, sessionId: 1, examId: 1, darjahId: 1, studentId: 1 },
  { unique: true }
);
examStudentSnapshotSchema.index({ tenantId: 1, examId: 1, darjahId: 1, sectionId: 1 });

export const ExamStudentSnapshot = mongoose.model('ExamStudentSnapshot', examStudentSnapshotSchema);
