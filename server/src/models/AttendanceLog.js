import mongoose from 'mongoose';
import { tenantPlugin } from './common.js';

/** Denormalized row per person per mark — powers cross-category reporting. */
const attendanceLogSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },
    date: { type: Date, required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceCategory', required: true },
    categoryCode: { type: String, required: true },
    slotId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceSlot', default: null },
    slotLabel: { type: String, default: '' },
    subjectType: { type: String, enum: ['student', 'teacher'], required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, required: true },
    gradeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Grade', default: null },
    darjahId: { type: mongoose.Schema.Types.ObjectId, ref: 'Darjah', default: null },
    courseSubjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubjectBook', default: null },
    timeSlotId: { type: mongoose.Schema.Types.ObjectId, ref: 'TimeSlot', default: null },
    status: { type: String, required: true },
    remarks: { type: String, default: '' },
    sourceSheetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    sourceSheetType: { type: String, enum: ['student_sheet', 'teacher_mark'], required: true },
  },
  { timestamps: true }
);

tenantPlugin(attendanceLogSchema);
attendanceLogSchema.index({ tenantId: 1, sessionId: 1, date: 1, subjectType: 1, subjectId: 1 });
attendanceLogSchema.index({ tenantId: 1, categoryCode: 1, date: 1 });
attendanceLogSchema.index(
  { tenantId: 1, sourceSheetType: 1, sourceSheetId: 1, subjectId: 1 },
  { unique: true }
);

export const AttendanceLog = mongoose.model('AttendanceLog', attendanceLogSchema);
