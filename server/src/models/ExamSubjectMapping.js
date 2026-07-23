import mongoose from 'mongoose';
import { tenantPlugin } from './common.js';
import { EXAM_SUBJECT_TYPES } from '../constants/examEnums.js';

const examSubjectMappingSchema = new mongoose.Schema(
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
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubjectBook',
      default: null,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      default: null,
    },
    maxMarks: { type: Number, required: true, min: 1 },
    passingMarks: { type: Number, required: true, min: 0 },
    weightage: { type: Number, default: 100, min: 0, max: 100 },
    examType: {
      type: String,
      enum: EXAM_SUBJECT_TYPES,
      default: 'written',
    },
    /** Immutable after marks entry begins */
    isLocked: { type: Boolean, default: false },
    marksEntryStartedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

tenantPlugin(examSubjectMappingSchema);
examSubjectMappingSchema.index(
  { tenantId: 1, sessionId: 1, examId: 1, darjahId: 1, subjectId: 1, bookId: 1 },
  { unique: true }
);
examSubjectMappingSchema.index({ tenantId: 1, examId: 1, teacherId: 1 });

export const ExamSubjectMapping = mongoose.model('ExamSubjectMapping', examSubjectMappingSchema);
