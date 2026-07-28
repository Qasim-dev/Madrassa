import mongoose from 'mongoose';
import { tenantPlugin } from './common.js';

/**
 * One rating cell: student × category × calendar day.
 * Upserted in bulk from the daily entry grid.
 */
const studentDailyActivitySchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      default: null,
    },
    activityDate: { type: Date, required: true },
    /** YYYY-MM-DD for fast exact-day queries */
    activityDateKey: { type: String, required: true, trim: true },
    darjahId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Darjah',
      default: null,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      default: null,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentActivityCategory',
      required: true,
    },
    /** Normalized numeric for analytics (always filled when possible) */
    score: { type: Number, default: null },
    /** Display value: grade code, yes/no, emoji, or raw score string */
    value: { type: String, default: '' },
    grade: { type: String, default: '' },
    remarks: { type: String, default: '' },
    /** Per-row general remark lives on a synthetic row OR we store student-level remark separately */
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      default: null,
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'locked'],
      default: 'submitted',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

tenantPlugin(studentDailyActivitySchema);

studentDailyActivitySchema.index(
  { tenantId: 1, activityDateKey: 1, studentId: 1, categoryId: 1 },
  { unique: true }
);
studentDailyActivitySchema.index({ tenantId: 1, sessionId: 1, activityDateKey: 1 });
studentDailyActivitySchema.index({ tenantId: 1, darjahId: 1, activityDateKey: 1 });
studentDailyActivitySchema.index({ tenantId: 1, studentId: 1, activityDateKey: -1 });
studentDailyActivitySchema.index({ tenantId: 1, categoryId: 1, activityDateKey: 1 });

export const StudentDailyActivity = mongoose.model('StudentDailyActivity', studentDailyActivitySchema);

/** Optional student-level remark for a day (not category-specific) */
const studentDailyRemarkSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      default: null,
    },
    activityDateKey: { type: String, required: true, trim: true },
    activityDate: { type: Date, required: true },
    darjahId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Darjah',
      default: null,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    remarks: { type: String, default: '' },
    tone: {
      type: String,
      enum: ['neutral', 'positive', 'negative', 'suggestion'],
      default: 'neutral',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

tenantPlugin(studentDailyRemarkSchema);
studentDailyRemarkSchema.index(
  { tenantId: 1, activityDateKey: 1, studentId: 1 },
  { unique: true }
);

export const StudentDailyRemark = mongoose.model('StudentDailyRemark', studentDailyRemarkSchema);
