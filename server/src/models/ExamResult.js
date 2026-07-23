import mongoose from 'mongoose';
import { tenantPlugin } from './common.js';
import { EXAM_PUBLICATION_LEVELS } from '../constants/examEnums.js';

const subjectTotalSchema = new mongoose.Schema(
  {
    subjectMappingId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamSubjectMapping' },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubjectBook', default: null },
    maxMarks: { type: Number, default: 0 },
    obtainedMarks: { type: Number, default: 0 },
    isPassed: { type: Boolean, default: false },
  },
  { _id: false }
);

const examResultSchema = new mongoose.Schema(
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
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      default: null,
    },
    studentSnapshotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamStudentSnapshot',
      required: true,
    },
    subjectTotals: [subjectTotalSchema],
    aggregateTotal: { type: Number, default: 0 },
    maxAggregate: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    gpa: { type: Number, default: null },
    division: { type: String, default: '' },
    isPassed: { type: Boolean, default: false },
    sectionRank: { type: Number, default: null },
    classRank: { type: Number, default: null },
    graceMarksApplied: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
    publicationLevel: {
      type: String,
      enum: [...EXAM_PUBLICATION_LEVELS, ''],
      default: '',
    },
    isLocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

tenantPlugin(examResultSchema);
examResultSchema.index(
  { tenantId: 1, sessionId: 1, examId: 1, studentSnapshotId: 1 },
  { unique: true }
);
examResultSchema.index({ tenantId: 1, examId: 1, darjahId: 1, sectionId: 1 });
examResultSchema.index({ tenantId: 1, examId: 1, darjahId: 1, classRank: 1 });

export const ExamResult = mongoose.model('ExamResult', examResultSchema);
