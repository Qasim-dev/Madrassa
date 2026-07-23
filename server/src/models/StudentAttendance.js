import mongoose from 'mongoose';
import { tenantPlugin } from './common.js';
import { STUDENT_STATUSES } from '../constants/attendanceEnums.js';

const studentAttendanceSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceCategory', default: null },
    date: { type: Date, required: true },
    gradeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Grade',
      default: null,
    },
    darjahId: { type: mongoose.Schema.Types.ObjectId, ref: 'Darjah', default: null },
    courseSubjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubjectBook', default: null },
    slotId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceSlot', default: null },
    /** Period from session timetable (TimeSlot) when marking by book/subject schedule */
    timeSlotId: { type: mongoose.Schema.Types.ObjectId, ref: 'TimeSlot', default: null },
    period: { type: String, default: '' },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    source: { type: String, enum: ['manual', 'import', 'auto'], default: 'manual' },
    entries: [
      {
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Student',
          required: true,
        },
        status: {
          type: String,
          enum: STUDENT_STATUSES,
          default: 'present',
        },
        remarks: { type: String, default: '' },
        markedAt: { type: Date, default: null },
      },
    ],
  },
  { timestamps: true }
);

tenantPlugin(studentAttendanceSchema);
studentAttendanceSchema.index({ tenantId: 1, date: 1, gradeId: 1, period: 1 });
studentAttendanceSchema.index({
  tenantId: 1,
  sessionId: 1,
  date: 1,
  categoryId: 1,
  gradeId: 1,
  darjahId: 1,
  courseSubjectId: 1,
  bookId: 1,
  slotId: 1,
  timeSlotId: 1,
});

export const StudentAttendance = mongoose.model(
  'StudentAttendance',
  studentAttendanceSchema
);
